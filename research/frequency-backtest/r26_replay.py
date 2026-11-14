#!/usr/bin/env python3
"""R26: retrospective four-frequency PRICE-ONLY baseline.

This is NOT a historical OpenAI/news replay and is NOT a record of actual fills.
Orders use the next hourly candle OPEN as a modeled price after inspecting
only previous fully CLOSED candles. No DEX sellability is established.
"""
import argparse
from datetime import datetime,timezone
from hashlib import sha256
import json,math
from pathlib import Path

HOUR_MS=3600000
DAY_HOURS=24
START_MS=int(datetime(2026,10,30,tzinfo=timezone.utc).timestamp()*1000)
END_MS=int(datetime(2026,11,14,tzinfo=timezone.utc).timestamp()*1000)
HOURS=(END_MS-START_MS)//HOUR_MS
FREQUENCIES=(1,4,12,24)
CAPITAL=5000.0
MIN_ORDER=50.0
MAX_ORDER=5000.0
MAX_OPEN=5
FEE=.01
SLIPPAGE=.002
SIGNAL_SCORE=80
REQUIRED_WARMUP=25
def timestamp(t):
    return datetime.fromtimestamp(t/1000,timezone.utc).isoformat().replace("+00:00","Z")
def r(x):return round(x,8)
def asof_signal(past):
    """Computation sees only bars that CLOSED before the hypothetical decision."""
    if len(past)<REQUIRED_WARMUP:return None
    last=past[-1];r1=last["c"]/past[-2]["c"]-1
    r6=last["c"]/past[-7]["c"]-1
    r24=last["c"]/past[-25]["c"]-1
    volume6=sum(p["qv"] for p in past[-6:])
    prev6=sum(p["qv"] for p in past[-12:-6])
    volume24=sum(p["qv"] for p in past[-24:])
    vol_ratio=volume6/max(prev6,1)
    score=56
    if r6>.015:score+=14
    if r6>.04:score+=10
    if r24>0:score+=10
    if r1>0:score+=6
    if vol_ratio>1.1:score+=8
    if vol_ratio>1.6:score+=6
    if volume24>1000000:score+=5
    if r6<-.03:score-=25
    if r24<-.08:score-=12
    score=min(100,max(0,score))
    return {"score":score,"r1_pct":r(100*r1),"r6_pct":r(100*r6),
            "r24_pct":r(100*r24),"volume6_usdt":r(volume6),
            "volume24_usdt":r(volume24),"vol6_ratio":r(vol_ratio),
            "eligible":score>=SIGNAL_SCORE and r6>.015 and r24>0 and volume6>=50000}

