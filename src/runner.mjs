import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { mkdir,readFile,rename,writeFile } from 'node:fs/promises';
import { GitHubTransport } from './github.mjs';
import { startDashboard } from './dashboard.mjs';
import { newState,settlePaper,rejectPaper,DEFAULT_POLICY,Reject } from './core.mjs';
import {validateDot3OrderBeforePublish} from './v19-dot3-authenticated-gate.mjs';
const dir=process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper');
const stateFile=join(dir,'state.json');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let state;
async function save(){
 await mkdir(dir,{recursive:true});
 const target=stateFile+'.'+process.pid+'.tmp';
 await writeFile(target,JSON.stringify(state,null,2),'utf8');
 await rename(target,stateFile);
}
async function load(){
 try{state=JSON.parse(await readFile(stateFile,'utf8'));}
 catch(e){if(e.code!=='ENOENT')throw e;state=newState();await save();}
 if(state.schema!==1||state.mode!=='PAPER_ONLY')throw Error('Unexpected state schema/mode');
 if(!state.clientId){const {randomBytes}=await import('node:crypto');state.clientId=`client-${randomBytes(8).toString('hex')}`;await save();}
}
const out=(...p)=>console.log(new Date().toISOString(),...p);
const validPath=p=>typeof p==='string'&&/^signals\/orders\/[A-Za-z0-9_-]{8,80}\.json$/.test(p);
async function flushReceipts(transport){
 for(const [id,r] of Object.entries(state.receipts)){
   if(r.published)continue;
   try{await transport.publishReceipt(id,r.data);r.published=true;await save();out('RECEIPT_PUBLISHED',id,r.data.status);}
   catch(e){out('RECEIPT_PENDING',id,e.message);}
 }
}
export async function pollOnce(transport){
 await flushReceipts(transport);
 const {data:index}=await transport.read('signals/index.json');
 if(index.schema!==1||index.mode!=='PAPER'||!Array.isArray(index.orders))throw Error('Invalid inbox index');
 if(index.orders.length>500)throw Error('Index exceeds 500 orders; archive/rotation required');
 const seen=new Set();
 for(const entry of index.orders){
   if(!entry||!validPath(entry.path)||!/^[0-9a-f]{40}$/.test(entry.sha))throw Error('Invalid inbox pointer');
   const id=entry.path.split('/').at(-1).slice(0,-5);
   if(seen.has(id))throw Error('Duplicate order pointer '+id);
   seen.add(id);
   if(state.processed[id])continue;
   try{
     const order=(await transport.read(entry.path,entry.sha)).data;
     if(order.id!==id)throw new Reject('ORDER_ID_MISMATCH','Order ID differs from file name');
     // Binding a SELL to a particular BUY lot prevents a late stop-loss
     // command from closing a newly reopened position on the same pool.
     if(order.action==='SELL'){
       const key=`${order.coin?.chain}:${order.coin?.contract}:${order.coin?.pool}`;
       const lot=state.positions[key];
       if(!lot||!order.exit_position_source_order_id
         ||order.exit_position_source_order_id!==lot.sourceOrderId)
         throw new Reject('SELL_LOT_NOT_MATCHED','Missing or stale opening BUY lot');
     }
     // An order's claimed Dot names alone are not authorization.
     // Until independently authenticated source+sellability proofs exist,
     // the trust gate prevents ANY local PAPER order fill (BUY or SELL).
     const dot3=await validateDot3OrderBeforePublish({order,
       read:(path,sha)=>transport.read(path,sha),
       nowUtc:new Date().toISOString(),
       trustedPublicKeyPem:process.env.R29_DOT3_TRUSTED_PUBLIC_KEY_PEM||null,
       trustedKeyId:process.env.R29_DOT3_TRUSTED_KEY_ID||null});
     if(!dot3.trade_authorized)
       throw new Reject('DOT3_AUTH_NOT_VERIFIED',dot3.code);
     const result=settlePaper(order,state,Date.now(),DEFAULT_POLICY);
     state=result.state;state.receipts[id].data.client_id=state.clientId;await save();out('PAPER_FILLED',id,result.receipt.action,result.receipt.cash_after_test_usdc);
   }catch(e){
     if(e instanceof Reject){
       const next=rejectPaper({id},state,e.code,e.message,Date.now());
       state=next.state;state.receipts[id].data.client_id=state.clientId;await save();out('PAPER_REJECTED',id,e.code);
     }else out('ORDER_NOT_PROCESSED',id,e.message);
   }
 }
 await flushReceipts(transport);
}
async function main(){
 if(process.env.R29_MODE&&process.env.R29_MODE!=='PAPER')throw Error('LIVE_DISABLED');
 if(process.env.R29_ENABLE_LIVE)throw Error('LIVE_DISABLED');
 await load();
 const transport=new GitHubTransport(process.env.GITHUB_TOKEN,state.clientId);
 startDashboard(()=>state,Number(process.env.R29_DASHBOARD_PORT||8765));
 out('R29 CLEANROOM PAPER ONLY', 'client='+state.clientId,'balance='+state.cash,'state='+stateFile,'dashboard=http://127.0.0.1:8765');
 const pollMs=Math.max(15000,Number(process.env.R29_POLL_MS||30000));
 while(true){try{await pollOnce(transport);}catch(e){out('POLL_FAILURE',e.message);}await sleep(pollMs);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
 main().catch(e=>{console.error(e.message);process.exitCode=1});
