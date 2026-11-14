import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDecisionDossiers} from './candidate-dossiers.mjs';
const now=Date.parse('2026-11-10T14:00:00Z');
const id='solana:So11111111111111111111111111111111111111112:9KNZ2WoEC2bpL3HeKaT3B7B73Wbv8Kgwz5NmRMT2qZ2H';
const [chain,token_address,pool_address]=id.split(':');
const network=()=>({paper_only:true,actionable:false,
 advisories:{candidates:[{chain,token_address,pool_address,candidate_id:id,
  paper_entry_authorized:true,role_count:5,roles_reporting:[
   'news_discovery','social_acceleration','onchain_liquidity',
   'contract_security','opportunity_qa']}]}});
const batch=()=>({schema:'pool_readback_batch.v1',paper_only:true,actionable:false,
 checked_at_utc:new Date(now).toISOString(),results:[{
  candidate_id:id,checked_at_utc:new Date(now).toISOString(),
  schema:'exact_pool_readback.v1',paper_only:true,actionable:false,
  paper_entry_authorized:false,contract_status:'UNKNOWN',sellability_status:'UNKNOWN',
  executable_buy_quote:false,executable_sell_quote:false,market_identity_verified:true,
  status:'IDENTITY_MATCHED',
  onchain_existence:{schema:'onchain_existence_readback.v1',candidate_id:id,
   paper_only:true,actionable:false,paper_entry_authorized:false,
   contract_security:'UNKNOWN',sellability:'UNKNOWN',existence_status:'ACCOUNTS_REPORTED',
   solana_mint_header:{schema:'solana_mint_header_risk.v1',paper_only:true,actionable:false,
    paper_entry_authorized:false,contract_security:'UNKNOWN',sellability:'UNKNOWN',
    mint_program:'SPL_TOKEN_LEGACY',mint_authority:'RETAINED',freeze_authority:'REVOKED',observed_risk:'CAUTION'}}}]});
test('five visible roles and confirmed pool/onchain evidence still reject all trades',()=>{
 const r=buildDecisionDossiers({network:network(),batch:batch(),now});
 assert.equal(r.candidates.length,1);
 const c=r.candidates[0];
 assert.equal(c.roles_reporting_count,5);
 assert.equal(c.roles_signed_verified,0);
 assert.equal(c.provider_identity_status,'PROVIDERS_AGREE');
 assert.equal(c.onchain_existence_status,'ACCOUNT_OR_CODE_OBSERVED');
 assert.equal(c.solana_mint_authority,'RETAINED');
 assert(c.blockers.includes('SOLANA_MINT_AUTHORITY_RETAINED'));
 assert(c.blockers.includes('SIZE_SPECIFIC_EXECUTABLE_BUY_SELL_QUOTES_UNAVAILABLE'));
 assert.equal(c.paper_entry_authorized,false);
 assert.equal(r.automated_external_paper_entry_authorized,false);
});
test('stale results never grant positive evidence',()=>{
 const r=buildDecisionDossiers({network:network(),batch:batch(),now:now+11*60000});
 const c=r.candidates[0];
 assert.equal(c.provider_identity_status,'UNVERIFIED');
 assert.equal(c.onchain_existence_status,'UNVERIFIED');
 assert.equal(c.solana_mint_authority,'UNKNOWN');
 assert.equal(c.paper_entry_authorized,false);
});
test('injected positive security claims cannot flip local decision',()=>{
 const n=network(),b=batch();
 n.advisories.candidates[0].score=100;
 n.advisories.candidates[0].paper_entry_authorized=true;
 b.results[0].paper_entry_authorized=true;
 const r=buildDecisionDossiers({network:n,batch:b,now});
 assert.equal(r.candidates[0].provider_identity_status,'UNVERIFIED');
 assert.equal(r.candidates[0].paper_entry_authorized,false);
});
test('bad source or candidate ID cannot produce a dossier',()=>{
 assert.equal(buildDecisionDossiers({network:null,batch:batch(),now}).candidates.length,0);
 const n=network();n.advisories.candidates[0].candidate_id='bad';
 assert.equal(buildDecisionDossiers({network:n,batch:batch(),now}).candidates.length,0);
});

test('unverified or incomplete Solana risk payload cannot be presented as trusted authority evidence',()=>{
 const b=batch();
 delete b.results[0].onchain_existence.solana_mint_header.observed_risk;
 const r=buildDecisionDossiers({network:network(),batch:b,now});
 assert.equal(r.candidates[0].solana_mint_authority,'UNKNOWN');
 assert.equal(r.candidates[0].paper_entry_authorized,false);
});
