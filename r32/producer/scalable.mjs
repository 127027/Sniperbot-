import {identity} from '../../r31/broadcast.mjs';
import {blobSha} from '../../r31/github.mjs';
import {compileReviews} from './strategy.mjs';
import {makeSnapshot,MAX_RECORDS} from '../protocol/snapshot.mjs';
// Pure planning. Publication needs one atomic tree+commit+CAS, never a partial pointer.
export function prepareScalableStrategy({header,universe,reviews}){
 if(!Array.isArray(universe?.coins)||universe.coins.length>MAX_RECORDS)throw Error('INVALID_UNIVERSE');
 const decisions=compileReviews(reviews,{maxRecords:MAX_RECORDS}),seen=new Set(decisions.map(identity)),next=new Map();
 for(const c of universe.coins){const k=identity(c);if(next.has(k)||!['LONG','EXIT'].includes(c.intent)||typeof c.coin!=='string')throw Error('INVALID_UNIVERSE');next.set(k,{coin:c.coin,chain:c.chain,contract:c.contract,intent:c.intent})}
 for(const d of decisions){const k=identity(d);if(d.action==='BUY'||d.action==='SELL')next.set(k,{coin:d.coin,chain:d.chain,contract:d.contract,intent:d.action==='BUY'?'LONG':'EXIT'});if(d.action==='HOLD'&&next.get(k)?.intent==='EXIT')throw Error('EXIT_INTENT_NEEDS_REVIEW')}
 for(const [k,c] of next)if(!seen.has(k))decisions.push({coin:c.coin,chain:c.chain,contract:c.contract,action:'DATA_GAP',reason:'Prior '+c.intent+' intent: no fresh quote/review'});
 const p=makeSnapshot(header,decisions,x=>blobSha(Buffer.from(x)));
 return {...p,universe:{schema:'r32.strategy.universe.v2',sequence:header.sequence,last_manifest_blob_sha:p.pointer.blob_sha,coins:[...next.values()]}};
}
