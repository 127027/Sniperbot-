import test from 'node:test';
import assert from 'node:assert/strict';
import {calendar,quantile,marketSnapshot,dailyActivity,priceOnlySignal,
 planRealScans,frozenPolicy} from './real-replay.mjs';
import {normalizeBinanceBars,candlesVisibleBefore,parsePumpMonthlyHtml,
 HOUR,TRAIN_START} from './source-collector.mjs';

test('exact 60 past days training + 60 truly withheld days',()=>{
 const d=calendar();
 assert.equal(d.length,120);
 assert.equal(d[0].date,'2026-07-20');
 assert.equal(d[59].date,'2026-09-17');
 assert.equal(d[59].phase,'TRAIN');
 assert.equal(d[60].date,'2026-09-18');
 assert.equal(d[60].phase,'HOLDOUT');
 assert.equal(d.at(-1).date,'2026-11-16');
});
test('CEX timestamp parsing rejects impossible/future and never uses current open candle as closed',()=>{
 const t=Date.parse(TRAIN_START);
 const row=x=>[x,'1','1.1','0.9','1.03','10',x+HOUR-1,'20000','100',0,0,0];
 const b=normalizeBinanceBars([row(t),row(t+HOUR)],{start:t,end:t+4*HOUR});
 assert.equal(candlesVisibleBefore(b,new Date(t+HOUR).toISOString()).length,1);
 assert.equal(candlesVisibleBefore(b,new Date(t+HOUR-1).toISOString()).length,0);
 assert.equal(candlesVisibleBefore(b,new Date(t+2*HOUR).toISOString()).length,2);
 assert.throws(()=>normalizeBinanceBars([row(t+HOUR),row(t)],{start:t,end:t+4*HOUR}),/INVALID/);
 assert.throws(()=>normalizeBinanceBars([row(t+6*HOUR)],{start:t,end:t+4*HOUR}),/INVALID/);
});
test('published signal uses only closed historical prices; 6h time boundary enforced',()=>{
 const T=Date.parse(TRAIN_START)+50*HOUR;
 const map=new Map();
 for(let i=0;i<50;i++){
  const t=Date.parse(TRAIN_START)+i*HOUR,px=1+i*.001;
  map.set(t,{t,open:px,high:px,low:px,close:px,quote_vol:1000,
   visible_at_utc:new Date(t+HOUR).toISOString()});
 }
 const index={maps:new Map([['TESTUSDT',map]])};
 assert.equal(marketSnapshot(index,T).length,1);
 const first=marketSnapshot(index,T)[0];
 assert.equal(first.visible_after_utc,new Date(T).toISOString());
 assert(first.return6>0);
 // Modifying a candle that has not yet closed cannot change an earlier scan.
 const earlier=marketSnapshot(index,T-HOUR)[0];
 map.get(T-HOUR).close=9999999;
 assert.equal(marketSnapshot(index,T-HOUR)[0].close,earlier.close);
});
test('activity for scan midnight uses only prior 48 closed hours',()=>{
 const start=Date.parse(TRAIN_START);
 const maps=new Map();
 for(let s=0;s<6;s++){
  const m=new Map();
  for(let i=-48;i<50;i++){
   const t=start+i*HOUR;
   m.set(t,{t,open:1,high:1,low:1,close:1,
    quote_vol:1000,visible_at_utc:new Date(t+HOUR).toISOString()});
  }
  maps.set('PAIR'+s,m);
 }
 const index={maps};
 const original=dailyActivity(index,start);
 assert.equal(original.asset_count,6);
 maps.get('PAIR0').get(start).quote_vol=1e15;
 maps.get('PAIR0').get(start).close=1e7;
 assert.equal(dailyActivity(index,start).score,original.score);
});
test('quantiles and price-only gate do not invent risk/security provenance',()=>{
 assert.equal(quantile([1,2,3,4],.5),2.5);
 assert.throws(()=>quantile([], .5),/NO_DATA/);
 const token={symbol:'DOGEUSDT',return6:.2,return24:.1,volume_ratio:2};
 const policy={price_only_momentum_6h_threshold:.05,volume_ratio_gate:1.05};
 assert.equal(priceOnlySignal([token],policy).length,1);
 assert.equal(priceOnlySignal([{...token,return24:-.01}],policy).length,0);
});
test('real page parser cannot count dates outside its month',()=>{
 const html='<table><tr><td>Mon, Jul 20, 2026</td>'+
 '<td>26,969</td><td>725</td><td>2.69%</td>'+
 '<td>3,417,623 SOL</td><td>$263.0M</td><td>389,011</td></tr></table>';
 assert.equal(parsePumpMonthlyHtml(html,'2026-07')[0].launches,26969);
 assert.equal(parsePumpMonthlyHtml(html,'2026-08').length,0);
});
