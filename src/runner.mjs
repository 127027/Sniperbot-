import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { GitHubTransport } from './github.mjs';
import { newState, settlePaper, rejectPaper, DEFAULT_POLICY, Reject } from './core.mjs';
const dir=process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper');
const stateFile=join(dir,'state.json');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let state;
async function save() {
  await mkdir(dir,{recursive:true});
  const target=`${stateFile}.${process.pid}.tmp`;
  await writeFile(target,JSON.stringify(state,null,2),'utf8');
  await rename(target,stateFile);
}
async function load() {
  try {state=JSON.parse(await readFile(stateFile,'utf8'));}
  catch(e) {if(e.code!=='ENOENT')throw e;state=newState();await save();}
  if(state.schema!==1||state.mode!=='PAPER_ONLY')throw Error('Unexpected state schema/mode');
}
const out=(...parts)=>console.log(new Date().toISOString(),...parts);
const validPath=p=>typeof p==='string'&&/^signals\/orders\/[A-Za-z0-9_-]{8,80}\.json$/.test(p);
async function flushReceipts(transport) {
  for(const [id,r] of Object.entries(state.receipts)) {
    if(r.published)continue;
    try {await transport.publishReceipt(id,r.data);r.published=true;await save();out('RECEIPT_PUBLISHED',id,r.data.status);}
    catch(e){out('RECEIPT_PENDING',id,e.message);}
  }
}
export async function pollOnce(transport) {
  await flushReceipts(transport);
  const {data:index}=await transport.read('signals/index.json');
  if(index.schema!==1||index.mode!=='PAPER'||!Array.isArray(index.orders))throw Error('Invalid inbox index');
  if(index.orders.length>500)throw Error('Index exceeds 500 orders; archive/rotation required');
  const seen=new Set();
  for(const entry of index.orders) {
    if(!entry||!validPath(entry.path)||!/^[0-9a-f]{40}$/.test(entry.sha))throw Error('Invalid inbox pointer');
    const id=entry.path.split('/').at(-1).slice(0,-5);
    if(seen.has(id))throw Error(`Duplicate order pointer ${id}`);
    seen.add(id);
    if(state.processed[id])continue;
    let order;
    try {
      order=(await transport.read(entry.path,entry.sha)).data;
      if(order.id!==id)throw new Reject('ORDER_ID_MISMATCH','Order ID differs from file name');
      const result=settlePaper(order,state,Date.now(),DEFAULT_POLICY);
      state=result.state;await save();out('PAPER_FILLED',id,result.receipt.action,result.receipt.cash_after_test_usdc);
    } catch(e) {
      if(e instanceof Reject) {
        const next=rejectPaper({id},state,e.code,e.message,Date.now());
        state=next.state;await save();out('PAPER_REJECTED',id,e.code);
      } else out('ORDER_NOT_PROCESSED',id,e.message);
    }
  }
  await flushReceipts(transport);
}
async function main() {
  if(process.env.R29_MODE&&process.env.R29_MODE!=='PAPER')throw Error('LIVE_DISABLED');
  if(process.env.R29_ENABLE_LIVE)throw Error('LIVE_DISABLED');
  await load();
  const transport=new GitHubTransport(process.env.GITHUB_TOKEN);
  out('R29 CLEANROOM PAPER ONLY',`balance=${state.cash}`,'state='+stateFile);
  const pollMs=Math.max(15000,Number(process.env.R29_POLL_MS||30000));
  while(true) {try{await pollOnce(transport);}catch(e){out('POLL_FAILURE',e.message);}await sleep(pollMs);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  main().catch(e=>{console.error(e.message);process.exitCode=1});
