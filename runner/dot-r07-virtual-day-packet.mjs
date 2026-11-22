// Research-only time-capsule packet builder. Only allowlisted as-of fields reach simulated roles.
// This filters FUTURE data but cannot externally authenticate a WARC byte stream or chain receipt.
const REPLAY_START='2024-09-10',REPLAY_END='2024-11-09';
const DAY_MS=86400000;
const kinds=new Set(['ORIGINAL_POST','CONTEMPORANEOUS_NEWS','TOKEN_LAUNCH','ONCHAIN_POOL',
 'HISTORICAL_QUOTE','HISTORICAL_RISK','HISTORICAL_SELL_ROUTE']);
const msec=v=>typeof v==='string'?Date.parse(v):NaN;
const has=https=>typeof https==='string'&&/^https:\/\/[^\s@/]+\//.test(https);
const dateValid=day=>typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&
 Number.isFinite(msec(day+'T00:00:00Z'))&&new Date(day+'T00:00:00Z').toISOString().slice(0,10)===day&&
 day>=REPLAY_START&&day<=REPLAY_END;
function archiveProof(e){
 const p=msec(e.published_at_utc),c=msec(e.captured_at_utc);
 if(!Number.isFinite(p)||!Number.isFinite(c)||p>c||e.capture_verified!==true||!has(e.source_url))return null;
 const m=/^https:\/\/web\.archive\.org\/web\/(\d{14})\/(https:\/\/\S+)$/.exec(e.archive_url||'');
 if(!m||m[2]!==e.source_url||typeof e.sha256!=='string'||!/^[0-9a-f]{64}$/.test(e.sha256))return null;
 const d=m[1],stamp=Date.UTC(+d.slice(0,4),+d.slice(4,6)-1,+d.slice(6,8),
  +d.slice(8,10),+d.slice(10,12),+d.slice(12,14));
 return stamp===c?c:null;
}
function onchainProof(e){
 if(e.chain_provenance_verified!==true||!['solana','base','bsc','eth'].includes(e.chain))return null;
 const t=msec(e.block_time_utc);
 if(!Number.isFinite(t)||!Number.isInteger(e.block_height)||e.block_height<0||
    !has(e.explorer_url)||typeof e.transaction_id!=='string'||e.transaction_id.length<30)return null;
 return t;
}
function exposeAllowed(e){
 // NEVER pass arbitrary source JSON. Future labels or post-hoc prices MUST be dropped.
 return {kind:e.kind,source_url:e.source_url||null,archive_url:e.archive_url||null,
  chain:e.chain||null,token_address:e.token_address||null,pool_address:e.pool_address||null,
  observed_time_utc:e.captured_at_utc||e.block_time_utc,
  original_published_at_utc:e.published_at_utc||null,
  block_height:Number.isInteger(e.block_height)?e.block_height:null,
  transaction_id:e.transaction_id||null,source_sha256:e.sha256||null,
  research_only:true};
}
export function releaseR07VirtualDay({virtual_day_utc,events=[]}={}){
 if(!dateValid(virtual_day_utc)||!Array.isArray(events)||events.length>25000)
  throw Error('INVALID_VIRTUAL_RESEARCH_DAY');
 const cutoff=msec(virtual_day_utc+'T00:00:00Z')+DAY_MS-1;
 const sourcePackets=[],excludedByReason={};
 for(const e of events){
  if(!e||!kinds.has(e.kind)){excludedByReason.BAD_KIND=(excludedByReason.BAD_KIND||0)+1;continue}
  const archive=archiveProof(e),chain=onchainProof(e);
  const proof=e.kind.startsWith('ONCHAIN_')||e.kind==='TOKEN_LAUNCH'?chain:
    archive;
  if(proof===null){excludedByReason.NO_VERIFIED_ASOF_PROVENANCE=(excludedByReason.NO_VERIFIED_ASOF_PROVENANCE||0)+1;continue}
  if(proof>cutoff){excludedByReason.FUTURE_CAPTURE=(excludedByReason.FUTURE_CAPTURE||0)+1;continue}
  sourcePackets.push(exposeAllowed(e));
 }
 sourcePackets.sort((a,b)=>a.observed_time_utc.localeCompare(b.observed_time_utc));
 return {schema:'dot_r07_virtual_day_packet.v1',virtual_day_utc,mode:'STRICT_ASOF_METADATA_GATE',
  real_archived_bytes_independently_audited:false,cloud_dot_2024_time_travel:false,
  paper_only:true,actionable:false,source_packets:sourcePackets,excluded_by_reason:excludedByReason};
}
