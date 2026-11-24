#!/usr/bin/env python3
"""R29 V2.9: actual historical feature rows -> candidate research funnel.
The source was PUBLISHED AFTER the historical period. No original Oct
provider/GPT data delivery or executable prices are claimed. No orders.
"""
import csv,hashlib,importlib.util,json,os,re,subprocess,sys
from pathlib import Path
from urllib.request import Request,urlopen
spec=importlib.util.spec_from_file_location('v29funnel',Path(__file__).resolve().parents[1]/'src/v29-retro-candidate-funnel.py')
funnel=importlib.util.module_from_spec(spec);spec.loader.exec_module(funnel)
REV='9b9a04e7e3e85775d614d16105daad2e69ce8544'
FILES={
 '2026-10-11':(121882,'31ee4072b892ac91def9ea64152426acb3f4c7a1749ce63085203bc44f5be786'),
 '2026-10-12':(137969,'c455b6b6761aba0ff17337e018d068f256f4141be8290e7cbde615d6457bd20d')}
V26_SHA='40c8578fb30537e5b0bb5c8396b10f53f022bf51593fdf2581d1b55c15eea532'
def sha(x):return hashlib.sha256(x).hexdigest()
def checked(b,pin):
 if sha(b)!=pin:raise ValueError('V29_SHA_MISMATCH')
 return b
def require_request():
 if os.getenv('GITHUB_REF')!='refs/heads/codex/r29-cleanroom-paper-20261121' or not re.fullmatch('[a-f0-9]{40}',os.getenv('GITHUB_SHA','')):
  raise ValueError('V29_CLEANROOM_RESEARCH_ONLY')
 changed=subprocess.check_output(['git','diff-tree','--no-commit-id','--name-only','-r',os.environ['GITHUB_SHA']],text=True).strip().splitlines()
 if len(changed)!=1 or not re.fullmatch('research/replay-v29-requests/2026-11-24/[A-Za-z0-9_-]+[.]json',changed[0]):
  raise ValueError('V29_SINGLE_REQUEST_COMMIT_REQUIRED')
 a=json.loads(Path(changed[0]).read_text())
 if a.get('schema')!=1 or a.get('kind')!='R29_V29_USER_AUTHORIZED_FULL_RETRO_SOURCE_TO_CANDIDATE_REPLAY' or a.get('source_revision')!=REV or a.get('max_pinned_original_parquets')!=2 or a.get('no_wallet_or_order_writes') is not True or a.get('no_lookahead_or_oracle') is not True or a.get('research_only') is not True:
  raise ValueError('V29_EXPLICIT_RESEARCH_ONLY_REQUEST_INVALID')
def load_parquet(day,out):
 import pyarrow.parquet as pq
 n,pin=FILES[day]
 url=f'https://huggingface.co/datasets/loopholetape/pumpfun-launches/resolve/{REV}/data/features/{day}.parquet'
 with urlopen(Request(url,headers={'User-Agent':'r29-research-only-24-scan/1.0'}),timeout=120) as response:
  b=response.read(12_000_001)
 if len(b)>12_000_000 or sha(b)!=pin:raise ValueError('V29_PARQUET_SOURCE_SHA_FAIL_'+day)
 p=out/(day+'.parquet');p.write_bytes(b)
 parquet=pq.ParquetFile(p)
 if parquet.metadata.num_rows!=n:raise ValueError('V29_PARQUET_ROWS_CHANGED')
 if not set(funnel.ALLOWED_COLUMNS).issubset(parquet.schema_arrow.names):
  raise ValueError('V29_ASOF_FEATURE_SCHEMA_UNEXPECTED')
 # Crucial: never materialize outcome labels, future returns, or capture_lag_s.
 rows=parquet.read(columns=list(funnel.ALLOWED_COLUMNS)).to_pylist()
 p.unlink()
 print('R29_V29_SOURCE_PIN',json.dumps({'day':day,'rows':len(rows),'sha256':pin,'outcome_columns_loaded':[]}),flush=True)
 return rows
