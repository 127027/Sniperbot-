// Local PnL history: cash flows subtracted, not advertised as time-weighted return.
export function performance(account){
 const l=account.ledger??{},trades=l.trades??[],exits=trades.filter(t=>(t.action??t.side)==='SELL'&&Number.isFinite(t.realized_pnl_eur));
 const wins=exits.filter(t=>t.realized_pnl_eur>0).length,losses=exits.filter(t=>t.realized_pnl_eur<0).length;
 const flows=account.funding_events??[],deposits=(l.initial_cash_eur??0)+flows.reduce((n,f)=>n+(f.kind==='PAPER_DEPOSIT'?f.amount_cents/100:0),0);
 const withdrawals=flows.reduce((n,f)=>n+(f.kind==='PAPER_WITHDRAW'?f.amount_cents/100:0),0);
 const total=account.summary?.total_pnl_eur??(Number.isFinite(account.summary?.net_liquidation_value_eur)?account.summary.net_liquidation_value_eur-deposits+withdrawals:null);
 const history=(account.performance_history??[]).filter(x=>Number.isFinite(x.pnl_eur)&&Number.isFinite(Date.parse(x.at_utc)));
 return {wins,losses,flat:exits.length-wins-losses,exits:exits.length,win_rate:exits.length?wins/exits.length*100:null,deposits,withdrawals,total,return_on_deposits:deposits>0&&Number.isFinite(total)?total/deposits*100:null,history};
}