def eligible_data(data):
    if data.get("schema")!="sniper_r26_binance_spot_hourly.v1" or (
        data.get("start_utc"),data.get("end_exclusive_utc"))!=(
        "2026-10-30T00:00:00Z","2026-11-14T00:00:00Z"):
        raise ValueError("R26_WRONG_SOURCE_SCHEMA_OR_WINDOW")
    if data.get("quote_currency")!="USDT":
        raise ValueError("R26_QUOTE_CURRENCY_MISMATCH")
    source={}
    for symbol in data["predeclared_symbols"]:
        item=data["symbols"][symbol]
        if item.get("status")!="COMPLETE":continue
        bars=item["bars"]
        if len(bars)!=HOURS+data["warmup_hours"]:continue
        epoch0=START_MS-data["warmup_hours"]*HOUR_MS
        if any(b["t"]!=epoch0+i*HOUR_MS for i,b in enumerate(bars)):continue
        if any(not all(isinstance(b[k],(int,float)) and math.isfinite(b[k]) for k in
            ("o","h","l","c","qv")) or b["o"]<=0 or b["c"]<=0 for b in bars):continue
        digest=sha256(json.dumps(bars,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        if digest!=item["sha256_normalized"]:continue
        source[symbol]=bars
    return source

def evaluate(data,frequency):
    if frequency not in FREQUENCIES:raise ValueError("INVALID_FREQUENCY")
    symbols=eligible_data(data)
    if len(symbols)<4:
        return {"frequency_per_day":frequency,"status":"UNTESTABLE_MARKET_COVERAGE",
                "available_symbols":list(symbols),
                "scheduled_analysis_epochs":HOURS*frequency//24,
                "completed_analysis_epochs":0,"trades":[]}
    # Absolute capital base is capped at 5000, independent of realized profits.
    cash=CAPITAL
    positions={}
    trades=[]
    entries=[]
    epochs=[]
    costs=0.0
    high_equity=CAPITAL
    worst_dd=0.0
    position_peak=0.0
    open_cost_peak=0.0
    frequency_step=24//frequency
    def equity(mark_index):
        total=cash
        for symbol,p in positions.items():
            price=symbols[symbol][mark_index]["c"]
            total+=p["qty"]*price*(1-SLIPPAGE)*(1-FEE)
        return total
    def sell(symbol,bar,now,reason):
        nonlocal cash,costs
        p=positions.pop(symbol)
        gross=p["qty"]*bar["o"]
        exit_slip=gross*SLIPPAGE
        exit_fee=(gross-exit_slip)*FEE
        received=gross-exit_slip-exit_fee
        cash+=received
        costs+=exit_slip+exit_fee
        profit=received-p["spent"]
        trades.append({
            "symbol":symbol,"entry_at_utc":timestamp(p["entry_at"]),
            "exit_at_utc":timestamp(now),"entry_hour_open":r(p["entry_mid"]),
            "exit_hour_open":r(bar["o"]),"size_test_usdc":r(p["spent"]),
            "exit_proceeds_test_usdc":r(received),"net_pnl_test_usdc":r(profit),
            "net_return_pct":r(profit/p["spent"]*100),"reason":reason,
            "entry_fee_test_usdc":r(p["entry_fee"]),
            "entry_slippage_test_usdc":r(p["entry_slip"]),
            "exit_fee_test_usdc":r(exit_fee),"exit_slippage_test_usdc":r(exit_slip),
            "simulated_not_real_fill":True,
            "execution_evidence":"HOURLY_OPEN_MODELED_BINANCE_SPOT_PROXY_NOT_DEX"})
    for hour in range(HOURS):
        now=START_MS+hour*HOUR_MS
        ix=hour+data["warmup_hours"]
        previous=ix-1
        for symbol,p in list(positions.items()):
            prev_close=symbols[symbol][previous]["c"]
            p["peak_close"]=max(p["peak_close"],prev_close)
            stop=prev_close<=p["entry_mid"]*.88
            trail=(p["peak_close"]>=p["entry_mid"]*1.05 and
                   prev_close<=p["peak_close"]*.83)
            if stop or trail:
                sell(symbol,symbols[symbol][ix],now,"STOP_LOSS" if stop else "TRAILING_EXIT")
        if hour%frequency_step==0:
            assessed=[]
            for symbol,bars in symbols.items():
                # The observation cutoff is exactly now. A candle with start>=now
                # has NOT closed and must never affect this decision.
                signal=asof_signal(bars[max(0,ix-49):ix])
                if signal is not None:assessed.append((symbol,signal))
            # Explicit SELL/HOLD decisions at this frequency, one shared strategy.
            for symbol,signal in assessed:
                if symbol not in positions:continue
                p=positions[symbol]
                age=(now-p["entry_at"])/HOUR_MS
                if age>=6 and (signal["r6_pct"]< -3 or
                                  (age>=72 and signal["r6_pct"]<0)):
                    sell(symbol,symbols[symbol][ix],now,"SCHEDULED_MOMENTUM_EXIT")
            ranked=sorted([(s,signal) for s,signal in assessed if signal["eligible"]],
                          key=lambda x:(-x[1]["score"],-x[1]["r6_pct"],x[0]))
            bought=0
            for symbol,signal in ranked:
                if bought>=2 or symbol in positions or len(positions)>=MAX_OPEN:continue
                invested=sum(p["spent"] for p in positions.values())
                remaining=max(0,CAPITAL-invested)
                limit=min(cash,remaining,MAX_ORDER)
                size=min(limit,CAPITAL*(.1+(signal["score"]-80)*.0125))
                size=round(size,2)
                if size<MIN_ORDER:continue
                bar=symbols[symbol][ix]
                if bar["o"]<=0:continue
                # Never inspect future candle volume/high/low/close as a decision input.
                size=min(round(size,2),round(remaining,2))
                entry_fee=size*FEE
                entry_after_fee=size-entry_fee
                entry_slip=entry_after_fee*SLIPPAGE/(1+SLIPPAGE)
                qty=entry_after_fee/(bar["o"]*(1+SLIPPAGE))
                if qty<=0:continue
                positions[symbol]={"entry_at":now,"entry_mid":bar["o"],
                    "spent":size,"qty":qty,"entry_fee":entry_fee,
                    "entry_slip":entry_slip,"peak_close":bar["o"]}
                cash-=size
                costs+=entry_fee+entry_slip
                entries.append({"symbol":symbol,"at_utc":timestamp(now),
                    "size_test_usdc":r(size),"score_0_100":signal["score"],
                    "r6_pct_asof":signal["r6_pct"],"r24_pct_asof":signal["r24_pct"],
                    "modeled_hourly_open":r(bar["o"]),
                    "execution_evidence":"HOURLY_OPEN_MODELED_BINANCE_SPOT_PROXY_NOT_DEX"})
                bought+=1
            epochs.append({"at_utc":timestamp(now),"scanned_symbols":len(assessed),
                "top_research_candidates":[{"symbol":s,"score":sig["score"],
                    "six_hour_return_pct":sig["r6_pct"],
                    "eligible":sig["eligible"]} for s,sig in
                    sorted(assessed,key=lambda p:(-p[1]["score"],p[0]))[:4]],
                "paper_positions":len(positions),"paper_cash_test_usdc":r(cash),
                "mode":"PRICE_ONLY_NON_AI_HISTORICAL_PROXY"})
        # Equity uses completed previous candle, never the candle being processed.
        current_eq=equity(previous)
        high_equity=max(high_equity,current_eq)
        worst_dd=max(worst_dd,(high_equity-current_eq)/high_equity*100)
        position_peak=max(position_peak,len(positions))
        open_cost_peak=max(open_cost_peak,sum(p["spent"] for p in positions.values()))
        if cash< -1e-6 or open_cost_peak>CAPITAL+1e-6:raise ValueError("R26_BUDGET_BREACH")
    end_index=data["warmup_hours"]+HOURS-1
    remaining=[{"symbol":s,"entry_at_utc":timestamp(p["entry_at"]),
        "cost_test_usdc":r(p["spent"]),"qty":r(p["qty"]),
        "mark_hour_close":r(symbols[s][end_index]["c"]),
        "unrealized_net_after_modeled_exit_test_usdc":
        r(p["qty"]*symbols[s][end_index]["c"]*(1-SLIPPAGE)*(1-FEE)-p["spent"])}
        for s,p in positions.items()]
    final_equity=equity(end_index)
    realized_pnl=sum(t["net_pnl_test_usdc"] for t in trades)
    unrealized_pnl=sum(p["unrealized_net_after_modeled_exit_test_usdc"] for p in remaining)
    # The liquidation valuation of open positions includes estimated future exit
    # costs; unrealized exits are NOT counted as closed trades.
    return {"frequency_per_day":frequency,"status":"PRICE_ONLY_BASELINE_NOT_FULL_AI",
        "scheduled_analysis_epochs":HOURS*frequency//24,
        "completed_analysis_epochs":len(epochs),
        "available_symbols":list(symbols),
        "initial_test_usdc":CAPITAL,"ending_cash_test_usdc":r(cash),
        "equity_if_liquidated_test_usdc":r(final_equity),
        "net_pnl_test_usdc":r(final_equity-CAPITAL),
        "return_pct":r((final_equity/CAPITAL-1)*100),
        "realized_pnl_test_usdc":r(realized_pnl),
        "unrealized_net_pnl_test_usdc":r(unrealized_pnl),
        "realized_trade_count":len(trades),"buy_count":len(entries),
        "wins":sum(t["net_pnl_test_usdc"]>0 for t in trades),
        "losses":sum(t["net_pnl_test_usdc"]<0 for t in trades),
        "break_even":sum(t["net_pnl_test_usdc"]==0 for t in trades),
        "max_drawdown_pct":r(worst_dd),
        "max_concurrent_positions":int(position_peak),
        "max_open_cost_test_usdc":r(open_cost_peak),
        "total_modeled_fees_and_slippage_test_usdc":r(costs),
        "best_closed_trade":max(trades,key=lambda t:t["net_pnl_test_usdc"]) if trades else None,
        "worst_closed_trade":min(trades,key=lambda t:t["net_pnl_test_usdc"]) if trades else None,
        "open_positions":remaining,"buys":entries,"sells":trades,
        "decisions":epochs}

def run(data):
    valid=eligible_data(data)
    out=[evaluate(data,f) for f in FREQUENCIES]
    report={"schema":"sniper_r26_frequency_comparison.v1",
        "period":{"start_utc":"2026-10-30T00:00:00Z",
                  "end_exclusive_utc":"2026-11-14T00:00:00Z","full_days":15},
        "test_type":"DETERMINISTIC_PRICE_ONLY_BASELINE_NOT_ACTUAL_AI_NEWS",
        "not_claimed":["REAL_CHATGPT_ASOF_NEWS_ANALYSIS","COMPLETE_MEMECOIN_UNIVERSE",
          "HISTORICALLY_EXECUTABLE_DEX_TRADES","SELLABILITY_PROOF","TRUE_USDC_PNL",
          "BACKTESTED_LIVE_AI_INFERENCE"],
        "source":"Binance SPOT USDT 1h OHLCV, fixed predeclared cohort",
        "predeclared_symbols":data["predeclared_symbols"],
        "complete_candle_symbols":list(valid),
        "source_coverage_pct":r(100*len(valid)/len(data["predeclared_symbols"])),
        "decision_schedule_comparison":[
            {"daily_analyses":f,"epochs":f*15} for f in FREQUENCIES],
        "total_scheduled_epochs":sum(f*15 for f in FREQUENCIES),
        "trade_assumptions":{"paper_only":True,"total_max_open_cost_test_usdc":5000,
          "per_trade_min_test_usdc":50,"per_trade_max_test_usdc":5000,
          "fee_each_side":FEE,"slippage_each_side":SLIPPAGE,
          "clock":"Use bars closed BEFORE decision time; simulate fill at next 1h bar open",
          "holding_risk":"Identical hourly close-only stop/trail evaluation for all frequencies",
          "usdc_note":"Provider is USDT-quoted; 1 USDT=1 TEST-USDC proxy, not verified currency conversion"},
        "runs":[{k:v for k,v in x.items() if k not in ("buys","sells","decisions")}
                for x in out]}
    testable=[p for p in out if p["status"]=="PRICE_ONLY_BASELINE_NOT_FULL_AI"]
    if len(testable)==4:
        ranked=sorted(testable,key=lambda q:q["net_pnl_test_usdc"],reverse=True)
        report["winner_in_price_only_baseline"]=ranked[0]["frequency_per_day"]
        report["caution"]="Only a 15-day market-price proxy; not evidence of optimal AI frequency."
    else:
        report["winner_in_price_only_baseline"]=None
        report["caution"]="Insufficient historical 1h coverage; no valid PnL comparison."
    return report,{"schema":"sniper_r26_run_details.v1","runs":out}

def markdown(report):
    txt=["# R26 – 15-day Memecoin analysis frequency comparison",
      "",f"Period: {report['period']['start_utc']} to {report['period']['end_exclusive_utc']} (exclusive).",
      "","> IMPORTANT: This is a **price-only retrospective baseline**, NOT the central",
      "> ChatGPT historical-news strategy. Simulated open-bar fills are not verified trades.",
      "> The provider quotes in USDT; reported TEST-USDC is a 1:1 accounting proxy.",
      "","| Analyses/day | Sessions | Modeled ending equity | Net PnL | Return | Closed trades | Win / Loss | Max DD | Fees+slippage |",
      "|---:|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for row in report["runs"]:
        if row["status"]!="PRICE_ONLY_BASELINE_NOT_FULL_AI":
            txt.append(f"| {row['frequency_per_day']} | {row['scheduled_analysis_epochs']} | N/A | N/A | N/A | N/A | N/A | N/A | N/A |")
        else:
            txt.append(f"| {row['frequency_per_day']} | {row['completed_analysis_epochs']} | {row['equity_if_liquidated_test_usdc']:.2f} | {row['net_pnl_test_usdc']:+.2f} | {row['return_pct']:+.2f}% | {row['realized_trade_count']} | {row['wins']} / {row['losses']} | {row['max_drawdown_pct']:.2f}% | {row['total_modeled_fees_and_slippage_test_usdc']:.2f} |")
    txt += ["",f"Historical 1h data coverage: {len(report['complete_candle_symbols'])}/{len(report['predeclared_symbols'])} fixed pairs.",
     "","**Not proven:** historical meme discovery, as-of news/social coverage, on-chain contract checks, DEX executable quotes, real fills or statistically robust frequency advantage.",
     "","Models: market proxy score derived only from previous closed bars; 1% modeled exchange fee plus 0.2% modeled slip **each side**, identical hourly risk exits in all four runs.",
     "","Start risk budget 5,000; no margin, never allocate over 5,000 total open cost; gains cannot raise the at-risk initial cap.",
     "","Open holdings are valued at the final hour's close after **hypothetical** liquidation charges, not claimed as actual SELL orders.",
     "",f"Baseline winner (not AI proof): {report['winner_in_price_only_baseline'] or 'UNDETERMINED'} analysis sessions/day.",
     "","Source manifests with SHA256 are in the run artifact. Never reuse current market data as the 2026-10-30 decision input."]
    return "\n".join(txt)+"\n"

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--source",required=True)
    ap.add_argument("--output-dir",default="r26-results")
    args=ap.parse_args()
    data=json.loads(Path(args.source).read_text(encoding="utf8"))
    report,details=run(data)
    target=Path(args.output_dir);target.mkdir(parents=True,exist_ok=True)
    (target/"summary.json").write_text(json.dumps(report,indent=2,ensure_ascii=False)+"\n")
    (target/"details.json").write_text(json.dumps(details,separators=(',',':'),ensure_ascii=False)+"\n")
    (target/"REPORT.md").write_text(markdown(report),encoding="utf8")
    manifest={s:{k:v for k,v in x.items() if k!="bars"} for s,x in data["symbols"].items()}
    (target/"sources-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print("R26_RESULTS",json.dumps({"coverage":report["source_coverage_pct"],
      "winner":report["winner_in_price_only_baseline"],
      "frequency_summary":[{"f":x["frequency_per_day"],"status":x["status"],
        "end":x.get("equity_if_liquidated_test_usdc"),
        "trades":x.get("realized_trade_count")} for x in report["runs"]]}))
if __name__=="__main__":main()
