// Read-only telemetry for a REAL Dot research → signed order → Paper fill
// chain. Every stage is independently evidenced; never confuse public
// research snapshots with an authenticated trading order or a real fill.
export const PIPELINE_STAGE_SCHEMA='sniper_paper_pipeline_health.v1';
const NAMES=Object.freeze({
 news_discovery:'News Discovery',
 social_acceleration:'Social Acceleration',
 onchain_liquidity:'On-chain Liquidity',
 contract_security:'Contract Security',
 opportunity_qa:'Opportunity QA'
});
const FRESH_MS=90*60*1000;
const iso=ms=>Number.isFinite(ms)?new Date(ms).toISOString():null;
export function summarizePaperPipeline({
 research=null,readEnabled=false,
 courier=null,publishers=[],receipts=[],positions=[],
 topology='UNPAIRED',offline=false,now=Date.now()
}={}){
 if(!Number.isFinite(now)||!Array.isArray(receipts)||
  !Array.isArray(publishers)||!Array.isArray(positions))
  throw Error('INVALID_PIPELINE_HEALTH_INPUT');
 const inputRoles=Array.isArray(research?.roles)?research.roles:[];
 const roles=Object.entries(NAMES).map(([key,label])=>{
  const r=inputRoles.find(x=>x?.role===key);
  const ts=Date.parse(r?.published_at_utc||'');
  const fresh=!offline&&readEnabled&&Number.isFinite(ts)&&
   ts<=now+30000&&now-ts<=FRESH_MS&&r?.stale!==true&&
   r?.status!=='UNAVAILABLE';
  return {role:key,label,
   status:!readEnabled||offline?'NOT_CHECKED':
    !r?'NOT_RECEIVED':r.status==='UNAVAILABLE'?'SOURCE_UNAVAILABLE':
    fresh?'RESEARCH_RECEIVED':'STALE',
   published_at_utc:iso(ts),
   candidate_count:Number.isInteger(r?.candidate_count)?r.candidate_count:0,
   research_only:true,order_authorized:false};
 });
 const researched=roles.filter(r=>r.status==='RESEARCH_RECEIVED').length;
 const publishersConfigured=publishers.some(x=>x?.scope==='agent_execution'&&
  x.revoked!==true&&typeof x.public_key_pem==='string');
 const receiptList=receipts.filter(x=>x&&typeof x==='object');
 const courierOk=courier?.status==='FETCHED_SIGNED_COURIER';
 const receivedCount=receiptList.length;
 const executedPaper=receiptList.filter(x=>x.status==='PAPER_FILLED').length;
 const fromGitHub=receiptList.filter(x=>x.command_source==='GITHUB_SIGNED_COURIER').length;
 const fromLocal=receiptList.filter(x=>x.command_source==='SIGNED_LOCAL_ADAPTER').length;
 const possibleButNotProven=fromGitHub>0;
 const latest=receiptList[receiptList.length-1];
 return {
  schema:PIPELINE_STAGE_SCHEMA,paper_only:true,
  checked_at_utc:iso(now),
  stages:{
   dot_research:{
    status:!readEnabled||offline?'DISABLED':researched?'RESEARCH_DATA_RECEIVED':'NO_CURRENT_RESEARCH',
    fresh_roles:researched,total_roles:roles.length,
    last_public_read_at_utc:research?.checked_at_utc||null,
    roles,
    direct_trade_instructions:false
   },
   signed_order_publisher:{
    status:!publishersConfigured?'NO_TRUSTED_SIGNING_KEY':
     receivedCount?'SIGNED_COMMANDS_RECEIVED':'TRUSTED_SIGNER_NO_COMMANDS',
    keys_configured:publishersConfigured,
    real_cloud_dot_identity_verified:false
   },
   public_github_courier:{
    status:offline?'OFFLINE':courier?.status||'NOT_CHECKED',
    last_checked_at_utc:courier?.checked_at_utc||null,
    last_error:courier?.last_error||null,
    last_feed_signal_count:courier?.received_last||0
   },
   paper_execution:{
    status:executedPaper?'PAPER_FILLS_CONFIRMED':'NO_PAPER_FILL',
    total_signed_order_receipts:receivedCount,
    signed_local_receipts:fromLocal,
    signed_github_courier_receipts:fromGitHub,
    executed_paper_orders:executedPaper,
    open_paper_positions:positions.length,
    last_signal_received_at_utc:latest?.received_at_utc||null
   },
   live_execution:{status:'LOCKED',enabled:false}
  },
  device_topology:topology,
  verified_dot_publisher_connected:false,
  real_dot_research_to_order_execution_proven:false,
  github_signed_courier_message_received:possibleButNotProven,
  message:'Öffentliche Forschungsberichte und signierte BUY/SELL-Nachrichten sind getrennte Stufen. Ohne von einem tatsächlich verifizierten Dot signierten Auftrag wird kein echter Dot-Trade bestätigt.'
 };
}
