import test from "node:test";
import assert from "node:assert/strict";
import {classifyRegime,scheduledFrequency,intradayReviewSchedule,
 chooseVirtualPaperStake,HOUR,TRAIN_START} from "./regime-engine.mjs";

const iso=t=>new Date(t).toISOString();
const symbols=["BTCUSDT","ETHUSDT","SOLUSDT"];
const reference=(growth=[1.05,1.07,1.03],dayGrowth=[1.01,1.02,1.01])=>{
 const maps=new Map();
 const T=TRAIN_START;
 for(let k=0;k<3;k++){
  const map=new Map();
  const steps=[[-169,100],[-25,100*growth[k]/dayGrowth[k]],[-1,100*growth[k]]];
  for(const [h,price] of steps){
   const t=T+h*HOUR;
   map.set(t,{t,close:price,visible_at_utc:iso(t+HOUR)});
  }
  maps.set(symbols[k],map);
 }
 return {maps};
};
test("BULL, BEAR, MIXED only from completed actual reference candles",()=>{
 const bull=classifyRegime(reference(),TRAIN_START);
 assert.equal(bull.regime,"BULL");
 assert.equal(bull.reference.BTCUSDT.return_7d>.02,true);
 assert.equal(bull.reference.ETHUSDT.return_24h>0,true);
 assert.equal(classifyRegime(reference([.94,.93,.95],[.99,.98,.99]),
  TRAIN_START).regime,"BEAR");
 assert.equal(classifyRegime(reference([1.02,.99,1.04],[1.01,1.01,1.01]),
  TRAIN_START).regime,"MIXED_OR_SIDEWAYS");
 const source=reference();
 source.maps.get("BTCUSDT").delete(TRAIN_START-HOUR);
 assert.equal(classifyRegime(source,TRAIN_START).regime,
  "UNKNOWN_REFERENCE_DATA_GAP");
});
test("changing a future candle or current open candle cannot change historical regime",()=>{
 const r=reference();
 const previous=classifyRegime(r,TRAIN_START);
 const future=TRAIN_START+HOUR;
 for(const sym of symbols){
  r.maps.get(sym).set(future,{t:future,close:1e12,
   visible_at_utc:iso(future+HOUR)});
 }
 assert.deepEqual(classifyRegime(r,TRAIN_START),previous);
});
test("frequency 1/4/12/24 can escalate at 2nd scan and later de-escalate intra-day",()=>{
 const start=TRAIN_START;
 const scores=Array.from({length:24},(_,i)=>i<6?2:i<8?11:i<12?1:4);
 const state=intradayReviewSchedule({
  phase:"HOLDOUT",start,stop:start+24*HOUR,
  activityAt:T=>({score:scores[(T-start)/HOUR]}),
  quartilesAt:()=>[3,5,9]});
 assert(state.revisions.some(x=>x.from===1&&x.to===24));
 assert(state.revisions.some(x=>x.from===24&&x.to===1));
 assert(state.completed_price_only_scans<=24);
 assert(state.scans.every((x,i)=>i===0||Date.parse(x.at_utc)>
  Date.parse(state.scans[i-1].at_utc)));
 assert.equal(state.actual_GPT_model_calls_at_past_time,0);
 assert.equal(state.no_laptop_position_or_wallet_mutation,true);
});
test("stake ladders are 50..5000 and in cautious mode constrained by exposure and equity",()=>{
 assert.equal(chooseVirtualPaperStake({
  availableCash:5000,virtualEquity:5000,regime:"BULL",signalStrength:4,
  riskProfile:"STRESS"}).stake,2500);
 assert.equal(chooseVirtualPaperStake({
  availableCash:6000,virtualEquity:6000,regime:"BULL",signalStrength:4,
  riskProfile:"STRESS"}).stake,5000);
 assert.equal(chooseVirtualPaperStake({
  availableCash:5000,virtualEquity:5000,regime:"BULL",signalStrength:4,
  riskProfile:"CAUTIOUS"}).stake,250);
 assert.equal(chooseVirtualPaperStake({
  availableCash:120,virtualEquity:5000,regime:"MIXED_OR_SIDEWAYS",
  signalStrength:1.5,riskProfile:"CAUTIOUS"}).stake,100);
 assert.equal(chooseVirtualPaperStake({
  availableCash:5000,virtualEquity:5000,regime:"BEAR",
  signalStrength:100,riskProfile:"STRESS"}).stake,0);
 assert.equal(chooseVirtualPaperStake({
  availableCash:5000,virtualEquity:5000,openExposure:300,
  regime:"BULL",signalStrength:100,
  riskProfile:"CAUTIOUS"}).stake,250);
 assert.equal(chooseVirtualPaperStake({
  availableCash:5000,virtualEquity:5000,positions:3,
  regime:"BULL",signalStrength:100,riskProfile:"STRESS"}).stake,0);
});
