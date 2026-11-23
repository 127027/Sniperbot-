import importlib.util
import pathlib
import json
import unittest
from datetime import datetime,timezone

FILE=pathlib.Path(__file__).resolve().parents[1]/'scripts/v27-bridge-neutral-raw-features-to-original-solana-sells.py'
spec=importlib.util.spec_from_file_location('r29_v27_bridge',FILE)
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def frame(t,rows):
 return dict(scan_at_utc=t,neutral_distinct_mints_in_two_day_history=len(rows),
  research_only_mints=rows)
def source(t,mint,first,last,n):
 return dict(mint=mint,first_feature_at_utc=first,
  last_feature_before_scan_utc=last,feature_occurrences_before_scan=n)
class BridgeUnitTests(unittest.TestCase):
 def test_october_raw_source_precedes_first_hour_with_exact_mint(self):
  t=m.TARGETS[0]
  rows=[source(t['scan'],t['mint'],'2026-10-12T01:58:40.470Z',
      '2026-10-12T01:59:40.907Z',2)]
  f=m.research_feature_at_scan([frame(t['scan'],rows)],t)
  self.assertEqual(f['first_feature_lead_ms_before_scan'],79530)
 def test_future_feature_fails_closed(self):
  t=m.TARGETS[0]
  rows=[source(t['scan'],t['mint'],t['scan'],t['scan'],1)]
  with self.assertRaisesRegex(ValueError,'FUTURE_FEATURE'):
   m.research_feature_at_scan([frame(t['scan'],rows)],t)
 def test_exact_one_mint_only(self):
  t=m.TARGETS[1]
  rows=[source(t['scan'],t['mint'],'2026-10-12T17:59:04.257Z',
    '2026-10-12T17:59:04.257Z',1)]
  f=m.research_feature_at_scan([frame(t['scan'],rows)],t)
  self.assertEqual(f['last_feature_lead_ms_before_scan'],55743)
  self.assertEqual(f['feature_is_original_october_provider_delivery_proof'],False)
 def make_original_tx(self):
  t=m.TARGETS[0];signature='S'*87
  # valid byte schema is intentionally minimal for pure acceptance tests.
  raw={'jsonrpc':'2.0','result':{
   'slot':456,'blockTime':int(m.utc_ms('2026-10-12T01:59:53.000Z')/1000),
   'transaction':{'signatures':[signature],'message':{
    'accountKeys':[{'pubkey':t['pool']},{'pubkey':'poolTokenVault'}]}},
   'meta':{'err':None,'preBalances':[160_000_000,100],
    'postBalances':[100_000_000,100],
    'preTokenBalances':[{'accountIndex':1,'owner':t['pool'],
      'mint':t['mint'],'programId':m.TOKEN_PROGRAM_2022,
      'uiTokenAmount':{'amount':'100000000','decimals':6}}],
    'postTokenBalances':[{'accountIndex':1,'owner':t['pool'],
      'mint':t['mint'],'programId':m.TOKEN_PROGRAM_2022,
      'uiTokenAmount':{'amount':'300000000','decimals':6}}]}}}
  b=json.dumps(raw).encode()
  obs=dict(source_sha256=m.digest(b),slot=456,
   original_signature=signature,block_time_utc='2026-10-12T01:59:53.000Z',
   pool=t['pool'],mint=t['mint'],token_program_address=m.TOKEN_PROGRAM_2022,
   sell_program_address=m.SELL_PROGRAM,
   actual_original_third_party_sell_transaction_correlated=True,
   transfer_checked_exact_mint_and_pool_delta_matched=True,
   pool_native_sol_decreased_lamports='60000000',
   raw_mint_token_units_in='200000000',token_decimals=6)
  return b,obs,t
 def test_raw_sol_and_token_delta_recomputed_from_bytes(self):
  b,obs,t=self.make_original_tx()
  r=m.validate_original_tx(b,obs,t)
  self.assertEqual(r['confirmed_pool_mint_token_in'],'200')
  self.assertEqual(r['confirmed_pool_native_sol_out'],'0.06')
  self.assertEqual(r['native_sol_pool_out_per_mint_token_in_observed_ratio'],'0.0003')
  self.assertFalse(r['client_50usdc_buy_or_sell_verified'])
  self.assertFalse(r['sol_usdc_historical_fx_verified'])
 def test_reject_modified_raw_hash(self):
  b,obs,t=self.make_original_tx()
  with self.assertRaisesRegex(ValueError,'RAW_BYTES_MODIFIED'):
   m.validate_original_tx(b+b' ',obs,t)
 def test_reject_malformed_pool_beneficiary_amount(self):
  b,obs,t=self.make_original_tx()
  obs['pool_native_sol_decreased_lamports']='90000000'
  with self.assertRaisesRegex(ValueError,'NATIVE_SOL_DELTA_NOT_VERIFIED'):
   m.validate_original_tx(b,obs,t)
 def test_reject_chain_after_virtual_scan(self):
  b,obs,t=self.make_original_tx()
  obs['block_time_utc']='2026-10-12T02:00:01.000Z'
  with self.assertRaisesRegex(ValueError,'TIME_MISMATCH'):
   m.validate_original_tx(b,obs,t)
if __name__=='__main__': unittest.main()
