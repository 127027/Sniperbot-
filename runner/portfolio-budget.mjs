// V0.6 paper-only budget policy. Values shown in UI are:
// first number = preferred exploratory trade (NOT a hard order minimum);
// second number = TOTAL cost-basis exposure cap across currently open trades.
// Every single paper entry requires at least 50 test USDC. Uncommitted cash
// and realized sale proceeds may be reused; already-open entry cost stays reserved.
// Never size from an uncalibrated percentage or force all funds into positions.
export const MIN_PAPER_ENTRY_USDC=50;
// Signer-bound GPT-only virtual entries may be smaller; this does not relax
// manual, legacy-agent or Echtgeld limits. The 1%-equity cap still applies.
export const MIN_GPT_PAPER_ENTRY_USDC=5;
const cents=n=>Math.floor((n+1e-9)*100)/100;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const isMoney=x=>finite(x)&&x>=MIN_PAPER_ENTRY_USDC&&x<=5000&&
 Math.abs(x*100-Math.round(x*100))<1e-5;
// V5.7: USER chooses a single stake. Existing persisted ledgers without this
// field adopt the 50-TEST-USDC default, without altering cash or positions.
export function userCoinStake(state,{real=false}={}){
 const x=real?state?.realCoinStakeUsdc:state?.paperCoinStakeUsdc;
 return x===undefined?50:isMoney(x)?x:null;
}
export function portfolioBudget(state,{gptSignedPaper=false}={}){
 const positions=Array.isArray(state?.positions)?state.positions:[];
 const badPositions=positions.some(p=>!finite(p?.amountUsdc)||p.amountUsdc<0);
 const reserved=badPositions?null:cents(positions.reduce((sum,p)=>sum+p.amountUsdc,0));
 const cash=(state?.cashUsdc??0)+(state?.cashEur??0);
 // The authenticated GPT-Paper route uses actual uncommitted virtual cash.
 // The retired overall-position cap (SET_RANGE) must NOT suppress user-fixed
 // 50 USDC orders. Non-GPT legacy paths keep their existing cap unchanged.
 const cap=gptSignedPaper&&reserved!==null&&finite(cash)&&cash>=0?
    cents(reserved+cash):
    finite(state?.portfolioBudgetUsdc)&&state.portfolioBudgetUsdc>0?
     state.portfolioBudgetUsdc:state?.maxTrade;
 const preferred=gptSignedPaper?userCoinStake(state):state?.minTrade;
 if(!finite(cap)||cap<=0||!finite(preferred)||preferred<=0||
    (!gptSignedPaper&&preferred>cap))
  return {valid:false,cap_test_usdc:null,preferred_test_usdc:null,
    reserved_test_usdc:null,free_to_allocate_test_usdc:0,minimum_entry_test_usdc:MIN_PAPER_ENTRY_USDC};
 if(badPositions)
  return {valid:false,cap_test_usdc:cap,preferred_test_usdc:preferred,
    reserved_test_usdc:null,free_to_allocate_test_usdc:0,minimum_entry_test_usdc:MIN_PAPER_ENTRY_USDC};
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
export function isWithinPortfolioBudget(state,amount,{gptSignedPaper=false}={}){
 const b=portfolioBudget(state,{gptSignedPaper});
 return b.valid&&finite(amount)&&amount>=
    (gptSignedPaper?MIN_GPT_PAPER_ENTRY_USDC:MIN_PAPER_ENTRY_USDC)&&
   Math.abs(amount*100-Math.round(amount*100))<1e-5&&
   amount<=b.free_to_allocate_test_usdc&&amount<=b.cap_test_usdc;
}
