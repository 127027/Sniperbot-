// Research priority, NOT a buy rule. All candidates retained, even if unsupported.
export function prioritizeEvidence(candidates,launches,{tickUtc,excluded=[]}={}){
 const tick=Date.parse(tickUtc),seen=new Set(excluded),rows=[];
 if(!Number.isFinite(tick))throw Error('INVALID_TICK');
 for(const c of candidates){
  if(!c.priority.startsWith('RECENT'))continue;
  const launch=launches.get(c.mint)||null;
  if(launch&&Date.parse(launch.source_event_at_utc)+60000>=tick)throw Error('FUTURE_LAUNCH');
  const pools=c.pools.map(p=>{
   const w=p.windows.m10,prior=p.windows.m60;
   const activity=w.reported_buys+w.reported_sells,turnover=w.reported_quote_buy_volume+w.reported_quote_sell_volume;
   const two=w.reported_buys>0&&w.reported_sells>0;
   const age=(tick-Date.parse(p.latest_observed_at))/1000;
   const sol=p.quote_mint==='So11111111111111111111111111111111111111112';
   const pump=p.protocols.some(x=>/pump/i.test(x)&&!/swap|amm/i.test(x));
   const change=Number.isFinite(w.observed_mark_change_pct)?w.observed_mark_change_pct:null;
   const score=Math.log1p(activity)*2+(two?2:0)+(change===null?0:Math.max(-1,Math.min(2,change/10)))+(sol&&Number.isFinite(turnover)?Math.log1p(turnover):0);
   return {pool:p.pool,quote_mint:p.quote_mint,protocols:p.protocols,activity,two_sided:two,observed_swaps_60m:prior.reported_buys+prior.reported_sells,age_seconds:age,reported_quote_turnover:turnover,reported_mark_change_pct:change,latest_signature:p.latest_signature,latest_reported_reserve:p.latest_reported_reserve,sol_quote_reported:sol,pump_curve_reported:pump,priority_score:score};
  }).sort((a,b)=>b.priority_score-a.priority_score||a.pool.localeCompare(b.pool));
  rows.push({mint:c.mint,priority:c.priority,pools,launch_at_utc:launch?.source_event_at_utc??null,launch_age_seconds:launch?(tick-Date.parse(launch.source_event_at_utc))/1000:null,previously_reviewed:seen.has(c.mint),status:'PENDING_EVIDENCE',priority_score:pools[0]?.priority_score??-1});
 }
 rows.sort((a,b)=>b.priority_score-a.priority_score||a.mint.localeCompare(b.mint));
 // Feasibility pilot: choose recent launch with two-sided activity and a small
 // observed history, to maximize ability to reconstruct full mint controls in
 // a bounded batch. This is not the top expected-return candidate.
 const suitable=rows.flatMap(r=>r.previously_reviewed||r.launch_age_seconds===null||r.launch_age_seconds>1800?[]:r.pools.filter(p=>p.two_sided&&p.age_seconds<=300&&p.sol_quote_reported&&p.pump_curve_reported&&p.latest_signature&&p.observed_swaps_60m>=2).map(p=>({mint:r.mint,launch_age_seconds:r.launch_age_seconds,...p})));
 suitable.sort((a,b)=>a.observed_swaps_60m-b.observed_swaps_60m||b.priority_score-a.priority_score||a.mint.localeCompare(b.mint));
 return {rows,eligible_pilot_count:suitable.length,pilot:suitable[0]??null};
}

// Reuse the saved rank without treating the research priority as an entry signal.
// A bounded complete-history pilot favors activity on both sides and sustained
// observed swaps, but is explicitly not a market-wide top investment selection.
export function selectSustainedEvidencePilot(rows,{excluded=[],minSwaps=4,maxSwaps=7}={}){
 const skip=new Set(excluded),candidates=[];
 for(const r of rows){
  if(skip.has(r.mint)||r.previously_reviewed||!Number.isFinite(r.launch_age_seconds)||r.launch_age_seconds>1800)continue;
  for(const p of r.pools){
   if(!p.two_sided||!p.sol_quote_reported||!p.pump_curve_reported||!p.latest_signature||p.age_seconds>300||p.activity<3||p.observed_swaps_60m<minSwaps||p.observed_swaps_60m>maxSwaps)continue;
   candidates.push({mint:r.mint,launch_age_seconds:r.launch_age_seconds,...p});
  }
 }
 candidates.sort((a,b)=>(b.reported_mark_change_pct!==null&&b.reported_mark_change_pct>0.1?1:0)-(a.reported_mark_change_pct!==null&&a.reported_mark_change_pct>0.1?1:0)||b.priority_score-a.priority_score||a.mint.localeCompare(b.mint));
 return {pilot:candidates[0]??null,eligible_pilot_count:candidates.length};
}

