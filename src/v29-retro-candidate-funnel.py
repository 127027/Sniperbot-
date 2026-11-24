"""R29 V2.9 pure point-in-time RESEARCH candidate funnel.
Never promotes postevent public feature rows into October provider captures,
independent sellability, executable quotes, or buyer/client fills.
"""
from collections import Counter
from datetime import datetime,timezone
import math,re

MINT=re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")
BASE=datetime(2026,10,12,tzinfo=timezone.utc).timestamp()
DANGER_FLAGS=("flag_creator_sold","flag_bundle_dumped",
 "flag_curve_drained","flag_pool_drained","flag_curve_closed_low",
 "flag_serial_rugger_creator","flag_migrate_below_grad")
ALLOWED_COLUMNS=(
 "mint","t","age_s","window","quote_asset","quote_modelled","mayhem",
 "repaired","f_rs","f_n_buys","f_dev_share","f_insider_share",
 "f_bundle_wallets","p_rug_within_300s","p_true_graduation",
 *DANGER_FLAGS)
FUTURE_OR_OUTCOME_COLUMNS=("rugged","graduated","outcome_status",
 "peak_rs","terminal_rs","rug_dt_s","migrate_dt_s",
 "rugged_before_row","migrated_before_row","rug_within_300s_after_row",
 "labels_as_of","launch_t0","capture_lag_s")

def ts(v):
 return datetime.fromtimestamp(v,timezone.utc).isoformat(timespec="milliseconds").replace("+00:00","Z")
def numeric(value):
 if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value):
  return None
 return float(value)
def clean_row(raw):
 """Drop every outcome/after-tick column BEFORE any model/ranking code."""
 if any(k in raw for k in FUTURE_OR_OUTCOME_COLUMNS):
  # If the caller loaded whole-row Parquet, fail rather than silently strip
  # a future label: the approved loader must project exactly ALLOWED_COLUMNS.
  raise ValueError("V29_FUTURE_OR_OUTCOME_COLUMN_MATERIALIZED")
 if not isinstance(raw.get("mint"),str) or not MINT.fullmatch(raw["mint"]):
  return None
 t=numeric(raw.get("t"))
 if t is None:return None
 obj={k:raw.get(k) for k in ALLOWED_COLUMNS}
 obj["t"]=t
 return obj

def reasons(r,scan,delay_sec=60):
 if r is None:return ["INVALID_MINT_OR_TIMESTAMP"]
 if r["t"]>=scan-delay_sec:return ["NOT_FINALIZED_BEFORE_SCAN"]
 gap=scan-r["t"]
 if gap>600:return ["STALE_GT_10_MIN"]
 if r.get("repaired") is True:return ["REPAIRED_SOURCE_NOT_LIVE_MODEL"]
 if r.get("mayhem") is True:return ["MAYHEM_EXCLUDED"]
 if r.get("quote_asset")!="sol" or r.get("quote_modelled") is not True:
  return ["NON_SOL_OR_UNMODELED_QUOTE"]
 flags=[x.upper() for x in DANGER_FLAGS if r.get(x) is True]
 if flags:return ["ASOF_"+f for f in flags]
 rs=numeric(r.get("f_rs"));buys=numeric(r.get("f_n_buys"))
 dev=numeric(r.get("f_dev_share"));inside=numeric(r.get("f_insider_share"))
 bundle=numeric(r.get("f_bundle_wallets"))
 if any(x is None for x in (rs,buys,dev,inside,bundle)):
  return ["MISSING_ASOF_RISK_FEATURE"]
 if not (0<=dev<=1 and 0<=inside<=1 and bundle>=0 and buys>=0 and rs>=0):
  return ["MALFORMED_ASOF_RISK_FEATURE"]
 if rs<1 or buys<5:return ["LOW_SOL_RESERVE_OR_BUYS"]
 if dev>0.35 or inside>0.50 or bundle>15:
  return ["CONCENTRATED_HOLDERS_OR_BUNDLE"]
 # These are the provider's reported AS-OF probabilities, not future labels.
 # Neither can authorize an executable quote or an actual purchase.
 rug=numeric(r.get("p_rug_within_300s"))
 if rug is not None and not 0<=rug<=1:return ["INVALID_PROVISIONAL_RISK_ODDS"]
 if rug is not None and rug>0.40:return ["INDICATIVE_RUG_RISK_HIGH"]
 return []

