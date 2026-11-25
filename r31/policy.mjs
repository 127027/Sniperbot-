export const SCHEMA = 'r31.paper.controls.v1';
const money = (x, min=0) => Number.isSafeInteger(x) && x>=min && x<=100_000_000;
export function validateControls(c) {
 if(!c || c.schema!==SCHEMA || c.mode!=='PAPER_ONLY' || !Number.isSafeInteger(c.revision) || c.revision<1 || typeof c.allow_new_buys!=='boolean' || !money(c.max_invest_cents) || !money(c.stake_cents,1) || !Number.isFinite(Date.parse(c.updated_at_utc))) throw Error('INVALID_CONTROLS');
 if(Object.keys(c).sort().join(',')!=='allow_new_buys,max_invest_cents,mode,revision,schema,stake_cents,updated_at_utc') throw Error('UNEXPECTED_CONTROL_FIELD');
 return c;
}
export function nextControls(previous, input, now=new Date().toISOString()) {
 validateControls(previous);
 if(!input || Object.keys(input).sort().join(',')!=='allow_new_buys,expected_revision,max_invest_cents,stake_cents') throw Error('INVALID_REQUEST');
 if(input.expected_revision!==previous.revision) throw Error('REVISION_CONFLICT');
 return validateControls({schema:SCHEMA,revision:previous.revision+1,mode:'PAPER_ONLY',allow_new_buys:input.allow_new_buys,max_invest_cents:input.max_invest_cents,stake_cents:input.stake_cents,updated_at_utc:now});
}
function cents(x) { if(!Number.isFinite(x)||x<0) throw Error('INVALID_LEDGER'); const c=Math.round(x*100); if(!money(c)||Math.abs(c/100-x)>1e-7) throw Error('INVALID_LEDGER'); return c; }
export function capacity(c,ledger) {
 validateControls(c);
 if(!ledger || !Array.isArray(ledger.positions)) throw Error('INVALID_LEDGER');
 const cash=cents(ledger.cash_eur);
 const open=ledger.positions.reduce((s,p)=>s+cents(p.cost_basis_eur),0);
 if(!Number.isSafeInteger(open)) throw Error('INVALID_LEDGER');
 const remaining=Math.min(cash,Math.max(0,c.max_invest_cents-open));
 return {cash_cents:cash,open_cost_cents:open,additional_budget_cents:remaining,max_new_positions:c.allow_new_buys?Math.floor(remaining/c.stake_cents):0,over_limit:open>c.max_invest_cents};
}
// Pure PAPER admission guard. Re-evaluate against updated ledger before EACH proposed buy.
export function admitBuy(c, ledger, order) {
 const cap=capacity(c,ledger);
 if(!order || typeof order.chain!=='string'||!order.chain.trim()||typeof order.contract!=='string'||!order.contract.trim())return {ok:false,reason:'IDENTITY_REQUIRED'};
 if(order.control_revision!==c.revision)return {ok:false,reason:'STALE_CONTROLS'};
 if(!c.allow_new_buys)return {ok:false,reason:'PAUSED'};
 if(order.amount_cents!==c.stake_cents)return {ok:false,reason:'STAKE_MISMATCH'};
 const id=(chain,contract)=>chain.toLowerCase()+':'+(/^(ethereum|base|bsc|bnb chain|arbitrum|polygon|optimism|avalanche)$/i.test(chain)?contract.toLowerCase():contract);
 if(ledger.positions.some(p=>typeof p.chain!=='string'||typeof p.contract!=='string'))return {ok:false,reason:'UNKNOWN_POSITION_IDENTITY'};
 if(ledger.positions.some(p=>id(p.chain,p.contract)===id(order.chain,order.contract)))return {ok:false,reason:'POSITION_EXISTS'};
 if(cap.additional_budget_cents<c.stake_cents)return {ok:false,reason:'INSUFFICIENT_CAPACITY'};
 return {ok:true,amount_cents:c.stake_cents};
}
