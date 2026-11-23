import importlib.util
import json
import math
import pathlib
import unittest
import tempfile
from datetime import datetime,timezone
from unittest.mock import patch

ROOT=pathlib.Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('r29_v26_source',
 ROOT/'scripts/v26-rebuild-oct12-full-raw-feature-population.py')
m=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)

class V26NeutralRawCoverageSafety(unittest.TestCase):
 def test_24_ticks_from_zero_to_23_and_pre_scan_strictness(self):
  t=m.START
  events=[(t-1,'A'*32),(t,'B'*32),(t+3599,'C'*32),
    (t+3600,'D'*32),(t+7200,'E'*32)]
  hourly=m.build_hourly_visibility(events)
  self.assertEqual(len(hourly),24)
  self.assertEqual(hourly[0]['neutral_distinct_mints_in_two_day_history'],1)
  self.assertEqual(hourly[1]['neutral_distinct_mints_in_two_day_history'],3)
  self.assertEqual(hourly[2]['neutral_distinct_mints_in_two_day_history'],4)
  self.assertEqual(hourly[3]['neutral_distinct_mints_in_two_day_history'],5)
  self.assertNotIn('E'*32,[r['mint'] for r in hourly[2]['research_only_mints']])
  self.assertEqual(hourly[0]['scan_at_utc'],'2026-10-12T00:00:00.000Z')
  self.assertEqual(hourly[-1]['scan_at_utc'],'2026-10-12T23:00:00.000Z')
 def test_one_mint_multiple_features_not_multiple_coins(self):
  t=m.START
  s=m.build_hourly_visibility([(t-1,'A'*32),(t-2,'A'*32),
    (t+15,'A'*32),(t+16,'A'*32)])
  self.assertEqual(s[0]['neutral_distinct_mints_in_two_day_history'],1)
  self.assertEqual(s[0]['research_only_mints'][0]['feature_occurrences_before_scan'],2)
  self.assertEqual(s[1]['neutral_distinct_mints_in_two_day_history'],1)
  self.assertEqual(s[1]['research_only_mints'][0]['feature_occurrences_before_scan'],4)
 def test_bad_mints_and_times_dont_enter_source(self):
  start=m.START
  rows=[{'mint':'A'*32,'t':start+1},
   {'mint':'bad!!','t':start+2},
   {'mint':'B'*32,'t':start+86400},
   {'mint':'C'*32,'t':start-1},
   {'mint':'D'*32,'t':math.nan},
   {'mint':'E'*32,'t':True},
   {'mint':None,'t':start+2}]
  accepted,bad=m.neutral_valid_rows(rows,'2026-10-12')
  self.assertEqual(accepted,[(start+1,'A'*32)])
  self.assertEqual(bad,6)
 def test_source_revision_sha_and_original_192_sampling_are_pinned(self):
  self.assertEqual(m.REV,'9b9a04e7e3e85775d614d16105daad2e69ce8544')
  self.assertEqual(m.PINS['2026-10-12'][0],137969)
  self.assertEqual(len(m.PINS['2026-10-12'][1]),64)
  self.assertEqual(m.ORIGINAL_ARCHIVE_SHA['2026-10-12'],
   '8a03d0b3f065a6f6fd35867cd7c61719fb37f2cca06134aef6a81f14b3d7d3ab')
 def test_only_identity_and_event_time_leave_raw_pandas_rows(self):
  t=m.START
  results,bad=m.neutral_valid_rows([{
   'mint':'A'*32,'t':t+1,'reported_gain_pct':50000,
   'future_oracle_winner':True,'rugged':False,'price_usd':3.14,
   'provider_captured_at_utc':'2026-11-23T00:00:00Z'}], '2026-10-12')
  self.assertEqual(results,[(t+1,'A'*32)])
  self.assertEqual(bad,0)
 def test_no_unsafe_trade_or_provider_markers_emitted_by_snapshots(self):
  s=m.build_hourly_visibility([(m.START-100,'A'*32)])
  text=json.dumps(s)
  for banned in ['buy_price','sell_price','future_oracle','rugged','trade_authorized',
                 'historical_gpt_order','captured_at_utc']:
   self.assertNotIn(banned,text)

if __name__=='__main__':unittest.main()
