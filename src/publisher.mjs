import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { gitBlobSha } from './core.mjs';
import {validateDot3OrderBeforePublish} from './v19-dot3-authenticated-gate.mjs';
import { GitHubTransport,BRANCH } from './github.mjs';
const json=v=>JSON.stringify(v,null,2)+'\n';
const b64=s=>Buffer.from(s,'utf8').toString('base64');
export async function publishPaperOrder(transport,order,{maxIndexSize=400,maxRetries=5}={}){
  if(!/^[A-Za-z0-9_-]{8,80}$/.test(order?.id||'')||order.mode!=='PAPER'||!['BUY','SELL'].includes(order.action)||order.authority!=='dot-4-strategy')throw Error('INVALID_PUBLISH_REQUEST');
  // Every prospective SELL must specify the original BUY's sourceOrderId.
  // The client separately matches it to its own persisted open position.
  if(order.action==='SELL'&&
     (typeof order.exit_position_source_order_id!=='string'
      ||!/^[A-Za-z0-9_-]{8,80}$/.test(order.exit_position_source_order_id)))
    throw Error('SELL_OPENING_LOT_ID_REQUIRED');
  // Reject unsigned/unproven claims BEFORE writing signals/orders or index.
  // Trusted public key is external configuration, never an order field.
  const auth=await validateDot3OrderBeforePublish({order,
    read:(path,sha)=>transport.read(path,sha),
    nowUtc:new Date().toISOString(),
    trustedPublicKeyPem:process.env.R29_DOT3_TRUSTED_PUBLIC_KEY_PEM||null,
    trustedKeyId:process.env.R29_DOT3_TRUSTED_KEY_ID||null});
  if(!auth.trade_authorized)throw Error('DOT3_AUTH_NOT_VERIFIED: '+auth.code);
  const path=`signals/orders/${order.id}.json`,raw=json(order),sha=gitBlobSha(raw);
  try{await transport.request(path,{method:'PUT',body:{message:`Dot 4 ${order.action} ${order.id}`,content:b64(raw),branch:BRANCH}});}
  catch(e){const existing=await transport.read(path).catch(()=>null);if(!existing||existing.sha!==sha)throw e;}
  await transport.read(path,sha);
  for(let n=0;n<maxRetries;n++){
    const cur=await transport.read('signals/index.json'),idx=cur.data;
    if(idx.schema!==1||idx.mode!=='PAPER'||!Array.isArray(idx.orders))throw Error('INVALID_SIGNAL_INDEX');
    const old=idx.orders.find(x=>x.path===path);
    if(old){if(old.sha!==sha)throw Error('ORDER_ID_REUSED');return {path,sha,alreadyIndexed:true};}
    const next=json({...idx,orders:[...idx.orders,{path,sha}].slice(-maxIndexSize)});
    try{await transport.request('signals/index.json',{method:'PUT',body:{message:`Dot 4 index ${order.id}`,content:b64(next),sha:cur.sha,branch:BRANCH}});return {path,sha,alreadyIndexed:false};}
    catch(e){if(n===maxRetries-1)throw Error('SIGNAL_INDEX_CONFLICT: '+e.message);}
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const file=process.argv[2];if(!file)throw Error('Usage: npm run publish -- <order.json>');
  const order=JSON.parse(await readFile(file,'utf8'));
  console.log(await publishPaperOrder(new GitHubTransport(process.env.GITHUB_TOKEN,'cloud-dot-publisher'),order));
}
