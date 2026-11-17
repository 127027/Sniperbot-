import importlib.util,sqlite3,tempfile,unittest
from datetime import datetime,timezone,timedelta
from pathlib import Path
root=Path(__file__).parent
spec=importlib.util.spec_from_file_location("asof_r29_v4",root/"r29-v4-asof-feature-priority.py")
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ResearchQueue(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory(prefix="r29-v4-asof")
  self.conn=sqlite3.connect(Path(self.tmp.name)/"state.sqlite")
  m.capture.init_db(self.conn);m.init_priority(self.conn)
  self.start=datetime(2026,10,11,tzinfo=timezone.utc).timestamp()
 def tearDown(self):
  self.conn.close();self.tmp.cleanup()
 def mint(self,i):
  alphabet="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
  x,y=divmod(i,len(alphabet))
  return alphabet[x]+alphabet[y]+"A"*38
 def add_mints(self,n):
  with self.conn:
   for i in range(n):
    self.conn.execute("INSERT INTO launches VALUES(?,?,?,?,?)",
     ("solana",self.mint(i),self.start,
      self.start+48*3600,"C"*40))
 def feat(self,mint,t,buy=40,reserve=10,**kw):
  x=dict.fromkeys(m.FEATURE_COLS)
  x.update({"mint":mint,"t":t,"age_s":10,
   "f_n_buys":buy,"f_rs":reserve,"quote_is_sol":True,
   "f_dev_share":0,"f_insider_share":0,"f_bundle_wallets":0,
   "flag_creator_sold":False,"flag_bundle_dumped":False,
   "flag_pool_drained":False,"mayhem":False})
  return {**x,**kw}
 def test_every_one_of_150_eligible_has_paged_research_access_without_eight_cap(self):
  self.add_mints(150)
  events=[self.feat(self.mint(i),self.start+1800) for i in range(150)]
  pos,status=m.apply_rows_until(self.conn,events,0,self.start+3600)
  self.assertEqual(pos,150);self.assertEqual(status["rows_joined_to_raw_launches"],150)
  pages=[m.review_at(self.conn,self.start+3600,i) for i in range(3)]
  self.assertEqual(pages[0]["eligible_count_not_truncated"],150)
  self.assertEqual(pages[0]["total_pages"],3)
  self.assertEqual([len(x["selected_for_possible_GPT_review"]) for x in pages],[64,64,22])
  merged=[e["mint"] for p in pages for e in p["selected_for_possible_GPT_review"]]
  self.assertEqual(len(set(merged)),150)
  self.assertTrue(all(p["this_is_not_an_actual_GPT_model_invocation"] for p in pages))
  self.assertTrue(all(not x["gpt_model_call_made"] for p in pages for x in p["selected_for_possible_GPT_review"]))
 def test_cached_full_universe_matches_db_and_updates_hourly_without_lookahead(self):
  self.add_mints(3)
  cache={r[0]:r[1] for r in self.conn.execute("SELECT mint,t0 FROM launches")}
  previous={}
  events=[self.feat(self.mint(0),self.start+1000,buy=30),
          self.feat(self.mint(1),self.start+3000,buy=35),
          self.feat(self.mint(2),self.start+7200,buy=90)]
  pos,stats=m.apply_rows_until(self.conn,events,0,self.start+3600,cache,previous)
  self.assertEqual(pos,2)
  self.assertEqual(len(previous),2)
  self.assertEqual(m.review_at(self.conn,self.start+3600)["eligible_count_not_truncated"],2)
  pos,stats=m.apply_rows_until(self.conn,events,pos,self.start+7500,cache,previous)
  self.assertEqual(pos,3)
  self.assertEqual(len(previous),3)
  self.assertEqual(m.review_at(self.conn,self.start+7500)["eligible_count_not_truncated"],3)

 def test_fast_index_matches_SQL_and_64_token_pages_before_expiry(self):
  self.add_mints(150)
  launches={r[0]:r[1] for r in self.conn.execute("SELECT mint,t0 FROM launches")}
  expiries={r[0]:r[1] for r in self.conn.execute("SELECT mint,expires FROM launches")}
  prev={}
  eligible={}
  events=[self.feat(self.mint(i),self.start+1800+i,buy=40+(i%10))
    for i in range(150)]
  pos,counts=m.apply_rows_until(self.conn,events,0,self.start+3600,
   launches,prev,eligible,expiries)
  self.assertEqual(pos,150)
  for page in range(3):
   fast=m.review_at_cached(eligible,launches,expiries,self.start+3600,page)
   slow=m.review_at(self.conn,self.start+3600,page)
   self.assertEqual(fast,slow)
  self.assertEqual(m.review_at_cached(eligible,launches,expiries,
   self.start+48*3600+1)["eligible_count_not_truncated"],0)

 def test_expired_mint_reactivated_only_after_new_relevant_buy_delta(self):
  self.add_mints(1)
  mint=self.mint(0)
  launch={mint:self.start}
  expiry={mint:self.start+48*3600}
  feature={}
  eligible={}
  first=self.feat(mint,self.start+1000,buy=32)
  late=self.feat(mint,self.start+50*3600,buy=45)
  pos,stats=m.apply_rows_until(self.conn,[first,late],0,self.start+48*3600+1,
   launch,feature,eligible,expiry)
  self.assertEqual(pos,1)
  self.assertEqual(m.review_at_cached(eligible,launch,expiry,
   self.start+48*3600+1)["eligible_count_not_truncated"],0)
  pos,stats=m.apply_rows_until(self.conn,[first,late],pos,self.start+50*3600+1,
   launch,feature,eligible,expiry)
  self.assertEqual(pos,2)
  self.assertEqual(m.review_at_cached(eligible,launch,expiry,
   self.start+50*3600+1)["eligible_count_not_truncated"],1)
  self.assertEqual(self.conn.execute(
   "SELECT count(*) FROM research_reactivations WHERE mint=?",(mint,)).fetchone()[0],1)
  self.assertEqual(m.capture.candidate_asof(self.conn,mint,self.start+51*3600),
   "MONITORING_SOURCE_ONLY")
  # After a future reactivation has already been processed, a historical
  # 49-hour query must still see the expired candidate (no hindsight).
  self.assertEqual(m.capture.candidate_asof(self.conn,mint,self.start+49*3600),
   "EXPIRED_SOURCE_ONLY")
  self.assertEqual(self.conn.execute(
   "SELECT count(*) FROM research_retention_events WHERE mint=?",(mint,)).fetchone()[0],1)

 def test_late_risky_mint_is_not_reactivated_after_expiry(self):
  self.add_mints(1)
  mint=self.mint(0)
  launch={mint:self.start}
  expiry={mint:self.start+48*3600}
  feature={}
  eligible={}
  events=[self.feat(mint,self.start+1000,buy=35),
   self.feat(mint,self.start+50*3600,buy=75,flag_bundle_dumped=True)]
  pos,stats=m.apply_rows_until(self.conn,events,0,self.start+52*3600,
   launch,feature,eligible,expiry)
  self.assertEqual(pos,2)
  self.assertEqual(self.conn.execute(
   "SELECT count(*) FROM research_reactivations").fetchone()[0],0)
  self.assertEqual(m.review_at_cached(eligible,launch,expiry,
   self.start+51*3600)["eligible_count_not_truncated"],0)

 def test_future_features_cannot_change_earlier_ranked_queue(self):
  self.add_mints(2)
  e=[self.feat(self.mint(0),self.start+1000,buy=40),
     self.feat(self.mint(1),self.start+7000,buy=500)]
  pos,stats=m.apply_rows_until(self.conn,e,0,self.start+3600)
  self.assertEqual(pos,1)
  r=m.review_at(self.conn,self.start+3600)
  self.assertEqual(r["eligible_count_not_truncated"],1)
  self.assertEqual(r["selected_for_possible_GPT_review"][0]["mint"],self.mint(0))
  pos,stats=m.apply_rows_until(self.conn,e,pos,self.start+7100)
  self.assertEqual(pos,2)
  self.assertEqual(m.review_at(self.conn,self.start+7100)["eligible_count_not_truncated"],2)
 def test_48h_extension_requires_new_observed_buy_activity(self):
  self.add_mints(1)
  mint=self.mint(0)
  e=[self.feat(mint,self.start+3600,buy=30),
     self.feat(mint,self.start+47*3600,buy=40)]
  m.apply_rows_until(self.conn,e,0,self.start+47*3600)
  self.assertEqual(m.capture.candidate_asof(self.conn,mint,self.start+49*3600),
   "MONITORING_SOURCE_ONLY")
  self.assertEqual(m.capture.candidate_asof(self.conn,mint,self.start+96*3600),
   "EXPIRED_SOURCE_ONLY")
  self.assertEqual(m.review_at(self.conn,self.start+49*3600)["eligible_count_not_truncated"],1)
 def test_only_passive_or_risky_snapshot_never_extends(self):
  self.add_mints(1)
  mint=self.mint(0)
  e=[self.feat(mint,self.start+100,buy=30),
     self.feat(mint,self.start+47*3600,buy=30),
     self.feat(mint,self.start+47*3600+60,buy=100,flag_pool_drained=True)]
  m.apply_rows_until(self.conn,e,0,self.start+48*3600)
  self.assertEqual(m.capture.candidate_asof(self.conn,mint,self.start+49*3600),
   "EXPIRED_SOURCE_ONLY")
  self.assertEqual(m.review_at(self.conn,self.start+47*3600+70)["eligible_count_not_truncated"],0)
 def test_future_outcome_fields_trigger_hard_rejection(self):
  x=self.feat(self.mint(0),self.start+1000)
  x["peak_rs"]=900000
  with self.assertRaisesRegex(ValueError,"FUTURE_FEATURE_COLUMNS"):
   m.apply_rows_until(self.conn,[x],0,self.start+3600)
 def test_missing_buys_or_no_reserve_is_no_quote_and_no_trade(self):
  x=self.feat(self.mint(0),self.start+60)
  self.assertFalse(m.priority({**x,"f_n_buys":None})["eligible"])
  self.assertFalse(m.priority({**x,"quote_is_sol":False})["eligible"])
  self.assertFalse(m.priority({**x,"mayhem":True})["eligible"])
  self.assertFalse(m.priority({**x,"flag_pool_drained":True})["eligible"])
  self.assertEqual(m.priority(x)["reason"],
   "EARLY_BUY_ACTIVITY_AND_SOL_RESERVE_RESEARCH_ONLY")
if __name__=="__main__":unittest.main()
