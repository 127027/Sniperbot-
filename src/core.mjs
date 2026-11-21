// R29 clean-room virtual exchange: no blockchain transactions, wallet or legacy bot imports.
import { createHash, randomBytes } from 'node:crypto';
import { tokenValid, poolValid, exactPoolUrl, parsePoolUrl } from './market-evidence.mjs';
export const CHAINS = new Set(['solana', 'ethereum', 'base', 'bsc']);
export const DEFAULT_POLICY = Object.freeze({
  startingBalance: 5000, entryAmount: 50, maxPositions: 30,
  maxQuoteAgeMs: 90_000, maxOrderAgeMs: 300_000,
  maxQuoteDivergencePct: 3, minLiquidityUsd: 5000,
  maxLiquidityUtilizationPct: 1, feeBps: 75,
  simulatedSpreadBps: 40, simulatedImpactMultiplier: 0.5,
});
export class Reject extends Error {
  constructor(code, message) { super(message); this.name = 'Reject'; this.code = code; }
}
const fail = (code, message) => { throw new Reject(code, message); };
const positive = n => typeof n === 'number' && Number.isFinite(n) && n > 0;
const round = n => Math.round((n + Number.EPSILON) * 1e8) / 1e8;
const ident = v => typeof v === 'string' && /^[a-zA-Z0-9._:-]{2,180}$/.test(v);
const safeId = v => typeof v === 'string' && /^[a-zA-Z0-9_-]{8,80}$/.test(v);
export const marketKey = c => `${c.chain}:${c.contract}:${c.pool}`;
export function gitBlobSha(text) {
  const data = Buffer.from(text, 'utf8');
  return createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
}
export function newState(policy = DEFAULT_POLICY) {
  return { schema: 1, mode: 'PAPER_ONLY', clientId: `client-${randomBytes(8).toString('hex')}`, cash: policy.startingBalance, positions: {},
    processed: {}, receipts: {}, nextSequence: 1, startedAt: new Date().toISOString() };
}
export function inspectOrder(order, state, nowMs, policy = DEFAULT_POLICY) {
  if (!order || typeof order !== 'object' || Array.isArray(order)) fail('INVALID_ORDER', 'Order must be an object');
  if (!safeId(order.id)) fail('INVALID_ORDER_ID', 'Order ID must be unique and filename-safe');
  if (order.mode !== 'PAPER') fail('LIVE_DISABLED', 'Only PAPER orders are accepted');
  if (!['BUY', 'SELL'].includes(order.action)) fail('INVALID_ACTION', 'Only BUY / SELL may execute');
  if (order.authority !== 'dot-4-strategy') fail('UNAUTHORIZED_STRATEGY', 'Order not issued by Dot 4 strategy');
  if (!Array.isArray(order.dots) || !['dot-2-discovery','dot-3-risk','dot-4-strategy'].every(x=>order.dots.includes(x)))
    fail('INCOMPLETE_DOT_CHAIN','Discovery, risk and strategy attestations required');
  if (typeof order.reason !== 'string' || order.reason.trim().length < 10) fail('MISSING_REASON','Explain decision');
  const createdAt=Date.parse(order.created_at), expiresAt=Date.parse(order.expires_at);
  if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt) || createdAt > nowMs + 10_000)
    fail('INVALID_ORDER_TIME','Invalid timestamp');
  if (createdAt < nowMs-policy.maxOrderAgeMs || expiresAt < nowMs || expiresAt <= createdAt)
    fail('ORDER_EXPIRED','Order is too old or expired');
  const c=order.coin;
  if (!c || !CHAINS.has(c.chain) || !ident(c.contract) || !ident(c.pool) || !ident(c.symbol))
    fail('INVALID_COIN_ID','Chain, contract, symbol and pool must be explicit');
  if (!Array.isArray(order.quotes) || order.quotes.length < 2)
    fail('MISSING_QUOTES','Two independent quote sources required');
  const indicative=order.quote_quality==='INDICATIVE_WEB_ONLY';
  if(order.quote_quality!==undefined&&!['FRESH_WEB','INDICATIVE_WEB_ONLY'].includes(order.quote_quality))
    fail('INVALID_QUOTE_QUALITY','Unsupported quote quality');
  if(indicative && (!tokenValid(c.chain,c.contract) || !poolValid(c.chain,c.pool,c.pool_kind)))
    fail('INVALID_COIN_ADDRESS','Web paper mode needs full chain-valid contract and pool');
  const ageLimit=indicative?600000:policy.maxQuoteAgeMs;
  const providers=new Set(),domains=new Set(), prices=[], liquidities=[];
  for (const q of order.quotes) {
    if (!q || !ident(q.provider_id) || providers.has(q.provider_id))
      fail('DUPLICATE_QUOTE_SOURCE','Quote sources must be distinct');
    providers.add(q.provider_id);
    if (!positive(q.price_usdc) || !positive(q.liquidity_usdc))
      fail('INVALID_QUOTE','Price or liquidity invalid');
    if(indicative){
      let host;
      try{const u=new URL(q.source_url);if(u.protocol!=='https:')throw Error();host=u.hostname.replace(/^www\./,'');}
      catch{fail('INVALID_SOURCE_URL','Indicative quote needs HTTPS source URL');}
      if(domains.has(host))fail('DUPLICATE_QUOTE_DOMAIN','Two distinct web domains required');
      if(!parsePoolUrl(q.source_url) || !exactPoolUrl(q.source_url,c.chain,c.pool))
        fail('SOURCE_POOL_URL_MISMATCH','Source must be a recognized detail URL of the exact pool');
      domains.add(host);
    }
    if (q.chain!==c.chain || q.contract!==c.contract || q.pool!==c.pool)
      fail('QUOTE_POOL_MISMATCH','Quote references another pool');
    const at=Date.parse(q.observed_at);
    if (!Number.isFinite(at) || at>nowMs+10_000 || at>createdAt+10_000 || nowMs-at>ageLimit)
      fail('STALE_QUOTE','Quote outside freshness window');
    prices.push(q.price_usdc); liquidities.push(q.liquidity_usdc);
  }
  prices.sort((a,b)=>a-b);
  const mid=prices.length/2;
  const refPrice=prices.length%2 ? prices[Math.floor(mid)] : (prices[mid]+prices[mid-1])/2;
  if ((prices.at(-1)-prices[0])/refPrice*100>policy.maxQuoteDivergencePct)
    fail('PRICE_DISAGREEMENT','Quote sources disagree');
  const liquidity=Math.min(...liquidities);
  if (liquidity<policy.minLiquidityUsd) fail('LOW_LIQUIDITY','Insufficient liquidity');
  const key=marketKey(c);
  if (state.processed[order.id]) fail('ALREADY_PROCESSED','Duplicate order');
  if (order.action==='BUY') {
    if (order.amount_test_usdc!==policy.entryAmount)
      fail('INVALID_BUY_SIZE',`Buy must use ${policy.entryAmount} TEST-USDC`);
    if (state.positions[key]) fail('POSITION_EXISTS','Position already open');
    if (Object.keys(state.positions).length>=policy.maxPositions)
      fail('MAX_POSITIONS','Maximum concurrent positions reached');
    if (state.cash + 1e-8 < order.amount_test_usdc)
      fail('INSUFFICIENT_PAPER_CASH','Not enough TEST-USDC');
    if (order.amount_test_usdc/liquidity*100>policy.maxLiquidityUtilizationPct)
      fail('ORDER_TOO_LARGE_FOR_POOL','Position exceeds liquidity cap');
  } else if (!state.positions[key]) fail('POSITION_NOT_FOUND','No matching position');
  return { key, refPrice, liquidity };
}
export function settlePaper(order, previous, timeMs, policy=DEFAULT_POLICY) {
  const state=structuredClone(previous);
  const {key,refPrice,liquidity}=inspectOrder(order,state,timeMs,policy);
  const utilization=order.action==='BUY' ? order.amount_test_usdc/liquidity :
    state.positions[key].quantity*refPrice/liquidity;
  const impact=Math.min(0.03,utilization*policy.simulatedImpactMultiplier);
  const spread=policy.simulatedSpreadBps/10000;
  const executionPrice=refPrice*(order.action==='BUY'?1+spread+impact:Math.max(0.01,1-spread-impact));
  const feeRate=policy.feeBps/10000;
  let receipt;
  if (order.action==='BUY') {
    const amount=order.amount_test_usdc, fee=amount*feeRate;
    const quantity=(amount-fee)/executionPrice;
    state.cash=round(state.cash-amount);
    state.positions[key]={coin:order.coin,quantity,costTestUsdc:amount,
      openedAt:new Date(timeMs).toISOString(),entryPrice:executionPrice,sourceOrderId:order.id};
    receipt={action:'BUY',amount_test_usdc:amount,fee_test_usdc:round(fee),
      quantity,execution_price_usdc:executionPrice};
  } else {
    const position=state.positions[key];
    if (position.quantity*refPrice/liquidity*100>policy.maxLiquidityUtilizationPct)
      fail('EXIT_LIQUIDITY_RISK','Exit too large for pool');
    const gross=position.quantity*executionPrice,fee=gross*feeRate,proceeds=gross-fee;
    state.cash=round(state.cash+proceeds);
    delete state.positions[key];
    receipt={action:'SELL',quantity:position.quantity,proceeds_test_usdc:round(proceeds),
      fee_test_usdc:round(fee),execution_price_usdc:executionPrice,
      realized_pnl_test_usdc:round(proceeds-position.costTestUsdc)};
  }
  const fullReceipt={schema:1,mode:'PAPER',id:order.id,sequence:state.nextSequence++,
    quote_quality:order.quote_quality||'FRESH_WEB',
    quote_verification:'DOT_ASSERTED_NOT_INDEPENDENTLY_VERIFIED',
    status:'PAPER_FILLED',timestamp:new Date(timeMs).toISOString(),coin:order.coin,
    quote_sources:order.quotes.map(q=>q.provider_id),simulated:true,
    pricing_model:'median quotes + modeled spread/impact + fee',
    ...receipt,cash_after_test_usdc:state.cash};
  state.processed[order.id]={status:'PAPER_FILLED',time:fullReceipt.timestamp};
  state.receipts[order.id]={published:false,data:fullReceipt};
  return {state,receipt:fullReceipt};
}
export function rejectPaper(order,previous,code,detail,nowMs) {
  const state=structuredClone(previous);
  if (!safeId(order?.id) || state.processed[order.id]) return {state,receipt:null};
  const receipt={schema:1,mode:'PAPER',id:order.id,status:'PAPER_REJECTED',
    timestamp:new Date(nowMs).toISOString(),reason_code:code,detail:detail.slice(0,300)};
  state.processed[order.id]={status:'PAPER_REJECTED',time:receipt.timestamp};
  state.receipts[order.id]={published:false,data:receipt};
  return {state,receipt};
}
