// OPTIONAL one-shot live-source reachability probe in GitHub CI.
// No portfolio, no keys, no BUY/SELL, no wallets, no trading.
// This CANNOT certify security, profitability or an actual executable swap.
import {readbackExactPool} from './live-pool-readback.mjs';
import {checkReadOnlyOnchainExistence} from './onchain-existence-readback.mjs';
const url='https://raw.githubusercontent.com/127027/Sniperbot-/codex/research-gateway-v04/research/market/latest.json';
try{
 const response=await fetch(url,{redirect:'error',headers:{accept:'application/json'},
  signal:AbortSignal.timeout(9000)});
 if(!response.ok)throw Error('GITHUB_RESEARCH_HTTP_'+response.status);
 const body=await response.text();
 if(Buffer.byteLength(body)>250000)throw Error('SNAPSHOT_TOO_LARGE');
 const snapshot=JSON.parse(body);
 if(snapshot?.schema!=='research_market_snapshot.v1'||snapshot.paper_only!==true||
   snapshot.actionable!==false||!Array.isArray(snapshot.candidates))
  throw Error('INVALID_RESEARCH_SNAPSHOT');
 const c=snapshot.candidates.find(x=>typeof x?.candidate_id==='string'&&
   ['solana','base','bsc','eth'].includes(x.chain)&&
   typeof x.token_address==='string'&&typeof x.pool_address==='string');
 if(!c)throw Error('NO_SUITABLE_PUBLIC_CANDIDATE');
 const report=await readbackExactPool(c);
 const chainReport=await checkReadOnlyOnchainExistence(c);
 console.log('LIVE_PUBLIC_POOL_PROBE',JSON.stringify({
  checked_at_utc:report.checked_at_utc,candidate_id:report.candidate_id,
  status:report.status,reason:report.reason,
  providers:report.sources.map(s=>({provider:s.provider,
   identity_match:s.identity_match,error:s.error})),
  onchain_existence:chainReport.existence_status,
  solana_mint_authority:chainReport.solana_mint_header?.mint_authority||'UNKNOWN',
  solana_freeze_authority:chainReport.solana_mint_header?.freeze_authority||'UNKNOWN',
  solana_mint_risk:chainReport.solana_mint_header?.observed_risk||'UNKNOWN',
  onchain_reason:chainReport.reason,paper_entry_authorized:false,live_authorized:false
 }));
}catch(e){
 console.log('LIVE_PUBLIC_POOL_PROBE_INCONCLUSIVE',String(e?.message||'UNAVAILABLE').slice(0,100));
}
// Deliberately exit zero; provider access is an observational metric, not a CI unit guarantee.
