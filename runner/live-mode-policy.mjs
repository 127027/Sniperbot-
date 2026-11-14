// Fail-closed LIVE mode contract. A visible toggle is NOT an execution adapter.
// No persistence or agent signal may enable live cryptocurrency purchases.
export const LIVE_MODE_SCHEMA='sniper_live_trading_gate.v1';
export function readLiveTradingGate(){
 return Object.freeze({
  schema:LIVE_MODE_SCHEMA,
  mode:'LOCKED',
  enabled:false,
  can_enable:false,
  can_disable:true,
  wallet_signing_enabled_for_swaps:false,
  agent_auto_execution_enabled:false,
  paypal_checkout_enabled:false,
  reason:'LIVE_SWAP_EXECUTOR_AND_PAYMENT_PROVIDERS_NOT_APPROVED',
  message:'Echtgeldhandel ist nicht freigegeben. Der Schalter kann erst nach unabhängiger Sicherheits- und Ausführungsabnahme aktiviert werden.'
 });
}
export function requestLiveTradingMode(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||
  Object.keys(body).sort().join(',')!=='enabled'||
  typeof body.enabled!=='boolean')
  throw Error('INVALID_LIVE_MODE_REQUEST');
 if(body.enabled===true)
  throw Error('LIVE_TRADING_NOT_AVAILABLE');
 return readLiveTradingGate();
}
