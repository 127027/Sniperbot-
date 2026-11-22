import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeDot3RiskStatuses} from '../src/v19-dot3-risk-status.mjs';
import {backtestOnRequest} from '../src/v18-requested-backtest.mjs';

const at='2026-10-12T00:35:00.000Z';
const pool='0x'+'a'.repeat(40);
const candidate={chain:'base',pool,contract:'0x'+'b'.repeat(40),
 captured_at_utc:'2026-10-12T00:34:50.000Z',
 independent_price_liquidity_ready:false,
 primary_quote_usd:.001,second_source_price_usd:.003,
 primary_liquidity_usd:20,second_source_liquidity_usd:25,
 price_disagreement_pct:100,
 security_verified:false,sellability_verified:false};
const handoff={schema:1,kind:'DOT2_TO_DOT3_EVIDENCE_HANDOFF',
 source_capture_utc:'2026-10-12T00:34:55.000Z',
 as_of_utc:'2026-10-12T00:34:55.000Z',
 candidates:[candidate]};
const manifest=()=>({schema:1,kind:'R29_V18_ASOF_REPLAY_INPUT',
 date:'2026-10-12',selected_from_future_winner_list:false,
 snapshots:[],activity_observations:[],
 dot3_risk_handoffs:[{as_of_utc:at,handoff}]});
test('LIVE and HISTORICAL modes see identical Dot3 status, no parallel trading logic',()=>{
 const live=summarizeDot3RiskStatuses({handoff,asOfUtc:at,mode:'LIVE_PAPER'});
 const back=backtestOnRequest({date:'2026-10-12',manifest:manifest()});
 const historical=back.role_audit.dot3_risk.risk_status_previews[0];
 assert.equal(live.candidates[0].status,'WATCH');
 assert.equal(historical.candidates[0].status,live.candidates[0].status);
 assert.equal(historical.candidates[0].reason,live.candidates[0].reason);
 assert.equal(historical.order_authorized_count,0);
 assert.equal(back.confirmed_paper_orders,0);
 assert.equal(back.role_audit.dot3_risk.actual_dot3_paper_approvals,0);
 assert.equal(back.role_audit.dot3_risk.common_risk_status_engine,'R29_V19_DOT3_RISK_STATE');
});
test('future handoff capture is rejected rather than converted to October knowledge',()=>{
 const m=manifest();
 m.dot3_risk_handoffs[0].handoff={...handoff,
  source_capture_utc:'2026-10-12T02:00:00.000Z'};
 assert.throws(()=>backtestOnRequest({date:'2026-10-12',manifest:m}),
   /FUTURE_OR_UNVERIFIED_DOT3_REPLAY_HANDOFF/);
});
test('winner labels never turn into a BUY through Dot3 preview',()=>{
 const m=manifest();
 m.dot3_risk_handoffs[0].handoff={...handoff,candidates:[
  {...candidate,future_winner_label:true}]};
 const back=backtestOnRequest({date:'2026-10-12',manifest:m});
 const c=back.role_audit.dot3_risk.risk_status_previews[0].candidates[0];
 assert.equal(c.status,'DATA_GAP');
 assert.equal(c.reason,'POST_EVENT_INPUT_QUARANTINED');
 assert.equal(c.trade_authorized,false);
 assert.equal(back.model_replay_summary.buys,0);
});
