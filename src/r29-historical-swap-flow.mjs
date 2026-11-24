// W03: exact historical third-party economic flows, never executable quotes.
import {createHash} from 'node:crypto';
const PUMP='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const TOKEN=new Set(['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb']);
const SYSTEM='11111111111111111111111111111111';
const key=x=>typeof x==='string'?x:x?.pubkey;
const uint=x=>typeof x==='string'&&/^(0|[1-9]\d*)$/.test(x);
const abs=n=>n<0n?-n:n;
const lamports=x=>Number.isSafeInteger(x)&&x>=0;
const iso=x=>new Date(x).toISOString();
const hash=x=>createHash('sha256').update(x).digest('hex');
function rows(meta,keys,mint){
 const maps=[meta.preTokenBalances,meta.postTokenBalances].map(a=>{
  if(!Array.isArray(a))throw Error('MISSING_TOKEN_BALANCES');
  const m=new Map();
  for(const b of a.filter(x=>x.mint===mint)){
   if(!Number.isInteger(b.accountIndex)||!keys[b.accountIndex]||m.has(b.accountIndex)||!uint(b.uiTokenAmount?.amount)||!Number.isInteger(b.uiTokenAmount.decimals)||b.uiTokenAmount.decimals<0||b.uiTokenAmount.decimals>18)throw Error('INVALID_MINT_BALANCE');
   m.set(b.accountIndex,b);
  }
  return m;
 });
 const result=[];
 for(const i of new Set([...maps[0].keys(),...maps[1].keys()])){
  const a=maps[0].get(i),b=maps[1].get(i);
  if(!a||!b||a.owner!==b.owner||!a.owner||a.uiTokenAmount.decimals!==b.uiTokenAmount.decimals||a.programId!==b.programId){result.push({account:keys[i],status:'UNPAIRED_OR_CHANGED_METADATA'});continue;}
  const delta=BigInt(b.uiTokenAmount.amount)-BigInt(a.uiTokenAmount.amount);
  const oi=keys.indexOf(a.owner);
  result.push({account:keys[i],owner:a.owner,program:a.programId??null,decimals:a.uiTokenAmount.decimals,pre_raw:a.uiTokenAmount.amount,post_raw:b.uiTokenAmount.amount,delta_raw:delta.toString(),owner_native_pre:oi<0?null:String(meta.preBalances[oi]),owner_native_post:oi<0?null:String(meta.postBalances[oi]),owner_native_delta:oi<0?null:(BigInt(meta.postBalances[oi])-BigInt(meta.preBalances[oi])).toString(),status:'PAIRED'});
 }
 return result;
}
function pumpLabels(logs){
 const stack=[],labels=[];let ok=false;
 for(const l of logs){
  let m=l.match(/^Program (\S+) invoke \[\d+\]$/);
  if(m){stack.push(m[1]);continue;}
  m=l.match(/^Program (\S+) (success|failed:.*)$/);
  if(m){if(stack.pop()!==m[1])return {labels:[],ok:false};if(m[1]===PUMP&&m[2]==='success')ok=true;continue;}
  m=l.match(/^Program log: Instruction: (Buy(?:V\d+|ExactSolIn)?|Sell(?:V\d+)?)$/);
  if(m&&stack.at(-1)===PUMP)labels.push(m[1]);
 }
 return {labels,ok:ok&&stack.length===0};
}
export function decodeHistoricalSwapFlow({raw,expectedSha256,receiptId,signature,mint,slot,blockTime,scanAtUtc}={}){
 if(typeof raw!=='string'||hash(raw)!==expectedSha256)throw Error('RAW_SHA_MISMATCH');
 const scan=Date.parse(scanAtUtc),env=JSON.parse(raw),tx=env.result,meta=tx?.meta;
 if(env.id!==receiptId||env.error||meta?.err!==null||tx.slot!==slot||tx.blockTime!==blockTime||!tx.transaction?.signatures?.includes(signature)||!Number.isInteger(blockTime)||!Number.isFinite(scan)||blockTime*1000>=scan-60000)throw Error('INVALID_OR_FUTURE_TX');
 const message=tx.transaction.message,keys=message.accountKeys.map(key);
 if(keys.some(x=>typeof x!=='string'||!x)||new Set(keys).size!==keys.length||meta.preBalances?.length!==keys.length||meta.postBalances?.length!==keys.length||![...meta.preBalances,...meta.postBalances,meta.fee].every(lamports))throw Error('INVALID_NATIVE_BALANCES');
 const moves=rows(meta,keys,mint);
 const instructions=[...(message.instructions||[]),...(meta.innerInstructions||[]).flatMap(x=>x.instructions||[])];
 const labels=pumpLabels(meta.logMessages||[]);
 const sides=new Set(labels.labels.map(x=>x.startsWith('Buy')?'BUY':'SELL'));
 const side=labels.ok&&sides.size===1?[...sides][0]:null;
 const programAccounts=new Set(instructions.filter(i=>i.programId===PUMP).flatMap(i=>i.accounts||[]));
 const transfers=instructions.filter(i=>TOKEN.has(i.programId)&&['transfer','transferChecked'].includes(i.parsed?.type)).map(i=>{const p=i.parsed.info||{};return {program:i.programId,source:p.source,destination:p.destination,authority:p.authority,mint:p.mint??null,amount:p.tokenAmount?.amount??p.amount,decimals:p.tokenAmount?.decimals??null};});
 const nativeTransfers=instructions.filter(i=>i.programId===SYSTEM&&i.parsed?.type==='transfer').map(i=>i.parsed.info).filter(p=>lamports(p?.lamports)).map(p=>({source:p.source,destination:p.destination,lamports:String(p.lamports)}));
 const candidates=[];
 if(side)for(const row of moves){
  if(row.status!=='PAIRED'||row.owner_native_delta===null||!TOKEN.has(row.program)||!programAccounts.has(row.owner)||!programAccounts.has(row.account)||message.accountKeys.some(x=>key(x)===row.owner&&x.signer===true)||row.owner===keys[0])continue;
  const d=BigInt(row.delta_raw),n=BigInt(row.owner_native_delta);
  if(side==='SELL'?!(d>0n&&n<0n):!(d<0n&&n>0n))continue;
  const match=transfers.filter(t=>{
   const peer=side==='SELL'?t.source:t.destination;
   const other=moves.find(x=>x.account===peer&&x.status==='PAIRED'&&x.owner!==row.owner);
   return t.program===row.program&&(side==='SELL'?t.destination===row.account:t.source===row.account)&&other&&other.decimals===row.decimals&&(t.mint===null||t.mint===mint)&&(t.decimals===null||t.decimals===row.decimals)&&uint(t.amount)&&BigInt(t.amount)===abs(d)&&BigInt(other.delta_raw)===-d;
  });
  if(match.length!==1)continue;
  const counterparty=moves.find(x=>x.account===(side==='SELL'?match[0].source:match[0].destination));
  // Native owner balance delta may include protocol fees/rent. Keep it separate.
  const nativeNet=nativeTransfers.reduce((v,t)=>v+(t.destination===row.owner?BigInt(t.lamports):0n)-(t.source===row.owner?BigInt(t.lamports):0n),0n);
  candidates.push({pool_owner_candidate:row.owner,pool_token_account:row.account,counterparty_token_account:counterparty.account,token_delta_raw:row.delta_raw,token_decimals:row.decimals,owner_native_delta_lamports:row.owner_native_delta,owner_native_pre_lamports:row.owner_native_pre,owner_native_post_lamports:row.owner_native_post,token_pre_raw:row.pre_raw,token_post_raw:row.post_raw,matched_transfer:match[0],native_system_transfer_net_lamports:nativeNet.toString(),native_transfer_net_matches_owner_delta:nativeNet===n,observed_sol_per_token_rational:{numerator:(abs(n)*10n**BigInt(row.decimals)).toString(),denominator:(abs(d)*1000000000n).toString()},ratio_is_owner_balance_flow_not_execution_quote:true});
 }
 const found=candidates.length===1?candidates[0]:null;
 return {signature,mint,slot,block_time_utc:iso(blockTime*1000),virtual_scan_at_utc:scanAtUtc,modeled_finality_at_utc:iso(blockTime*1000+60000),source_sha256:expectedSha256,receipt_id:receiptId,side,program:PUMP,program_labels:labels.labels,program_execution_confirmed:labels.ok,tx_fee_lamports:String(meta.fee),fee_payer:keys[0],mint_balance_rows:moves,native_system_transfers:nativeTransfers,matched_pool_candidates:candidates,status:found?'CORRELATED_POOL_OWNER_FLOW':candidates.length>1?'AMBIGUOUS_POOL_OWNER_FLOW':'MISSING_CORRELATED_POOL_OWNER_FLOW',observed_flow:found,missing_execution_fields:['INDEPENDENT_POOL_ID_AND_CURVE_STATE','HISTORICAL_SOL_USDC_CONVERSION','HISTORICAL_PROTOCOL_AND_TOKEN_FEES','50_USDC_SIZE_IMPACT_AND_SELLABILITY','ASOF_RESERVE_CONTINUITY'],original_provider_delivery_proven:false,model_quote_ready:false,orders_authorized:0};
}
