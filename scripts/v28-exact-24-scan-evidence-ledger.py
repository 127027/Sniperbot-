#!/usr/bin/env python3
"""R29 V2.8: exact 24-scan source-audited BUY/HOLD/SELL report.
Uses only immutable v22 decision, v26 full Solana research and v27 onchain
evidence artifacts. Independent of old bot and winner oracle. NO orders.
"""
import csv,gzip,hashlib,json,os,re,subprocess,sys
from pathlib import Path

HASH={
 'comparison':'b703083f571798978064008a3050dc0b6ff85a0c0e38cfe4b674a73a2e2f2379',
 'decisions':'ce78c1667ed374c80a916ec74c3ccb5f9a1e95d6df8cf6354889f4af3e798db4',
 'receipt':'898ca62c93ac6b0d138cfa16369a929fd78b67cc45f4b7356ab7dbdf1eb5cfed',
 'v26manifest':'40c8578fb30537e5b0bb5c8396b10f53f022bf51593fdf2581d1b55c15eea532',
 'v26tape':'ad5defbfd86a3f230e0924b0feddd5ab6af592e4dee276570be6835e88c490e6',
 'v27join':'c5033ae36c06c6d2982a52adfcf9199458f23893c05420817fb6b835c8d108a1'
}
def sha(x):return hashlib.sha256(x).hexdigest()
def verify_bytes(path,digest):
 b=Path(path).read_bytes()
 if sha(b)!=digest:raise ValueError('R29_V28_ORIGINAL_SOURCE_SHA_CHANGED:'+str(path))
 return b
def moment(i):return '2026-10-12T'+str(i).zfill(2)+':00:00.000Z'
def key(a):
 if not isinstance(a,dict) or not isinstance(a.get('chain'),str) or not isinstance(a.get('pool'),str):
  raise ValueError('R29_V28_TRADE_WITHOUT_EXACT_CHAIN_POOL')
 return a['chain']+':'+a['pool']
def action_markets(items,expected):
 out=[]
 for v in items:
  if expected is not None and v.get('action')!=expected:
   raise ValueError('R29_V28_INCORRECT_TRADE_ACTION')
  coin=v.get('coin')
  if not isinstance(coin,dict):raise ValueError('R29_V28_NO_MARKET_ID_IN_TRADE')
  item={'symbol':v.get('symbol'),'chain':coin.get('chain'),
   'pool':coin.get('pool'),'contract':v.get('contract')}
  item['key']=key(item)
  out.append(item)
 return out