// Prioritize research of less depleted, actively traded candidates, not buys.
// Reported virtual reserve is a noisy ordering proxy; never use as real liquidity.
// Keep the bounded RPC pilot constraint and preserve all unresolved ranked rows.
export function selectNextLiquidityEvidencePilot(rows,{excluded=[],minSwaps=4,maxSwaps=7}={}){
 const skip=new Set(excluded),candidates=[];
 for(const r of rows){
  if(skip.has(r.mint)||r.previously_reviewed||!Number.isFinite(r.launch_age_seconds)||r.launch_age_seconds>1800)continue;
  for(const p of r.pools){
   if(!p.two_sided||!p.sol_quote_reported||!p.pump_curve_reported||!p.latest_signature||!Number.isFinite(p.age_seconds)||p.age_seconds>300||p.age_seconds<60||p.activity<3||p.observed_swaps_60m<minSwaps||p.observed_swaps_60m>maxSwaps)continue;
   candidates.push({mint:r.mint,launch_age_seconds:r.launch_age_seconds,...p});
  }
 }
 const value=x=>Number.isFinite(x.latest_reported_reserve)?x.latest_reported_reserve:-Infinity;
 candidates.sort((a,b)=>value(b)-value(a)||b.activity-a.activity||b.priority_score-a.priority_score||a.mint.localeCompare(b.mint)||a.pool.localeCompare(b.pool));
 return {pilot:candidates[0]??null,eligible_pilot_count:candidates.length,ranking_is_not_buy_signal:true,reported_reserve_is_not_verified_liquidity:true};
}

// Higher-activity research lane. Reported turnover is a source clue, not
// verified liquidity or a buy signal. No upper history-length cutoff.
export function selectActiveHistoryPilot(rows,{excluded=[]}={}){
 const skip=new Set(excluded),candidates=[];
 for(const r of rows){
  if(skip.has(r.mint)||r.previously_reviewed||!Number.isFinite(r.launch_age_seconds)||r.launch_age_seconds>3600)continue;
  for(const p of r.pools){
   if(!p.two_sided||!p.sol_quote_reported||!p.pump_curve_reported||!p.latest_signature||!Array.isArray(p.protocols)||p.protocols.some(x=>/mayhem/i.test(x))||!Number.isFinite(p.age_seconds)||p.age_seconds<60||p.age_seconds>300||p.activity<5||p.observed_swaps_60m<8||!Number.isFinite(p.reported_quote_turnover)||p.reported_quote_turnover<=0)continue;
   candidates.push({mint:r.mint,launch_age_seconds:r.launch_age_seconds,...p});
  }
 }
 candidates.sort((a,b)=>b.reported_quote_turnover-a.reported_quote_turnover||b.activity-a.activity||b.priority_score-a.priority_score||a.mint.localeCompare(b.mint)||a.pool.localeCompare(b.pool));
 return {pilot:candidates[0]??null,eligible_pilot_count:candidates.length,ranking_is_not_buy_signal:true,reported_turnover_is_not_verified_liquidity:true};
}
// Process all already captured receipts and at most budget new signatures.
// Include first and last observations early; later stages fill the middle.
export function planStagedHistory(signatures,captured,{budget=7}={}){
 if(!Array.isArray(signatures)||!Array.isArray(captured)||!Number.isInteger(budget)||budget<0||new Set(signatures).size!==signatures.length||signatures.some(x=>typeof x!=='string'||!x))throw Error('INVALID_HISTORY_PLAN');
 const have=new Set(captured),priority=[...new Set([...signatures.slice(0,1),...signatures.slice(1).reverse()])];
 const existing=signatures.filter(x=>have.has(x)),missing=priority.filter(x=>!have.has(x)),newRequests=missing.slice(0,budget);
 return {existing,newRequests,remaining:missing.slice(budget),selected:[...existing,...newRequests],complete:missing.length===0};
}
