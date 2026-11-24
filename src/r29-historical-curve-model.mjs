// Historical indicative curve model, not executable DEX quotes or trade authorization.
import {createHash} from 'node:crypto';
const B=10000n,M=1000000n,L=1000000000n;
const ceil=(a,b)=>(a+b-1n)/b;
const u=x=>{if(typeof x!=='string'||!/^(0|[1-9]\d*)$/.test(x))throw Error('INVALID_INTEGER');return BigInt(x);};
const hash=x=>createHash('sha256').update(x).digest('hex');
const ms=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?Date.parse(x):NaN;
const iso=x=>new Date(x).toISOString();
export function parseHistoricalFx({raw,expectedSha256,tickUtc}={}){
 if(typeof raw!=='string'||hash(raw)!==expectedSha256)throw Error('FX_HASH_MISMATCH');
 const tick=ms(tickUtc),data=JSON.parse(raw);
 if(!Number.isFinite(tick)||!Array.isArray(data))throw Error('INVALID_FX_SOURCE');
 const seen=new Set(),valid=[];
 for(const r of data){
  if(!Array.isArray(r)||r.length!==6||!r.every(Number.isFinite)||!Number.isSafeInteger(r[0])||r[0]%60!==0||r.slice(1,5).some(x=>x<=0)||r[1]>Math.min(r[3],r[4])||r[2]<Math.max(r[3],r[4])||r[5]<0||seen.has(r[0]))throw Error('INVALID_CANDLE');
  seen.add(r[0]);const start=r[0]*1000;
  // Closed candle, plus one minute availability buffer, strictly before tick.
  if(start+120000>=tick||start<tick-600000||r[5]===0)continue;
  valid.push({start,low:r[1],high:r[2],close:r[4],volume:r[5]});
 }
 const row=valid.sort((a,b)=>b.start-a.start)[0];
 if(!row)throw Error('NO_PRE_TICK_FX');
 return {pair:'SOL-USDC',source:'COINBASE_EXCHANGE_1M',candle_start_utc:iso(row.start),candle_end_utc:iso(row.start+60000),modeled_available_at_utc:iso(row.start+120000),close_usdc_per_sol:row.close,low_usdc_per_sol:row.low,high_usdc_per_sol:row.high,high_micro_usdc_per_sol:String(Math.ceil(row.high*1e6)),low_micro_usdc_per_sol:String(Math.floor(row.low*1e6)),source_sha256:expectedSha256,source_class:'RETROSPECTIVE_CANDLE',original_provider_delivery_proven:false};
}
export function modelHistoricalCurve({pair,fx,tickUtc,amountMicro='50000000',networkFeeLamports='1005000',feeBufferBps='25'}={}){
 const tick=ms(tickUtc),at=ms(pair?.source_time),fxt=ms(fx?.modeled_available_at_utc);
 if(!Number.isFinite(tick)||!Number.isFinite(at)||at+60000>=tick||tick-at>600000||!Number.isFinite(fxt)||fxt>=tick||tick-fxt>600000||fx.pair!=='SOL-USDC')throw Error('STALE_OR_FUTURE_MODEL_INPUT');
 const s=pair.asof_event_state;const x=u(s.virtual_sol),y=u(s.virtual_token),rs=u(s.real_sol),rt=u(s.real_token);
 const high=u(fx.high_micro_usdc_per_sol),low=u(fx.low_micro_usdc_per_sol),budget=u(amountMicro),net=u(networkFeeLamports);
 const protocol=u(pair.fee_observation.protocol_bps),creator=u(pair.fee_observation.creator_bps),buffer=u(feeBufferBps);
 if(!x||!y||!rs||!rt||rs>x||rt>y||!low||high<low||budget!==50000000n||protocol+creator+buffer>=B||buffer>1000n)throw Error('INVALID_MODEL_STATE_OR_POLICY');
 const maxSol=budget*L/high;
 if(maxSol<=net)throw Error('INSUFFICIENT_MODEL_BUDGET');
 const fees=a=>({protocol:ceil(a*protocol,B),creator:ceil(a*creator,B),buffer:ceil(a*buffer,B)});
 const total=f=>f.protocol+f.creator+f.buffer;
 let lo=0n,hi=maxSol-net;
 while(lo<hi){const m=(lo+hi+1n)/2n;if(m+total(fees(m))+net<=maxSol)lo=m;else hi=m-1n;}
 const curveIn=lo,entryFees=fees(curveIn);
 // Constant-product, integer conservative rounding; no liquidity extrapolation.
 const tokens=y*curveIn/(x+curveIn);
 if(!tokens||tokens>=rt)throw Error('INSUFFICIENT_REAL_TOKEN_RESERVE');
 const spent=curveIn+total(entryFees)+net;
 const postX=x+curveIn,postY=y-tokens;
 const grossExit=postX*tokens/(postY+tokens);
 if(grossExit>rs+curveIn)throw Error('INSUFFICIENT_REAL_SOL_RESERVE');
 const exitFees=fees(grossExit);
 if(grossExit<=total(exitFees)+net)throw Error('NONPOSITIVE_EXIT');
 const exitLamports=grossExit-total(exitFees)-net;
 const spentMicro=ceil(spent*high,L),receivedMicro=exitLamports*low/L;
 const cost=spentMicro-receivedMicro;
 const impactBps=ceil((curveIn*y-tokens*x)*B,tokens*x);
 const fmt=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,String(v)]));
 return {kind:'R29_HISTORICAL_CURVE_INDICATIVE_MODEL',mint:pair.mint,pool:pair.pool,tick_utc:tickUtc,reserve_observed_at_utc:pair.source_time,reserve_age_seconds:(tick-at)/1000,source_signature:pair.source_signature,source_sha256:pair.source_sha256,fx_source_sha256:fx.source_sha256,budget_micro_usdc:String(budget),entry:fmt({curve_input_lamports:curveIn,token_output_raw:tokens,token_decimals:6,network_fee_lamports:net,total_spent_lamports:spent,spent_micro_usdc:spentMicro,price_impact_bps:impactBps,...Object.fromEntries(Object.entries(entryFees).map(([k,v])=>[k+'_fee_lamports',v]))}),immediate_exit_after_own_buy:fmt({gross_lamports:grossExit,net_lamports:exitLamports,received_micro_usdc:receivedMicro,network_fee_lamports:net,...Object.fromEntries(Object.entries(exitFees).map(([k,v])=>[k+'_fee_lamports',v]))}),roundtrip_model_cost_micro_usdc:String(cost),observed_protocol_bps:String(protocol),observed_creator_bps:String(creator),assumed_extra_fee_buffer_bps:String(buffer),model_status:'INDICATIVE_ONLY',risk_status:'UNKNOWN_TOKEN_AUTHORITIES_AND_TRANSFER_RULES',pool_state_at_tick_proven:false,fee_schedule_at_size_proven:false,exact_executable_quote:false,model_trade_authorized:false,live_order_authorized:false,actual_gpt_decision:false,orders:0};
}
