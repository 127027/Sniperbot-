// R09 quality gate: a copied corpus extraction or an in-chat inline analysis
// is not independently executed cloud research or proof of predictive accuracy.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const PEERS=['news_discovery','social_acceleration','onchain_liquidity','contract_security'];
const empty=x=>Array.isArray(x)&&x.length===0;
export function assessR09Independence(reports){
 if(!Array.isArray(reports)||reports.length!==5||
   new Set(reports.map(r=>r?.role)).size!==5||
   ![...PEERS,'opportunity_qa'].every(role=>reports.some(r=>r.role===role)))
   throw Error('INVALID_R09_ROLE_SET');
 const peers=PEERS.map(role=>reports.find(r=>r.role===role));
 const role_status=peers.map(r=>({
  role:r.role,state:r.state,
  corpus_checked:r.source_corpus_items_checked,
  provisional_extraction_count:r.provisional_first_discovers?.length||0,
  strict_asof_candidate_count:r.strictly_verified_first_discovers?.length||0,
  qualified_historical_buy_advisories:r.qualified_historical_buy_advisories?.length||0,
  execution_provenance:r.execution_provenance||'NOT_ATTESTED',
  independently_executed:r.execution_provenance==='INDEPENDENT_SCHEDULED_DOT_RUN'
 }));
 const qa=reports.find(r=>r.role==='opportunity_qa');
 const peerReportsAvailable=role_status.every(r=>r.state==='COMPLETED');
 const independent=peerReportsAvailable&&role_status.every(r=>r.independently_executed);
 const asof=role_status.reduce((n,r)=>n+r.strict_asof_candidate_count,0);
 const distinctCorpusSymbols=new Set();
 // Deliberately no summing of provisional observations: duplicates across roles
 // and sources are not independent discoveries.
 for(const r of peers)for(const x of (r.provisional_first_discovers||[])){
  if(typeof x.symbol==='string')distinctCorpusSymbols.add(x.symbol);
  if(Array.isArray(x.symbols))for(const sym of x.symbols)distinctCorpusSymbols.add(sym);
 }
 return {schema:'sniper_r09_quality_gate.v1',
  peer_reports_completed:role_status.filter(r=>r.state==='COMPLETED').length,
  peer_reports_independently_attested:role_status.filter(r=>r.independently_executed).length,
  qa_state:qa.state,qa_allowed_to_claim_independent_validation:independent,
  has_any_strict_asof_detection:asof>0,
  strictly_historical_predicative_test_passed:false,
  historical_buy_advisory_count:role_status.reduce((n,r)=>n+r.qualified_historical_buy_advisories,0),
  unique_provisional_symbol_names_from_peer_reports:[...distinctCorpusSymbols].sort(),
  historical_recall_denominator_known:false,
  role_status,
  conclusion:independent&&asof>0?'EVIDENCE_REQUIRES_DAY_BY_DAY_AND_HOLDOUT_SCORE':
    'ONLY_PROVISIONAL_EXTRACTION_NOT_VERIFIED_FIVE_DOT_EARLY_DETECTION'};
}
export function readR09RoleReports(){
 return [...PEERS,'opportunity_qa'].map(role=>JSON.parse(readFileSync(new URL('../research/historical/R09/'+role+'.json',import.meta.url),'utf8')));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 process.stdout.write(JSON.stringify(assessR09Independence(readR09RoleReports()),null,2)+'\n');
}
