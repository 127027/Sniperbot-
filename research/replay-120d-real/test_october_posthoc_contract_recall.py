import importlib.util,unittest
from pathlib import Path
from datetime import date,datetime,timezone,timedelta
spec=importlib.util.spec_from_file_location(
 "posthoc",Path(__file__).with_name("october-posthoc-contract-recall.py"))
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
def launch(day,mint,name,symbol):
 return {"mint":mint,"name":name,"symbol":symbol,
  "t0":datetime.fromisoformat(day).replace(tzinfo=timezone.utc).timestamp()+12345,
  "launched_at":day+"T03:25:45Z"}

class PosthocRecall(unittest.TestCase):
 def test_full_source_but_not_320_sample_is_scanner_sampling_miss_not_gpt_rejection(self):
  records={day:[] for day in m.DAYS}
  days=m.DAYS
  row=launch("2026-10-18",m.BENCHMARKS["PIERRE"]["mint_candidates"][0],
   "French Goku Hero","PIERRE")
  records["2026-10-18"].append(row)
  pins={day:"a"*64 for day in days}
  report=m.finish_audit(records,pins,{})
  r=report["benchmark_results"]["PIERRE"]
  self.assertEqual(r["evidence_classification"],
    "EXACT_CONTRACT_IN_FULL_RAW_LAUNCHES_BUT_MISSED_BY_320_RESEARCH_SAMPLE")
  self.assertFalse(r["was_in_320_neutral_research_sample"])
  self.assertFalse(r["was_an_actual_prior_october_GPT_trade"])
  self.assertEqual(r["exact_mint_source_hits"][0]["mint"],row["mint"])
  self.assertEqual(report["actual_historic_paper_fills"],0)

 def test_same_symbol_and_clone_name_not_proof_of_exact_contract(self):
  rows=[launch("2026-10-15","7"*44,"Trump $1 Coin","1"),
        launch("2026-10-15","8"*44,"Random clone","FTR")]
  day=m.scan_records("2026-10-15",rows)
  self.assertEqual(len(day["TRUMP_1"]["by_exact_contract"]),0)
  self.assertEqual(day["TRUMP_1"]["by_symbol_count"],1)
  self.assertEqual(len(day["TRUMP_1"]["by_name"]),1)
  self.assertEqual(day["FTR"]["by_symbol_count"],1)
  self.assertEqual(len(day["FTR"]["by_exact_contract"]),0)
  # A clone name is weak evidence: do not infer that the target contract is present.
  reports={d:[] for d in m.DAYS}
  reports["2026-10-15"]=rows
  report=m.finish_audit(reports,{d:"a"*64 for d in m.DAYS},{})
  self.assertEqual(report["benchmark_results"]["TRUMP_1"]["evidence_classification"],
   "EXACT_NAME_IN_FULL_RAW_SOURCE_BUT_NOT_CONFIRMED_SAME_CONTRACT")
  self.assertEqual(report["benchmark_results"]["FTR"]["evidence_classification"],
   "NO_EXACT_CONTRACT_OR_NAME_IN_THIS_SOLANA_PUMPFUN_SOURCE")

 def test_reference_mint_sampled_but_not_filled_is_not_pnl(self):
  mint=m.BENCHMARKS["FTR"]["mint_candidates"][0]
  rows={d:[] for d in m.DAYS}
  rows["2026-10-15"]=[launch("2026-10-15",mint,"Flying Tesla Roadster","FTR")]
  report=m.finish_audit(rows,{d:"b"*64 for d in m.DAYS},
   {mint:[{"review_at_utc":"2026-10-15T12:00:00Z"}]})
  v=report["benchmark_results"]["FTR"]
  self.assertEqual(v["evidence_classification"],
    "SAMPLED_NEUTRAL_WITH_PREVIOUS_GPT_RESEARCH_DECISION")
  self.assertEqual(len(v["selected_neutral_observation_times"]),1)
  self.assertEqual(report["actual_historic_paper_fills"],0)
  self.assertIsNone(report["profit_pnl_test_usdc"])

 def test_timestamp_from_other_day_cannot_claim_launch(self):
  wrong=launch("2026-10-18",m.BENCHMARKS["PIERRE"]["mint_candidates"][0],
    "French Goku Hero","PIERRE")
  self.assertIsNone(m.source_match_record(wrong,"2026-10-15"))
  self.assertIsNotNone(m.source_match_record(wrong,"2026-10-18"))

if __name__=="__main__":unittest.main()
