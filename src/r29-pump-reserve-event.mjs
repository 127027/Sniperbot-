// Decode the date-pinned Pump TradeEvent, only if exact bytes and instruction context match.
import {createHash} from 'node:crypto';
const ABC='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const P='6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const SOL='So11111111111111111111111111111111111111112';
const ZERO='11111111111111111111111111111111';
const DISC=Buffer.from([189,219,127,211,78,230,97,238]);
const CPI=Buffer.from('e445a52e51cb9a1d','hex');
const hash=x=>createHash('sha256').update(x).digest('hex');
export function base58Decode(s){
 if(typeof s!=='string'||s.length>20000)throw Error('INVALID_BASE58');
 let n=0n;for(const ch of s){const v=ABC.indexOf(ch);if(v<0)throw Error('INVALID_BASE58');n=n*58n+BigInt(v);}
 let hex=n.toString(16);if(hex.length%2)hex='0'+hex;
 const body=n===0n?Buffer.alloc(0):Buffer.from(hex,'hex');
 return Buffer.concat([Buffer.alloc(s.match(/^1*/)[0].length),body]);
}
export function base58Encode(b){
 let n=BigInt('0x'+(b.toString('hex')||'0')),out='';while(n){out=ABC[Number(n%58n)]+out;n/=58n;}
 let z=0;while(z<b.length&&b[z]===0)z++;return '1'.repeat(z)+out;
}
function readEvent(data,spec){
 if(!data.subarray(0,8).equals(DISC))throw Error('EVENT_DISCRIMINATOR');
 let pos=8;const take=n=>{if(pos+n>data.length)throw Error('TRUNCATED_EVENT');const b=data.subarray(pos,pos+n);pos+=n;return b;};
 const fields=fs=>Object.fromEntries(fs.map(f=>[f.name,read(f.type)]));
 function read(t){if(t==='u64')return take(8).readBigUInt64LE().toString();if(t==='i64')return take(8).readBigInt64LE().toString();if(t==='u16')return take(2).readUInt16LE();if(t==='pubkey')return base58Encode(take(32));if(t==='bool'){const b=take(1)[0];if(b>1)throw Error('INVALID_BOOL');return !!b;}if(t==='string'){const len=take(4).readUInt32LE();if(len>128)throw Error('STRING_LIMIT');return take(len).toString('utf8');}if(t?.vec?.defined?.name==='Shareholder'){const n=take(4).readUInt32LE();if(n>64)throw Error('VEC_LIMIT');return Array.from({length:n},()=>fields(spec.shareholder));}throw Error('UNKNOWN_IDL_TYPE');}
 const event=fields(spec.fields);if(pos!==data.length)throw Error('UNEXPECTED_EVENT_TRAILING_BYTES');return event;
}
export function decodePumpReserveEvent({raw,flow,spec}={}){
 if(hash(raw)!==flow.source_sha256||spec.program!==P||!Buffer.from(spec.event_discriminator).equals(DISC))throw Error('PIN_OR_IDL_MISMATCH');
 const tx=JSON.parse(raw).result;
 if(tx.meta.err!==null||!tx.transaction.signatures.includes(flow.signature)||tx.slot!==flow.slot||tx.blockTime!==Date.parse(flow.block_time_utc)/1000)throw Error('TX_MISMATCH');
 const all=[...(tx.transaction.message.instructions||[]),...(tx.meta.innerInstructions||[]).flatMap(x=>x.instructions||[])];
 const swaps=[],events=[],rejected=[];
 for(const i of all.filter(i=>i.programId===P&&typeof i.data==='string')){
  let b;try{b=base58Decode(i.data);}catch{continue;}
  const ix=spec.instructions.find(x=>b.subarray(0,8).equals(Buffer.from(x.discriminator)));
  if(ix){const named=Object.fromEntries(ix.accounts.map((name,k)=>[name,i.accounts?.[k]]));if((named.base_mint||named.mint)===flow.mint)swaps.push({name:ix.name,pool:named.bonding_curve,token_account:named.associated_base_bonding_curve||named.associated_bonding_curve,user:named.user,quote_mint:named.quote_mint||SOL});}
  if(b.subarray(0,8).equals(CPI)&&b.subarray(8,16).equals(DISC)){try{events.push({event:readEvent(b.subarray(8),spec),encoding:'ANCHOR_CPI_EVENT'});}catch(e){rejected.push(e.message);}}
 }
 const stack=[];
 for(const log of tx.meta.logMessages||[]){let m=log.match(/^Program (\S+) invoke \[\d+\]$/);if(m){stack.push(m[1]);continue;}m=log.match(/^Program (\S+) (?:success|failed:.*)$/);if(m){if(stack.pop()!==m[1])break;continue;}m=log.match(/^Program data: ([A-Za-z0-9+/=]+)$/);if(m&&stack.at(-1)===P){const b=Buffer.from(m[1],'base64');if(b.subarray(0,8).equals(DISC)){try{events.push({event:readEvent(b,spec),encoding:'PROGRAM_DATA'});}catch(e){rejected.push(e.message);}}}}
 const unique=new Map(events.map(e=>[JSON.stringify(e.event),e]));
 const matches=[...unique.values()].filter(({event:e})=>e.mint===flow.mint&&e.timestamp===String(tx.blockTime)&&(e.is_buy?'BUY':'SELL')===flow.side);
 const s=swaps.length===1?swaps[0]:null,e=matches.length===1?matches[0]:null;
 let reason=null;
 if(!s||!e)reason='MISSING_OR_AMBIGUOUS_MATCHED_SWAP_EVENT';
 else if(e.event.user!==s.user||!s.pool||!s.token_account||![SOL,ZERO].includes(e.event.quote_mint)||s.quote_mint!==SOL)reason='USER_POOL_OR_NATIVE_QUOTE_MISMATCH';
 else if(!flow.observed_flow||flow.observed_flow.pool_owner_candidate!==s.pool||flow.observed_flow.pool_token_account!==s.token_account||BigInt(e.event.token_amount)!==BigInt(flow.observed_flow.token_delta_raw.replace('-','')))reason='TRANSFER_AND_EVENT_NOT_CORROBORATED';
 else if(BigInt(e.event.virtual_sol_reserves)<=0n||BigInt(e.event.virtual_token_reserves)<=0n||BigInt(e.event.real_token_reserves)!==BigInt(flow.observed_flow.token_post_raw))reason='RESERVE_STATE_NOT_CORROBORATED';
 return {receipt_id:flow.receipt_id,mint:flow.mint,signature:flow.signature,side:flow.side,block_time_utc:flow.block_time_utc,source_sha256:flow.source_sha256,decoded_event_count:unique.size,matched_instruction_count:swaps.length,decode_errors:rejected,identified_pool:s?.pool??null,status:reason?'UNVERIFIED_RESERVE_EVENT':'CORROBORATED_HISTORICAL_RESERVE_EVENT',reason,matched_event:e,matched_instruction:s,model_quote_ready:false,model_quote_gaps:['FRESHNESS_AND_CURVE_CONTINUITY_AT_TICK','HISTORICAL_SOL_USDC','SIZE_DEPENDENT_FEES_AND_TOKEN_RISK'],orders_authorized:0};
}
