// R29 research-only fail-closed composition of neutral as-of gate and immutable social-text provenance.
// Never treat unverified historical Reddit text as model-visible. No orders, wallet or model calls.
import {buildNeutralHistoricalModelInput} from './blind-neutral-market-gpt-input.mjs';
import {auditHistoricalSocialText} from './reddit-content-provenance-strict-gate-20261117.mjs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const sha=s=>createHash('sha256').update(s).digest('hex');
export function buildProvenanceRestrictedModelInput(input,proofsByItemId={}){
 if(!input||!Array.isArray(input.media_items))throw Error('MEDIA_ARRAY_REQUIRED');
 const excluded=[];
 const media=input.media_items.map(item=>{
  const proof=Object.hasOwn(proofsByItemId,item.item_id)?proofsByItemId[item.item_id]:null;
  const audit=auditHistoricalSocialText(item,proof,input.virtual_asof_utc);
  if(audit.model_text_allowed)return item;
  excluded.push({item_id:item.item_id,reason:audit.reason});
  // Even title and excerpt can leak a posthoc edited token mention. Exclude the entire item.
  return null;
 }).filter(Boolean);
 const gaps=[...(input.missing_source_categories||[])];
 if(excluded.length&&!gaps.includes('SOCIAL_CONTENT_PROVENANCE_UNVERIFIED'))gaps.push('SOCIAL_CONTENT_PROVENANCE_UNVERIFIED');
 const gated=buildNeutralHistoricalModelInput({...input,media_items:media,missing_source_categories:gaps});
 return {...gated,provenance_audit:{excluded_media_count:excluded.length,accepted_media_count:media.length,
  excluded_item_ids_sha256:sha(JSON.stringify(excluded)),unverified_media_text_exposed:false}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const base={virtual_asof_utc:'2026-09-18T01:20:00Z',phase:'TRADE_TEST',
 discovery_mode:'NEUTRAL_ALL_AVAILABLE_EVENTS',candidate_source:'NEUTRAL',
 current_user_conversation_included:false,retrospective_winners_supplied:false,
 market_events:[],prior_lessons:[],open_positions:[],reviews_completed_today:1,missing_source_categories:[],
 media_items:[{item_id:'neutral1',channel:'community',source_id:'test',source_sha256:'a'.repeat(64),
 url:'https://example.org/post',published_at_utc:'2026-09-18T00:01:00Z',
 archived_at_utc:'2026-09-18T00:02:00Z',observed_at_utc:'2026-09-18T00:02:00Z',
 title:'Unverified edited headline',body_excerpt:'Unverified later text',source_archival_method:'test'}]};
 const r=buildProvenanceRestrictedModelInput(base);
 if(r.payload.media_items.length!==0||r.provenance_audit.excluded_media_count!==1||
 !r.payload.missing_source_categories.includes('SOCIAL_CONTENT_PROVENANCE_UNVERIFIED'))throw Error('FAIL_CLOSED_TEST_FAILED');
 let futureRejected=false;
 try{buildProvenanceRestrictedModelInput({...base,market_events:[{event_id:'e',event_type:'DEX_SWAP',
 event_at_utc:'2026-09-18T01:21:00Z',provider_captured_at_utc:'2026-09-18T01:21:00Z',
 chain:'solana',token_address:'neutral-token',pool_address:null,source_sha256:'b'.repeat(64),source_id:'test'}]})}
 catch(e){futureRejected=String(e.message).includes('FUTURE_MARKET_EVENT')}
 if(!futureRejected)throw Error('FUTURE_EVENT_BYPASS');
 console.log('R29_PROVENANCE_WRAPPER_TESTS_PASS synthetic only; historical input not generated');
}
