import {readFile,writeFile,mkdir} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {emptyPreparationQueue,reservePreparationRequest,recordPreparationReceipt} from '../src/r29-preparation-queue.mjs';
const run=process.env.GITHUB_RUN_ID,out='probe-artifacts/preparation-source-'+run;await mkdir(out,{recursive:true});
const changes=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',process.env.GITHUB_SHA],{encoding:'utf8'}).trim().split('\n');
if(process.env.GITHUB_REF!=='refs/heads/codex/r29-cleanroom-paper-20261121'||changes.length!==1||!changes[0].startsWith('research/preparation-source-requests/'))throw Error('EXPLICIT_REQUEST_REQUIRED');
const q=JSON.parse(await readFile(changes[0],'utf8'));if(q.kind!=='R29_PREPARATION_NEUTRAL_SOURCE_PROBE'||q.max_requests!==7||q.no_orders!==true)throw Error('INVALID_REQUEST');
let queue=JSON.parse(await readFile('research/state/r29-preparation-queue.json','utf8'));const receipts=[];let calls=0;
const now=()=>new Date().toISOString();
async function request(req,validate){
 const gate=reservePreparationRequest(queue,req,now());if(!gate.allowed||calls>=q.max_requests)return {status:gate.reason};
 queue=gate.state;await writeFile(out+'/queue.json',JSON.stringify(queue,null,2));const id=++calls;
 let raw='',httpStatus=null,retryAfter=null,value=null,usable=false;
 try{const response=await fetch(req.url,{...(req.body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(req.body)}:{}),signal:AbortSignal.timeout(15000)});httpStatus=response.status;retryAfter=response.headers.get('retry-after');raw=await response.text();if(raw.length>5000000)throw Error('BODY_LIMIT');if(httpStatus===200){value=JSON.parse(raw);usable=validate(value);}}catch(e){if(!raw)raw=JSON.stringify({error:String(e)});}
 const file=out+'/request-'+id+'.json';await writeFile(file,raw);
 queue=recordPreparationReceipt(queue,gate.key,{raw,httpStatus,retryAfter,nowUtc:now(),usable,artifactPath:file});
 const r={id,key:gate.key,request:req,...queue.requests[gate.key].receipt};receipts.push(r);console.log('R29_PREP_SOURCE_RECEIPT',JSON.stringify(r));await writeFile(out+'/queue.json',JSON.stringify(queue,null,2));
 return {status:usable?'CAPTURED':'DATA_GAP',value:usable?value:null,receipt:r};
}
const hf=await request({provider:'HUGGINGFACE',url:'https://huggingface.co/api/datasets/Chainticks/dex-swaps/tree/main/swaps/date%3D2026-10-11'},x=>Array.isArray(x)&&x.some(f=>f.type==='file'&&f.path?.endsWith('.parquet')));
const start=Date.parse('2026-10-11T22:45:00Z')/1000,end=Date.parse('2026-10-11T23:45:00Z')/1000;
const block=async stamp=>request({provider:'DEFILLAMA',url:'https://coins.llama.fi/block/ethereum/'+stamp},x=>Number.isSafeInteger(x.height)&&x.height>0&&Number.isFinite(x.timestamp)&&Math.abs(x.timestamp-stamp)<=180);
const lo=await block(start),hi=await block(end);const rpc=async(method,params,valid)=>request({provider:'ETHEREUM_PUBLICNODE',url:'https://ethereum-rpc.publicnode.com',body:{jsonrpc:'2.0',id:1,method,params}},x=>x.id===1&&!x.error&&valid(x.result));
const hex=n=>'0x'+n.toString(16),factory='0x5c69bee701ef814a2b6a3edd4b1652cb9cc5aa6f',topic='0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9';
let range=null,rows=[],status='DATA_GAP_BLOCK_BOUNDARIES';
if(lo.value&&hi.value&&lo.value.height<hi.value.height){
 const a=await rpc('eth_getBlockByNumber',[hex(lo.value.height),false],x=>x&&Number.parseInt(x.number,16)===lo.value.height&&Math.abs(Number.parseInt(x.timestamp,16)-start)<=180);
 const b=await rpc('eth_getBlockByNumber',[hex(hi.value.height),false],x=>x&&Number.parseInt(x.number,16)===hi.value.height&&Number.parseInt(x.timestamp,16)<=end&&end-Number.parseInt(x.timestamp,16)<=180);
 if(a.value&&b.value){
  range={start_block:lo.value.height,end_block:hi.value.height,start_time_utc:new Date(Number.parseInt(a.value.result.timestamp,16)*1000).toISOString(),end_time_utc:new Date(Number.parseInt(b.value.result.timestamp,16)*1000).toISOString(),modeled_finality_buffer_seconds:900};
  const logs=await rpc('eth_getLogs',[{address:factory,fromBlock:hex(range.start_block),toBlock:hex(range.end_block),topics:[topic]}],x=>Array.isArray(x)&&x.every(l=>l.address?.toLowerCase()===factory&&l.topics?.length===3&&l.topics[0]===topic&&/^0x[0-9a-fA-F]{128}$/.test(l.data)&&Number.parseInt(l.blockNumber,16)>=range.start_block&&Number.parseInt(l.blockNumber,16)<=range.end_block&&l.removed===false));
  if(logs.value){rows=logs.value.result.map(l=>({chain:'ethereum',factory,pool:'0x'+l.data.slice(26,66).toLowerCase(),token0:'0x'+l.topics[1].slice(-40).toLowerCase(),token1:'0x'+l.topics[2].slice(-40).toLowerCase(),block:Number.parseInt(l.blockNumber,16),transaction:l.transactionHash,log_index:Number.parseInt(l.logIndex,16),knowledge_at_utc:range.end_time_utc,source_sha256:logs.receipt.sha256,quote_status:'UNKNOWN',risk_status:'UNKNOWN'}));status='NEUTRAL_FACTORY_LOGS_CAPTURED';}
  else status='DATA_GAP_FACTORY_LOGS';
 }
}
const report={kind:'R29_PREPARATION_NEUTRAL_SOURCE_PROBE',virtual_tick_utc:queue.virtual_tick_utc,source_scope:'Ethereum Uniswap V2 factory only; bounded pre-midnight block interval, no winner selection',hf_partition_status:hf.status,hf_files:hf.value?.map(f=>({path:f.path,size:f.size,oid:f.oid}))??[],range,status,rows,receipts,calls,market_scope_complete:false,valid_first_scan_started:false,orders:0};
await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log('R29_PREP_SOURCE_REPORT',JSON.stringify(report));console.log('R29_PREP_QUEUE_STATE',JSON.stringify(queue));
