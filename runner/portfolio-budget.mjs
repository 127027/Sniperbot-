// V0.6 paper-only budget policy. Values shown in UI are:
// first number = preferred exploratory trade (NOT a hard order minimum);
// second number = TOTAL cost-basis exposure cap across currently open trades.
// Every single paper entry requires at least 50 test USDC. Uncommitted cash
// and realized sale proceeds may be reused; already-open entry cost stays reserved.
// Never size from an uncalibrated percentage or force all funds into positions.
export const MIN_PAPER_ENTRY_USDC=50;
const cents=n=>Math.floor((n+1e-9)*100)/100;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function portfolioBudget(state){
 const cap=finite(state?.portfolioBudgetUsdc)&&state.portfolioBudgetUsdc>0
    ?state.portfolioBudgetUsdc:state?.maxTrade;
 const preferred=state?.minTrade;
 if(!finite(cap)||cap<=0||!finite(preferred)||preferred<=0||preferred>cap)
  return {valid:false,cap_test_usdc:null,preferred_test_usdc:null,
    reserved_test_usdc:null,free_to_allocate_test_usdc:0,minimum_entry_test_usdc:MIN_PAPER_ENTRY_USDC};
 const positions=Array.isArray(state.positions)?state.positions:[];
 if(positions.some(p=>!finite(p?.amountUsdc)||p.amountUsdc<0))
  return {valid:false,cap_test_usdc:cap,preferred_test_usdc:preferred,
    reserved_test_usdc:null,free_to_allocate_test_usdc:0,minimum_entry_test_usdc:MIN_PAPER_ENTRY_USDC};
 const reserved=cents(positions.reduce((sum,p)=>sum+p.amountUsdc,0));
 const cash=(state.cashUsdc??0)+(state.cashEur??0);
 if(!finite(cash)||cash<0)return {valid:false,cap_test_usdc:cap,preferred_test_usdc:preferred,
  reserved_test_usdc:reserved,free_to_allocate_test_usdc:0,minimum_entry_test_usdc:MIN_PAPER_ENTRY_USDC};
 const free=cents(Math.max(0,Math.min(cap-reserved,cash)));
 return {valid:true,cap_test_usdc:cents(cap),preferred_test_usdc:cents(preferred),
  reserved_test_usdc:reserved,free_to_allocate_test_usdc:free,
  minimum_entry_test_usdc:MIN_PAPER_ENTRY_USDC};
}
export function allocatePortfolioPaper({state,intent='EXPLORATORY',targetUsdc=null,capacity=Infinity}={}){
 const b=portfolioBudget(state);
 if(!b.valid||!['EXPLORATORY','TARGET','HIGH_CONVICTION'].includes(intent)||
    !(capacity>0)||(!finite(capacity)&&capacity!==Infinity))return 0;
 const available=Math.min(b.free_to_allocate_test_usdc,capacity);
 const requested=intent==='HIGH_CONVICTION'?available:
  intent==='EXPLORATORY'?b.preferred_test_usdc:targetUsdc;
 if(!finite(requested)||requested<MIN_PAPER_ENTRY_USDC)return 0;
 const result=cents(Math.min(requested,available));
 return result>=MIN_PAPER_ENTRY_USDC?result:0;
}
export function isWithinPortfolioBudget(state,amount){
 const b=portfolioBudget(state);
 return b.valid&&finite(amount)&&amount>=MIN_PAPER_ENTRY_USDC&&
   Math.abs(amount*100-Math.round(amount*100))<1e-5&&
   amount<=b.free_to_allocate_test_usdc&&amount<=b.cap_test_usdc;
}
