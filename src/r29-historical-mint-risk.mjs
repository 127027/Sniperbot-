// Historical mint history research. No current account state substituted.
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const TOKEN=new Set(['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA','TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb']);
const key=x=>typeof x==='string'?x:x?.pubkey;
export function inspectHistoricalMintTransaction({raw,expectedSha256,signature,mint,slot,blockTime,tickUtc}={}){
 if(sha(raw)!==expectedSha256)throw Error('RAW_HASH_MISMATCH');
 const t=JSON.parse(raw).result,at=Date.parse(tickUtc);
 if(!t||t.meta?.err!==null||t.slot!==slot||t.blockTime!==blockTime||!t.transaction.signatures.includes(signature)||!Number.isFinite(at)||blockTime*1000+60000>=at)throw Error('INVALID_OR_FUTURE_MINT_TX');
 const m=t.transaction.message,keys=m.accountKeys.map(key);
 if(!keys.includes(mint))throw Error('MINT_NOT_IN_TX');
 const all=[...(m.instructions||[]),...(t.meta.innerInstructions||[]).flatMap(x=>x.instructions||[])];
 const controls=[],unknown=[],transfers=[];
 for(const i of all){
  if(!TOKEN.has(i.programId))continue;
  const p=i.parsed,info=p?.info||{};
  const touches=Object.values(info).some(v=>v===mint)||i.accounts?.includes(mint);
  if(!touches)continue;
  if(!p?.type){unknown.push({program:i.programId,reason:'UNPARSED_MINT_INSTRUCTION',data:i.data??null});continue;}
  if(['transferChecked','transfer','mintTo','mintToChecked','burn','burnChecked'].includes(p.type)){transfers.push({type:p.type,program:i.programId});if(p.type.startsWith('mintTo')||p.type.startsWith('burn'))controls.push({type:p.type,info,program:i.programId});continue;}
  controls.push({type:p.type,info,program:i.programId});
 }
 return {signature,mint,slot,block_time_utc:new Date(blockTime*1000).toISOString(),source_sha256:expectedSha256,controls,unknown,transfers,token_programs:[...new Set([...(t.meta.preTokenBalances||[]),...(t.meta.postTokenBalances||[])].filter(x=>x.mint===mint).map(x=>x.programId).filter(Boolean))],orders:0};
}
export function summarizeMintHistory({mint,rows,expectedSignatures,archiveExhausted}={}){
 const relevant=rows.filter(r=>r.mint===mint);
 const exact=expectedSignatures.length===new Set(expectedSignatures).size&&relevant.length===expectedSignatures.length&&new Set(relevant.map(r=>r.signature)).size===expectedSignatures.length&&relevant.every(r=>expectedSignatures.includes(r.signature));
 const controls=relevant.flatMap(r=>r.controls.map(c=>({...c,signature:r.signature,slot:r.slot,at:r.block_time_utc})));
 const init=controls.filter(c=>['initializeMint','initializeMint2'].includes(c.type)&&c.info.mint===mint);
 const unknown=relevant.flatMap(r=>r.unknown);
 const authorities=controls.filter(c=>c.type==='setAuthority');
 const extensions=controls.filter(c=>!/^(initializeMint2?|mintTo(Checked)?|burn(Checked)?|setAuthority)$/.test(c.type));
 // Exact coverage of a queried address does not prove absence of all extension
 // paths or full historical account bytes; retain unknown unless verified.
 return {mint,history_exhausted_as_reported:archiveExhausted,expected_signatures:expectedSignatures.length,decoded_signatures:relevant.length,complete_selected_history:exact,initializations:init,authority_changes:authorities,extension_or_other_control_instructions:extensions,unknown_mint_instructions:unknown,token_programs:[...new Set(relevant.flatMap(r=>r.token_programs))],historical_mint_bytes_verified:false,risk_status:'UNKNOWN_HISTORICAL_MINT_ACCOUNT_AND_EXTENSIONS',model_trade_authorized:false,orders:0};
}
