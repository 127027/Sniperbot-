import {createHash,createPublicKey,verify} from 'node:crypto';
import {action} from './core.mjs';
import {identity} from './research.mjs';
import {validTokenAddress} from './market.mjs';
import {allocatePortfolioPaper} from './portfolio-budget.mjs';
export const DOMAIN='MemeSniper/paper_execution_decision.v1\n';
export function canonical(value){
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
}
export function unsigned(d){const {signature,...payload}=d;return DOMAIN+canonical(payload);}
const common=['schema','paper_only','signal_id','decision_id','decision_revision','action','chain','token_address','pool_address','candidate_id','decision_at_utc','expires_at_utc','research_snapshot_id','issuer','key_id','signature'];
const buy=['score_0_100','quorum_policy','votes_ref','independent_risk_ref'];
const sell=['close_fraction','reason_code','exit_policy_ref'];
const optionalBuyAllocation=['allocation_intent','target_test_usdc'];
export function verifyDecision(d,keys,{now=Date.now(),allowSynthetic=false}={}){
 if(!d||typeof d!=='object'||Array.isArray(d))throw Error('Ungültige Entscheidung');
 const allocationFields=optionalBuyAllocation.filter(k=>Object.hasOwn(d,k));
 if(allocationFields.length===1 || (allocationFields.length>0&&d.action!=='PAPER_BUY'))throw Error('Unvollständige Kapitalentscheidung');
 const fields=[...common,...(d.action==='PAPER_BUY'?buy:d.action==='PAPER_SELL'?sell:[]),...allocationFields];
 if(Object.keys(d).length!==fields.length||fields.some(k=>!Object.hasOwn(d,k)))throw Error('Ungültige Felder');
 if(d.schema!=='paper_execution_decision.v1'||d.paper_only!==true||!['PAPER_BUY','PAPER_SELL'].includes(d.action))throw Error('Nur Paper-Entscheidungen');
 for(const k of fields.filter(k=>!['paper_only','decision_revision','score_0_100','close_fraction','target_test_usdc'].includes(k)))if(typeof d[k]!=='string'||!d[k]||d[k].length>1000)throw Error('Ungültiges Textfeld');
 for(const k of ['signal_id','decision_id','key_id'])if(!/^[-a-zA-Z0-9]{8,100}$/.test(d[k]))throw Error('Ungültige ID');
 if(!Number.isSafeInteger(d.decision_revision)||d.decision_revision<1)throw Error('Ungültige Revision');
 const at=Date.parse(d.decision_at_utc),expiry=Date.parse(d.expires_at_utc);
 if(!Number.isFinite(at)||!Number.isFinite(expiry)||at>now+5000||expiry<=now||expiry<=at||expiry-at>120000)throw Error('Abgelaufene/ungültige Entscheidung');
 const key=keys.find(k=>k.key_id===d.key_id&&k.issuer===d.issuer&&!k.revoked);
 if(!key)throw Error('Kein vertrauenswürdiger Publisher');
 const pub=createPublicKey(key.public_key_pem);
 if(pub.asymmetricKeyType!=='ed25519'||!verify(null,Buffer.from(unsigned(d)),pub,Buffer.from(d.signature,'base64')))throw Error('Ungültige Signatur');
 const synthetic=d.chain==='demo';
 if(synthetic&&(!allowSynthetic||key.scope!=='synthetic'))throw Error('Synthetische Aufträge hier gesperrt');
 if(!synthetic&&key.scope!=='external')throw Error('Publisher-Scope unzulässig');
 if(!synthetic&&(!validTokenAddress(d.chain,d.token_address)||!validTokenAddress(d.chain,d.pool_address)))throw Error('Ungültige Coin-Adresse');
 if(d.candidate_id!==identity(d.chain,d.token_address,d.pool_address))throw Error('Coin-Identität stimmt nicht');
 if(d.action==='PAPER_BUY'&&(!Number.isFinite(d.score_0_100)||d.score_0_100<0||d.score_0_100>100||d.quorum_policy!=='FIVE_INDEPENDENT_YES'))throw Error('Ungültige Bewertung/Policy');
 if(allocationFields.length===2){
  if(!['EXPLORATORY','TARGET','HIGH_CONVICTION'].includes(d.allocation_intent)||
    (d.allocation_intent==='TARGET'?(!Number.isFinite(d.target_test_usdc)||d.target_test_usdc<=0):d.target_test_usdc!==null))
    throw Error('Ungültige Kapitalstrategie');
 }
 if(d.action==='PAPER_SELL'&&(d.close_fraction!==1||d.reason_code!=='CENTRAL_RESEARCH_EXIT'))throw Error('Ungültige Exit-Policy');
 return {synthetic};
}
// Pure synchronous transition: caller atomically persists ledger and receipt together.
// No model/research calls. External market/risk adapter is deliberately not fabricated.
export function receiveDecision(state,d,keys,options={}){
 const now=options.now??Date.now();const {synthetic}=verifyDecision(d,keys,{...options,now});
 const book=state.paperDecisions||{receipts:[],revisions:{}};
 const hash=createHash('sha256').update(unsigned(d)).digest('hex');
 const old=book.receipts.find(r=>r.signal_id===d.signal_id);
 if(old){if(old.payload_sha256!==hash)throw Error('Signal-ID-Konflikt');return state;}
 const revisionKey=JSON.stringify([d.issuer,d.decision_id]);
 if((book.revisions[revisionKey]||0)>=d.decision_revision)throw Error('Veraltete Entscheidungsrevision');
 let next=state,status='BLOCKED',reason='REAL_VALIDATOR_UNAVAILABLE',amount=0;
 const quote=options.syntheticQuote;
 if(!state.centralPaperFollow){reason='Zentrale Paper-Ausführung AUS';}
 else if(synthetic){
  const quoteOK=quote&&quote.candidate_id===d.candidate_id&&Number.isFinite(quote.priceUsd)&&quote.priceUsd>0&&Number.isFinite(quote.asOf)&&quote.asOf<=now&&now-quote.asOf<=10000&&quote.sellable===true&&Number.isFinite(quote.maxGross)&&quote.maxGross>0;
  if(!quoteOK){reason='EXIT_OR_BUY_QUOTE_UNAVAILABLE';}
  else if(d.action==='PAPER_BUY'){
   if(!state.entriesEnabled){reason='Bot AUS';}
   else if(!quote.riskPass||!quote.quorumPass){reason='CENTRAL_PROOF_UNAVAILABLE';}
   else if(d.allocation_intent==='HIGH_CONVICTION'&&quote.convictionPass!==true){reason='INDEPENDENT_CONVICTION_PROOF_UNAVAILABLE';}
   else{
    amount=allocatePortfolioPaper({state,intent:d.allocation_intent||'EXPLORATORY',targetUsdc:d.target_test_usdc??null,capacity:quote.maxGross});
    if(!amount){reason='Paper-Gesamtbudget oder sichere Ausführungskapazität erschöpft';}
    else{
     const candidate={id:d.candidate_id,chain:d.chain,tokenAddress:d.token_address,poolAddress:d.pool_address,symbol:'SYNTHETIC',name:'Synthetischer Ausführungstest',priceUsd:quote.priceUsd,asOf:new Date(now).toISOString(),isDemo:true,source:'SYNTHETIC_QUOTE'};
     const prepared={...state,candidates:[candidate,...state.candidates.filter(c=>c.id!==candidate.id)]};
     const applied=action(prepared,{type:'BUY',id:d.candidate_id,amount});
     if(applied.positions.length>state.positions.length){next=applied;status='PAPER_FILLED';reason='Synthetischer zentraler Kauf ausgeführt';}else{amount=0;reason='Doppelte Position oder Ledger-Sperre';}
    }
   }
  }else{
   const positions=state.positions.filter(p=>p.isDemo&&identity(p.chain,p.tokenAddress,p.poolAddress)===d.candidate_id);
   if(!positions.length){status='NOOP';reason='Keine eigene Position';}
   else{
    next={...state,positions:state.positions.map(p=>positions.includes(p)?{...p,priceUsd:quote.priceUsd,markAt:new Date(now).toISOString()}:p)};
    for(const p of positions)next=action(next,{type:'SELL',id:p.id});
    if(positions.every(p=>!next.positions.some(x=>x.id===p.id))){status='PAPER_FILLED';reason='Synthetischer zentraler Verkauf ausgeführt';}else{next=state;reason='EXIT_UNAVAILABLE';}
   }
  }
 }
 const receipt={signal_id:d.signal_id,decision_id:d.decision_id,decision_revision:d.decision_revision,candidate_id:d.candidate_id,action:d.action,received_at_utc:new Date(now).toISOString(),status,reason,amount_test_usdc:status==='PAPER_FILLED'?amount:0,payload_sha256:hash,synthetic};
 return {...next,paperDecisions:{receipts:[...book.receipts,receipt],revisions:{...book.revisions,[revisionKey]:d.decision_revision}}};
}