def join_24(comparison,decisions,receipt,manifest,tape,chain):
 if comparison.get('kind')!='R29_V19_EXPLICIT_24_HOURLY_POST_DECISION_DIAGNOSTIC' or \
    comparison.get('scan_count')!=24 or \
    decisions.get('kind')!='R29_V18_ON_DEMAND_FIVE_ROLE_SHADOW_BACKTEST' or \
    decisions.get('mode')!='EXPLICIT_FIXED_24_HOURLY_DIAGNOSTIC' or \
    receipt.get('github_run_id')!='45257966772':
  raise ValueError('R29_V28_WRONG_FROZEN_24_SCAN_DIAGNOSIS')
 if any(decisions.get(k)!=0 for k in ['confirmed_paper_orders','confirmed_paper_fills','historical_gpt_dot_runs']) or \
    comparison.get('model_buys')!=0 or comparison.get('model_sells')!=0 or \
    comparison.get('actual_windows_paper_fills')!=0 or \
    decisions.get('model_replay_summary',{}).get('dataGap')!=24:
  raise ValueError('R29_V28_FROZEN_ORIGINAL_TRADE_TRUTH_CHANGED')
 if manifest.get('total_source_feature_rows_oct11_and_oct12')!=259851 or \
    manifest.get('original_provider_delivery_in_october_proven') is not False or \
    tape.get('original_october_delivery_authenticated') is not False or \
    tape.get('winner_oracle_accessed') is not False:
  raise ValueError('R29_V28_RETROSPECTIVE_SOURCE_NOT_QUARANTINED')
 if chain.get('individual_original_solana_chain_sells_reverified')!=4 or \
    chain.get('historical_bidirectional_executable_50_usdc_quote_pairs_verified')!=0 or \
    chain.get('original_qa04_trading_backtest_accepted') is not False or \
    len(chain.get('results',[]))!=2:
  raise ValueError('R29_V28_ORIGINAL_SELLS_IMPROPERLY_PROMOTED_TO_TRADES')
 witnesses={}
 for x in chain['results']:
  at=x.get('virtual_scan_at_utc')
  if at not in [moment(2),moment(18)] or at in witnesses or \
     x.get('historical_sale_count')!=2 or \
     x.get('paper_buy_and_sell_authorized') is not False or \
     x.get('provider_originally_delivered_feature_to_dot_at_scan') is not False:
   raise ValueError('R29_V28_BAD_ORIGINAL_CHAIN_WITNESS')
  witnesses[at]={
   'symbol':x['coin_label_for_research_only'],
   'mint':x['mint'],'pool':x['pool_confirmed_by_original_tx'],
   'other_trader_sells':x['historical_sale_count'],
   'evidence':'RETROSPECTIVE_ORIGINAL_CHAIN_SELL_NOT_DOT_ORDER'}
 src=tape.get('frames',[])
 diag=comparison.get('scans',[])
 counts=manifest.get('per_scan_counts',[])
 if len(src)!=24 or len(diag)!=24 or len(counts)!=24:
  raise ValueError('R29_V28_24_SOURCE_SCAN_COUNT_INCOMPLETE')
 rows=[];open_positions={};previous=0
 for i in range(24):
  s=diag[i];r=src[i];m=counts[i];t=moment(i)
  if s.get('scan')!=i+1 or s.get('scan_at_utc')!=t or \
     r.get('scan_at_utc')!=t or m.get('scan_at_utc')!=t:
   raise ValueError('R29_V28_SCAN_TIMES_WRONG')
  n=r.get('neutral_distinct_mints_in_two_day_history')
  if n!=m.get('mint_count') or \
     r.get('raw_feature_rows_before_scan')!=m.get('row_count') or \
     not isinstance(n,int) or n<previous:
   raise ValueError('R29_V28_FULL_RAW_HOURLY_COUNTER_MISMATCH')
  buys=action_markets(s.get('buy',[]),'BUY')
  sells=action_markets(s.get('sell',[]),'SELL')
  for coin in buys:
   if coin['key'] in open_positions:raise ValueError('R29_V28_ALREADY_BOUGHT')
   open_positions[coin['key']]=coin
  for coin in sells:
   if coin['key'] not in open_positions:
    raise ValueError('R29_V28_SELL_WITH_NO_BOUGHT_POSITION')
   del open_positions[coin['key']]
  holds=action_markets(s.get('hold',[]),None)
  if {x['key'] for x in holds}!=set(open_positions):
   raise ValueError('R29_V28_HOLD_IS_NOT_AN_OPEN_POSITION')
  watch=action_markets(s.get('watch',[]),None)
  if any(x['key'] in open_positions for x in watch):
   raise ValueError('R29_V28_WATCH_MUST_NOT_CREATE_HOLD')
  if s.get('verified_real_gpt_reviews_this_scan')!=0 or \
     s.get('verified_windows_paper_fills_this_scan')!=0 or \
     s.get('valid_model_input_pools')!=0 or \
     s.get('scan_result')!='DATA_GAP_NO_FRESH_QUOTES':
   raise ValueError('R29_V28_FROZEN_ACTUAL_DATA_GAP_CHANGED')
  rows.append({
   'scan_number':i+1,'at_utc':t,
   'postevent_solana_cumulative_mints':n,
   'postevent_solana_new_mints_since_last_tick':n-previous,
   'postevent_solana_cumulative_feature_rows':r['raw_feature_rows_before_scan'],
   'model_BUY':buys,'model_HOLD':holds,'model_SELL':sells,'model_WATCH':watch,
   'original_GPT_reviews_verified':0,'Windows_paper_fills_verified':0,
   'original_tradeable_quote_pools':0,
   'scan_status':'DATA_GAP_NO_ORIGINAL_HISTORIC_QUOTES',
   'postevent_original_chain_other_wallet_sells':
      [witnesses[t]] if t in witnesses else [],
   'actual_client_BUY':[],'actual_client_HOLD':[],'actual_client_SELL':[],
   'all_original_provider_available_before_scan_proven':False
  })
  previous=n
 if rows[0]['postevent_solana_cumulative_mints']!=30181 or \
    rows[-1]['postevent_solana_cumulative_mints']!=63890 or len(witnesses)!=2:
  raise ValueError('R29_V28_24_ORIGINAL_SOURCE_FRAME_ENDCOUNTS_WRONG')
 return rows

