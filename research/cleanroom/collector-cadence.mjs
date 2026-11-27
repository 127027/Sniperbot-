// Compact, non-executable cadence ledger. Never extrapolates missing cycles.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const schema='cleanroom.collector-cadence.v1',day=86400000;
const ts=x=>typeof x==='string'?Date.parse(x):NaN;
const valid=r=>r&&typeof r.run_id==='string'&&r.run_id&&Number.isInteger(r.sample)&&r.sample>=0&&Number.isFinite(ts(r.started_at))&&Number.isFinite(ts(r.finished_at))&&ts(r.finished_at)>=ts(r.started_at)&&['OK','FAILED','NO_FRESH_QUOTES'].includes(r.status)&&Number.isInteger(r.fresh_research_quotes)&&r.fresh_research_quotes>=0;
const good=r=>r.status==='OK'&&r.fresh_research_quotes>0&&Number.isFinite(ts(r.snapshot))&&ts(r.snapshot)<=ts(r.finished_at)&&ts(r.finished_at)-ts(r.snapshot)<=300000;
export function emptyLedger(){return {schema,mode:'RESEARCH_ONLY',non_executable:true,samples:[]}}
function check(l){if(l?.schema!==schema||l.mode!=='RESEARCH_ONLY'||l.non_executable!==true||!Array.isArray(l.samples)||l.samples.some(r=>!valid(r)))throw Error('INVALID_CADENCE_LEDGER')}
export function append(l,health){
 check(l);
 const {run_id,sample,started_at,finished_at,status,snapshot,fresh_research_quotes,event}=health;
 const r={run_id,sample,started_at,finished_at,status,snapshot,fresh_research_quotes,event};
 if(!valid(r))throw Error('INVALID_CADENCE_SAMPLE');
 const old=l.samples.find(x=>x.run_id===run_id&&x.sample===sample);
 if(old){if(JSON.stringify(old)!==JSON.stringify(r))throw Error('CADENCE_SAMPLE_COLLISION');return l}
 const samples=[...l.samples,r].sort((a,b)=>ts(a.finished_at)-ts(b.finished_at));
 const latest=ts(samples.at(-1).finished_at);
 return {...l,samples:samples.filter(x=>ts(x.finished_at)>=latest-7*day).slice(-10080)};
}
export function coverage(l,now,windowMs=day,maxGapMs=900000){
 check(l);const end=typeof now==='number'?now:ts(now),start=end-windowMs;
 if(!Number.isFinite(end)||windowMs<=0||maxGapMs<=0)throw Error('BAD_CADENCE_WINDOW');
 const rows=l.samples.filter(r=>ts(r.finished_at)>=start&&ts(r.finished_at)<=end);
 const verified=rows.filter(good).sort((a,b)=>ts(a.finished_at)-ts(b.finished_at));
 const points=[start,...verified.map(r=>ts(r.finished_at)),end];
 const gaps=points.slice(1).map((x,i)=>x-points[i]);
 const maxGap=Math.max(...gaps),bad=rows.length-verified.length;
 const future=l.samples.filter(r=>ts(r.finished_at)>end).length;
 return {mode:'RESEARCH_ONLY',non_executable:true,window_start:new Date(start).toISOString(),window_end:new Date(end).toISOString(),sample_count:rows.length,successful_fresh_cycles:verified.length,failed_or_stale_cycles:bad,future_samples:future,scheduled_cycles:rows.filter(r=>r.event==='schedule').length,largest_gap_seconds:maxGap/1000,max_allowed_gap_seconds:maxGapMs/1000,gaps_over_limit:gaps.filter(x=>x>maxGapMs).length,status:verified.length>1&&bad===0&&future===0&&maxGap<=maxGapMs?'CADENCE_PASS':'CADENCE_UNVERIFIED',limitations:'Observed completed-cycle cadence only; not continuous provider or AI execution, complete market coverage, or paper results.'};
}
function selfTest(){
 const start=Date.parse('2026-11-26T08:00:00Z'),end=start+day;
 const mk=(i,ms,status='OK')=>({run_id:'fixture',sample:i,started_at:new Date(ms-1000).toISOString(),finished_at:new Date(ms).toISOString(),status,snapshot:status==='OK'?new Date(ms-500).toISOString():null,fresh_research_quotes:status==='OK'?5:0,event:'schedule'});
 let l=emptyLedger();l=append(l,mk(0,end));assert.equal(coverage(l,end).status,'CADENCE_UNVERIFIED');
 l=emptyLedger();for(let i=0;i<=144;i++)l=append(l,mk(i,start+i*600000));
 assert.equal(coverage(l,end).status,'CADENCE_PASS');
 const broken={...l,samples:l.samples.filter(r=>r.sample!==70)};assert.equal(coverage(broken,end).status,'CADENCE_UNVERIFIED');
 assert.equal(coverage(append(l,mk(145,end-300000,'FAILED')),end).status,'CADENCE_UNVERIFIED');
 assert.equal(coverage(append(l,mk(146,end+1000)),end).status,'CADENCE_UNVERIFIED');
 assert.equal(append(l,mk(144,end)),l);assert.throws(()=>append(l,mk(144,end,'FAILED')),/CADENCE_SAMPLE_COLLISION/);
 console.log('Cadence fixtures passed: isolated success does not pass 24h, full observed cadence passes, missing interval/failure/future and conflicting replay rejected');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){if(process.argv.includes('--self-test'))selfTest();else throw Error('Use --self-test; library only.');}