def render_md(frames):
 lines=[
  '# R29 V2.9 – Alle 24 Scans: echte Rohfeatures → Kandidatenbewertung',
  '',
  'Historischer Forschungstag 12. Oktober 2026 (UTC), zunächst nur SOL-Pump.fun-Provider. Die Features wurden **erst später veröffentlicht**. Die Screening-Entscheidungen sind daher kontrafaktische Forschungsbewertungen, KEINE historischen GPT-Orders.',
  '',
  '| Scan | UTC | Mints kumulativ (rückblickend) | Frisch 10m | Screening-PASS, Handelsquote fehlt | BUY | HOLD | SELL | Drei beste Forschungs-Mints |',
  '|---:|:---:|---:|---:|---:|:---:|:---:|:---:|---|']
 for s in frames:
  names=', '.join(x['mint'][:7]+'…'+x['mint'][-6:] for x in s['top_research_candidates_not_orders'][:3]) or '–'
  lines.append(f"| {s['scan']} | {s['at_utc'][11:16]} | {s['cumulative_distinct_mints_retro']:,} | {s['fresh_distinct_mints_in_last_10m_retro']:,} | {s['screen_pass_with_unknown_executable_quotes']:,} | – | – | – | {names} |")
 lines.extend([
  '',
  '### Warum weiterhin keine tatsächlichen BUY / HOLD / SELL?',
  '',
  'Die neue Verbindung von Dot2 nach Dot3 arbeitet: echte, zuvor zeitgestempelte Model-Features werden chronologisch und mit 60 Sekunden Finalisierungsfrist geprüft; Screening-PASS ist eine Warteschlange zur unabhängigen Pool-, Risiko- und Kursprüfung.',
  'Die Quelle enthält KEINEN historisch für R29 belegten Pool-/Zweiwege-50-USDC-Quote-, Gebühren-, Slippage- und Tokenrecht-Sicherheitsnachweis. Der tatsächliche zuvor eingefrorene V2.8-24-Scan-Bot-Ledger bleibt 0 BUY, 0 HOLD, 0 SELL, 0 authentifizierte GPT-Reviews, 0 Client-Fills.',
  'Eine Forschungs-Kandidatenempfehlung ist ausdrücklich KEINE ausgeführte Order, keine SOL/USDC-Preisfeststellung und kein Profit. Keine späteren Rug-/Graduation-/Peak-/Outcome-Felder wurden in den Filter eingelesen. Das Source-Publishing nach Oktober beweist keine ursprüngliche Providerlieferung.',
  'Das vollständige Ergebnis mit ganzen Mint-Adressen, Prüfmerkmalen, Ablehnungsgründen und Stundenstichtagen steht in der gleichzeitig erzeugten JSON-Datei. Die Original-Rohpopulation bleibt im v26-Audit enthalten.',
  ''])
 return '\n'.join(lines)
def main(archive,outarg):
 require_request()
 old=json.loads(checked((Path(archive)/'v26-full-two-day-source-45272055484'/'final-audit.json').read_bytes(),V26_SHA))
 if old.get('total_source_feature_rows_oct11_and_oct12')!=259851 or old.get('original_provider_delivery_in_october_proven') is not False:
  raise ValueError('V29_V26_SOURCE_INTEGRITY_MISSING')
 frozen=json.loads(Path('research/audits/2026-11-23/r29-v28-all-24-scanners-trade-evidence-summary.json').read_text())
 out=Path(outarg);out.mkdir(parents=True,exist_ok=True)
 records=[]
 for day in FILES:records.extend(load_parquet(day,out))
 frames=funnel.build_24_scan_research(records,topn=8)
 funnel.validate_frozen_model(frozen,frames)
 for i,frame in enumerate(frames):
  prior=old['per_scan_counts'][i]
  if prior['scan_at_utc']!=frame['at_utc'] or prior['mint_count']!=frame['cumulative_distinct_mints_retro'] or prior['row_count']!=frame['source_event_rows_known_retro']:
   raise ValueError('V29_SAME_RAW_ARCHIVE_HOURLY_COUNTS_DIFFER_FROM_V26')
 report={'schema':1,'kind':'R29_V29_24_SCAN_ACTUAL_FEATURE_FUNNEL_RESEARCH_NOT_TRADING',
  'source_research_revision':REV,'original_raw_rows':len(records),
  'first_scan_market_history_mints':frames[0]['cumulative_distinct_mints_retro'],
  'last_scan_market_history_mints':frames[-1]['cumulative_distinct_mints_retro'],
  'research_screen_pass_occurrences':sum(x['screen_pass_with_unknown_executable_quotes'] for x in frames),
  'original_provider_data_delivered_to_gpt_at_october_ticks_proven':False,
  'original_historical_two_way_50usdc_quotes_proven':False,
  'original_actual_bot_BUY':0,'original_actual_bot_HOLD':0,'original_actual_bot_SELL':0,
  'original_authenticated_gpt_dot_reviews':0,'original_windows_client_fills':0,
  'postevent_winners_or_future_outcomes_loaded':False,
  'screened_candidates_never_promoted_to_orders':True,
  'source_sha256_by_day':{x:FILES[x][1] for x in FILES},
  'scans':frames}
 (out/'24-scans.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 (out/'24-scans.md').write_text(render_md(frames)+'\n')
 with (out/'24-scans.csv').open('w',newline='') as f:
  writer=csv.writer(f);writer.writerow(['scan','utc','historical_research_mints','fresh_10m','screen_pass_quote_missing','BUY','HOLD','SELL','top3_mints'])
  for s in frames:writer.writerow([s['scan'],s['at_utc'],s['cumulative_distinct_mints_retro'],s['fresh_distinct_mints_in_last_10m_retro'],s['screen_pass_with_unknown_executable_quotes'],'','','',';'.join(x['mint'] for x in s['top_research_candidates_not_orders'][:3])])
 print('R29_V29_RESEARCH_CANDIDATE_24_SCANS_COMPLETE',json.dumps({'scans':24,'source_rows':len(records),
  'screen_pass_occurrences':report['research_screen_pass_occurrences'],
  'screen_pass_at_00':frames[0]['screen_pass_with_unknown_executable_quotes'],
  'screen_pass_at_23':frames[23]['screen_pass_with_unknown_executable_quotes'],
  'BUY':0,'HOLD':0,'SELL':0,'client_fills':0,'report':str(out/'24-scans.md')}),flush=True)
if __name__=='__main__':
 if len(sys.argv)!=3:raise SystemExit('usage: v29.py <v26-original-artifact-root> <output-dir>')
 main(sys.argv[1],sys.argv[2])