def report_markdown(rows):
 lines=[
  '# R29 – Alle 24 Scanner am 12. Oktober 2026',
  '',
  'Zeiten in UTC. Scan 1 = 00:00, Scan 24 = 23:00; 13.10. 00:00 ist das exklusive Ende.',
  '',
  '**Methodik:** 24 **simulierte Software-Scanzeitpunkte**, NICHT 24 tatsächliche GPT-Reviews. Die BUY/HOLD/SELL-Spalten sind der unveränderte, bereits ausgeführte historische Modell-/Client-Ledger. Rückblickende Solana-Mints sind KEINE GPT-Live-Discovery.',
  '',
  '| Scan | UTC | Retrospektive Solana-Mints im 2-Tage-Speicher | Neu seit Scan davor | BUY | HOLD | SELL | Historisches Fremd-Sell, erst später bestätigt |',
  '|---:|---|---:|---:|---|---|---|---|'
 ]
 for r in rows:
  action=lambda k:', '.join((a.get('symbol') or a['key']) for a in r[k]) or '–'
  extra=', '.join(x['symbol']+' (2 Fremdverkäufe, KEIN Bot-Verkauf)' for x in r['postevent_original_chain_other_wallet_sells']) or '–'
  lines.append('| '+str(r['scan_number'])+' | '+r['at_utc'][11:16]+' | '+format(r['postevent_solana_cumulative_mints'],',')+
   ' | '+format(r['postevent_solana_new_mints_since_last_tick'],',')+' | '+action('model_BUY')+
   ' | '+action('model_HOLD')+' | '+action('model_SELL')+' | '+extra+' |')
 lines+=['',
  '### Die Bilanz dieser eingefrorenen Diagnose',
  '',
  '- **0 BUY, 0 HOLD, 0 SELL**, 0 verifizierte GPT-Reviews und 0 Windows-Paper-Fills. Grund: keine ursprünglichen, zeitgerecht belegten ausführbaren Oktober-Quotes. Das ist kein Markt- oder Strategieleistungsnachweis.',
  '- TANK ist nur bei Scan 3 (02:00 UTC) und ARIANA nur bei Scan 19 (18:00 UTC) als **post-event recherchierte Original-Blockchain-Aktivität** vermerkt. Der Bot hat sie **nicht** gekauft, gehalten oder verkauft.',
  '- Die Rohdatenwerte stammen aus einer später veröffentlichten, unvollständigen Solana-Quelle vom 11./12. Oktober. Die 30.181 Mints bei Scan 1 umfassen bereits den Vortag; die Veränderungen sind zusätzliche **kumulativ eindeutige** Mint-Adressen seit dem vorherigen Stundenstichtag, keine vollständigen weltweiten neuen Tokenstarts.',
  '- WATCH darf nie als HOLD gezählt werden. HOLD setzt eine offen belegte eigene Kaufposition voraus.',
  '- Zukunftsorientierte 4/8/12/24 GPT-Vollreviews und stündliche marktseitige Scans sind getrennte Dinge. Diese 24 Diagnosetakte erzwingen keinen 24/Tag-GPT-Live-Betrieb.',
  '- Der 65er-Gewinner-Oracle-Datensatz bleibt ausschließlich POSTRUN und ist nicht Quelle der 24 Entscheidungen.',
  '',
  '### Echte vorliegende Originalquellen',
  '',
  '- Eingefrorener historischer 24-Takte-Diagnoselauf: GitHub Actions #45257966772.',
  '- Vollständige retro Solana-Rohsource und stündliche Forschungsframes: GitHub Actions #45272055484.',
  '- Originale TANK/ARIANA-Drittverkäufe: GitHub Actions #45276830073.',
  '- 0 authentifizierte, zeitgerechte unabhängige 50-TEST-USDC-BUY/SELL-Quoten; QA-04 unverändert NICHT FREI (13/60 = 21,67 %).'
 ]
 return '\n'.join(lines)+'\n'