def candidate(r,scan):
 why=reasons(r,scan)
 rs=numeric(r.get("f_rs")) if r else None
 n=numeric(r.get("f_n_buys")) if r else None
 # Numeric feature ranking solely based on timestamped feature measurements.
 # Not on later labels or measured future token performance.
 score=round(min(50,math.log1p(max(0,n or 0))*10)+
  min(50,math.log1p(max(0,rs or 0))*10),3)
 return {"chain":"solana","mint":r["mint"],
  "feature_at_utc":ts(r["t"]),"scan_at_utc":ts(scan),
  "age_since_feature_sec":round(scan-r["t"],3),
  "asof_f_rs_sol_reserve":rs,"asof_f_n_buys":n,
  "asof_mayhem":r.get("mayhem"),"research_score":score,
  "screen_status":"SCREEN_PASS_REQUIRES_POOL_RISK_AND_TWO_WAY_QUOTES" if not why else "NO_BUY_REVIEW",
  "screen_reasons":why,
  "pool":None,
  "source_class":"RETRO_ASOF_RECONSTRUCTION",
  "original_provider_delivery_authenticated":False,
  "real_quote_buy_50usdc_authenticated":False,
  "real_quote_sell_50usdc_authenticated":False,
  "issuer_and_sellability_authenticated":False,
  "allowed_live_or_backtest_order":False}

def build_24_scan_research(records,topn=5):
 if not isinstance(records,list):raise ValueError("V29_ROWS_LIST_REQUIRED")
 if not isinstance(topn,int) or not 1<=topn<=24:raise ValueError("V29_TOPN_INVALID")
 safe=[]
 for row in records:
  cleaned=clean_row(row)
  if cleaned is not None and BASE-86400<=cleaned["t"]<BASE+86400:
   safe.append(cleaned)
 safe.sort(key=lambda x:(x["t"],x["mint"]))
 cursor=0;last={};frames=[]
 finalized_cursor=0;finalized_last={}
 for i in range(24):
  tick=BASE+i*3600
  # Assimilation of retrospective records STRICTLY before the clock tick.
  # The extra 60s finalization buffer is applied to candidates below.
  while cursor<len(safe) and safe[cursor]["t"]<tick:
   r=safe[cursor]
   last[r["mint"]]=r
   cursor+=1
  # Track finalized observations independently: an unfinalized newer row
  # must not hide an already available observation for the same mint.
  while finalized_cursor<len(safe) and safe[finalized_cursor]["t"]<tick-60:
   r=safe[finalized_cursor]
   finalized_last[r["mint"]]=r
   finalized_cursor+=1
  eligible=[r for r in last.values() if tick-600<=r["t"]<tick]
  stats=Counter();ranked=[];fallback_count=0
  for observed in eligible:
   r=finalized_last.get(observed["mint"])
   if r is None or r["t"]<tick-600:
    stats["NOT_FINALIZED_BEFORE_SCAN"]+=1
    continue
   if r["t"]!=observed["t"]:fallback_count+=1
   c=candidate(r,tick)
   if c["screen_reasons"]:
    for reason in c["screen_reasons"]:stats[reason]+=1
   else:
    stats["SCREEN_PASS_REQUIRES_POOL_RISK_AND_TWO_WAY_QUOTES"]+=1
    ranked.append(c)
  ranked.sort(key=lambda x:(-x["research_score"],x["mint"]))
  frames.append({"scan":i+1,"at_utc":ts(tick),
    "source_event_rows_known_retro":cursor,
    "cumulative_distinct_mints_retro":len(last),
    "fresh_distinct_mints_in_last_10m_retro":len(eligible),
    "finalized_fallback_mints":fallback_count,
    "screen_pass_with_unknown_executable_quotes":len(ranked),
    "rejected_research_by_reason":dict(sorted(stats.items())),
    "top_research_candidates_not_orders":ranked[:topn],
    "truncated_screen_pass_candidates":max(0,len(ranked)-topn),
    "original_historical_provider_delivery_authenticated":False,
    "BUY":[],"HOLD":[],"SELL":[],
    "risk_to_trade_status":"BLOCKED_MISSING_ORIGINAL_PROVIDER_POOL_AND_50USDC_TWO_WAY_QUOTES",
    "no_genuine_gpt_review":True,"no_real_paper_fills":True})
 return frames

def validate_frozen_model(frozen,frames):
 if frozen.get("kind")!="R29_V28_VERIFIED_24_HOURLY_TRADE_ACTION_AND_NEUTRAL_RESEARCH_SUMMARY" or len(frozen.get("scans",[]))!=24:
  raise ValueError("V29_MISSING_FROZEN_V28_MODEL")
 for i,(s,o) in enumerate(zip(frames,frozen["scans"])):
  if o.get("at_utc")!=s["at_utc"] or o.get("model_buy")!=[] or o.get("model_hold")!=[] or o.get("model_sell")!=[] or o.get("actual_historical_gpt_reviews")!=0 or o.get("actual_paper_fills")!=0:
   raise ValueError("V29_FROZEN_ACTUAL_MODEL_ORDER_MISMATCH")
 # The new research candidates MUST NOT be merged into the past order ledger.
 return True
