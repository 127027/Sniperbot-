// Evidence-only live readback of public GitHub Dot research and the paper
// order courier. This script never emits, signs, simulates, or submits orders.
import {fetchResearchNetwork,RESEARCH_ROLES} from './research-network.mjs';
import {fetchSignedPaperOrderFeed} from './github-signed-agent-feed.mjs';
const now=Date.now();
const proof={
 schema:'sniper_live_dot_to_paper_channel_observation.v1',
 observed_at_utc:new Date(now).toISOString(),
 real_wallet_touched:false,paper_trades_executed:false,
 real_cloud_dot_signed_orders_confirmed:false
};
try{
 const network=await fetchResearchNetwork({now});
 proof.github_research_public_reader_available=true;
 proof.fresh_research_roles=network.current_roles;
 proof.expected_roles=RESEARCH_ROLES.length;
 proof.roles=network.roles.map(r=>({
  role:r.role,status:r.status,stale:r.stale,
  published_at_utc:r.published_at_utc||null,
  candidates:r.candidate_count||0,order_authorized:false
 }));
 proof.watchlist_candidates=network.watchlist?.candidate_count??null;
 proof.research_actionable=false;
}catch(e){
 proof.github_research_public_reader_available=false;
 proof.research_error=String(e?.message||'SOURCE_UNAVAILABLE').slice(0,120);
}
try{
 const feed=await fetchSignedPaperOrderFeed({now});
 proof.github_paper_order_courier_available=true;
 proof.published_signed_order_envelopes=feed.signal_count;
 proof.cloud_dot_identity_verified=false;
}catch(e){
 proof.github_paper_order_courier_available=false;
 proof.courier_error=String(e?.message||'SOURCE_UNAVAILABLE').slice(0,120);
}
console.log('PUBLIC_GITHUB_DOT_TO_PAPER_PROBE',JSON.stringify(proof));
// Public GitHub availability is a live observational probe, NOT a CI
// correctness gate. Strict parsing/signing/ledger invariants are in unit tests.