def main():
 if len(sys.argv)!=5:raise SystemExit('usage: v28.py <extracted-v22> <extracted-v26> <extracted-v27> <output>')
 if os.environ.get('GITHUB_REF')!='refs/heads/codex/r29-cleanroom-paper-20261121' or \
    not re.fullmatch('[0-9a-f]{40}',os.environ.get('GITHUB_SHA','')):
  raise ValueError('V28_NOT_A_GUARDED_CLEANROOM_RESEARCH_RUN')
 changed=subprocess.check_output(['git','diff-tree','--no-commit-id','--name-only','-r',
     os.environ['GITHUB_SHA']],text=True).strip().splitlines()
 if len(changed)!=1 or not re.fullmatch(
   'research/24-scan-ledger-requests/2026-11-23/[A-Za-z0-9_-]+[.]json',changed[0]):
  raise ValueError('V28_NOT_EXPLICIT_SINGLE_REQUEST_COMMIT')
 req=changed[0]
 q=json.loads(Path(req).read_text())
 if q.get('kind')!='R29_V28_EXPLICIT_24_SCAN_BUY_HOLD_SELL_LEDGER' or \
    q.get('schema')!=1 or q.get('read_only') is not True or \
    q.get('no_oracle_winner_seed') is not True or \
    q.get('no_order_or_wallet_changes') is not True:
  raise ValueError('V28_EXPLICIT_RESEARCH_REQUEST_INVALID')
 v22,v26,v27=map(Path,sys.argv[1:4])
 a='v19-hourly-user-oct12-45257966772-'
 def j(file,pin):return json.loads(verify_bytes(file,HASH[pin]))
 cmp=j(v22/(a+'comparison.json'),'comparison')
 decisions=j(v22/(a+'decisions.json'),'decisions')
 receipt=j(v22/(a+'receipt.json'),'receipt')
 manifest=j(v26/'v26-full-two-day-source-45272055484'/'final-audit.json','v26manifest')
 raw=gzip.decompress(verify_bytes(v26/'v26-full-two-day-source-45272055484'/
    'neutral-oct12-full-feature-mint-visibility.json.gz',HASH['v26tape']))
 tape=json.loads(raw)
 chain=j(v27/'v27-source-chain-bridge-45276830073'/'join-report.json','v27join')
 rows=join_24(cmp,decisions,receipt,manifest,tape,chain)
 out=Path(sys.argv[4]);out.mkdir(parents=True,exist_ok=True)
 summary={'schema':1,'kind':'R29_V28_ALL_24_HISTORICAL_SCANS_EXACT_BUY_HOLD_SELL_AUDIT',
  'date':'2026-10-12','source_evidence_runs':[45257966772,45272055484,45276830073],
  'source_sha256_pins':HASH,'scan_count':24,'model_BUY_count':0,'model_HOLD_count':0,
  'model_SELL_count':0,'actual_client_BUY_count':0,'actual_client_HOLD_count':0,
  'actual_client_SELL_count':0,'genuine_historical_GPT_reviews':0,
  'later_original_chain_third_party_sells':4,
  'full_raw_retro_solana_mints_before_scan_1':30181,
  'full_raw_retro_solana_mints_before_scan_24':63890,
  'historic_quote_eligibility_confirmed':False,'postevent_oracle_in_model':False,
  'original_QA04_accepted':False,'nonbacktest_pass_count':13,
  'nonbacktest_total':60,'scans':rows}
 (out/'24-scans.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n')
 (out/'24-scans.md').write_text(report_markdown(rows))
 with (out/'24-scans.csv').open('w',newline='') as fh:
  w=csv.writer(fh);w.writerow(['scan','utc','retro_solana_mints','new_distinct_retro_mints',
     'BUY','HOLD','SELL','postevent_third_party_sells','original_trade_quotes_verified'])
  for r in rows:
   w.writerow([r['scan_number'],r['at_utc'],r['postevent_solana_cumulative_mints'],
     r['postevent_solana_new_mints_since_last_tick'],
     ';'.join(x['symbol'] or x['key'] for x in r['model_BUY']),
     ';'.join(x['symbol'] or x['key'] for x in r['model_HOLD']),
     ';'.join(x['symbol'] or x['key'] for x in r['model_SELL']),
     ';'.join(x['symbol'] for x in r['postevent_original_chain_other_wallet_sells']),
     False])
 print('R29_V28_ALL_24_SCANS_COMPLETE',json.dumps({'scans':len(rows),
  'BUY':0,'HOLD':0,'SELL':0,'original_GPT_reviews':0,'client_fills':0,
  'source_mints_at_scan1':rows[0]['postevent_solana_cumulative_mints'],
  'source_mints_at_scan24':rows[-1]['postevent_solana_cumulative_mints'],
  'original_other_trader_sells':4,'output':str(out)}),flush=True)
if __name__=='__main__':main()
