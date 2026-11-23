#!/usr/bin/env python3
"""R29 V2.6: POST-EVENT research-only reconstruction from two entire,
SHA-pinned historical Solana provider Parquet files, NOT 192 eight-per-hour
selected mints. No old bot code, winner list, trading, OpenAI or paid API.
Original provider *delivery* on 12 October remains UNKNOWN.
"""
import gzip
import hashlib
import json
import math
import os
import re
import subprocess
import sys
from datetime import datetime,timezone
from pathlib import Path
from urllib.request import Request,urlopen

REV='9b9a04e7e3e85775d614d16105daad2e69ce8544'
URL='https://huggingface.co/datasets/loopholetape/pumpfun-launches/resolve/'+REV+'/data/features/'
PINS={
 '2026-10-11':(121882,'31ee4072b892ac91def9ea64152426acb3f4c7a1749ce63085203bc44f5be786'),
 '2026-10-12':(137969,'c455b6b6761aba0ff17337e018d068f256f4141be8290e7cbde615d6457bd20d')
}
ORIGINAL_ARCHIVE_SHA={
 '2026-10-11':'7b4e917ec5904ab089452029564baf09fa99bbda9c11e91db8d54a79cd49097c',
 '2026-10-12':'8a03d0b3f065a6f6fd35867cd7c61719fb37f2cca06134aef6a81f14b3d7d3ab'
}
MINT=re.compile(r'^[1-9A-HJ-NP-Za-km-z]{32,44}$')
START=datetime(2026,10,12,tzinfo=timezone.utc).timestamp()
MIN=3600
LIMIT=12_000_000
def sha(data):return hashlib.sha256(data).hexdigest()
def stamp(t):return datetime.fromtimestamp(t,timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')

def neutral_valid_rows(rows,day):
    start=datetime.fromisoformat(day).replace(tzinfo=timezone.utc).timestamp()
    good=[];invalid=0
    for row in rows:
        mint=row.get('mint');t=row.get('t')
        if not isinstance(mint,str) or not MINT.fullmatch(mint) or isinstance(t,bool) or not isinstance(t,(float,int)) or not math.isfinite(t) or not start<=t<start+86400:
            invalid+=1;continue
        # ONLY identity and event timestamp may leave the raw post-event table.
        # Do not load USD prices, model flags, outcomes, rug labels or rankings.
        good.append((float(t),mint))
    return good,invalid

def build_hourly_visibility(events):
    events=sorted(events,key=lambda v:(v[0],v[1]))
    memory={};cursor=0;frames=[]
    for h in range(24):
        cutoff=START+h*MIN
        # Strictly before the hour: equal-timestamp event not yet admitted.
        while cursor<len(events) and events[cursor][0]<cutoff:
            at,mint=events[cursor];seen=memory.get(mint)
            if seen is None:memory[mint]=[at,at,1]
            else:seen[1]=at;seen[2]+=1
            cursor+=1
        identities=[{'mint':key,'first_feature_at_utc':stamp(v[0]),
          'last_feature_before_scan_utc':stamp(v[1]),
          'feature_occurrences_before_scan':v[2]} for key,v in sorted(memory.items())]
        frames.append({'scan_at_utc':stamp(cutoff),
          'neutral_distinct_mints_in_two_day_history':len(identities),
          'raw_feature_rows_before_scan':cursor,
          'research_only_mints':identities})
    return frames

def fetch_pinned(day,path):
    want_rows,want_sha=PINS[day];url=URL+day+'.parquet'
    with urlopen(Request(url,headers={'User-Agent':'r29-raw-neutral-retrospective-research/1.0'}),timeout=120) as r:
        data=r.read(LIMIT+1)
    if len(data)>LIMIT or sha(data)!=want_sha:
        raise ValueError('PINNED_PARQUET_SHA_OR_SIZE_FAILED_'+day)
    path.write_bytes(data)
    return {'day':day,'source_url':url,'raw_sha256':want_sha,
      'expected_feature_rows':want_rows,'raw_size_bytes':len(data)}

def verify_archived_43day_frames(path):
    # The existing GitHub artifact is SHA-pinned to the very same revision.
    # Its 8-mint sample is only a legacy statistical crosscheck, not an input.
    import zipfile
    archive=Path(path)
    if archive.is_dir():
        get=lambda day:(archive/(day+'.json')).read_bytes()
    else:
        z=zipfile.ZipFile(archive)
        get=lambda day:z.read(day+'.json')
    try:
        out={}
        for day in PINS:
            raw=get(day)
            if sha(raw)!=ORIGINAL_ARCHIVE_SHA[day]:
                raise ValueError('ORIGINAL_NEUTRAL_FIVE_MIN_ARCHIVE_SHA_MISMATCH_'+day)
            obj=json.loads(raw)
            if obj.get('source_raw_parquet_sha256')!=PINS[day][1]:
                raise ValueError('NEW_PARQUET_DISAGREES_WITH_PRIOR_PIN_'+day)
            out[day]={'old_frame_sha256':sha(raw),
              'old_frame_raw_parquet_sha256':obj['source_raw_parquet_sha256'],
              'reported_original_8perhour_sample_count':obj['fresh_candidate_occurrences']}
        return out
    finally:
        if not archive.is_dir():z.close()

def main(output,archive):
    if os.getenv('GITHUB_REF')!='refs/heads/codex/r29-cleanroom-paper-20261121':
        raise ValueError('ISOLATED_CLEANROOM_BRANCH_REQUIRED')
    if not re.fullmatch(r'[0-9a-f]{40}',os.getenv('GITHUB_SHA','')):
        raise ValueError('IMMUTABLE_GITHUB_COMMIT_REQUIRED')
    request=os.getenv('R29_V26_EXPLICIT_REQUEST_PATH','')
    if not re.fullmatch(r'research/raw-full-day-requests/2026-11-23/[A-Za-z0-9_-]+\.json',request):
        raise ValueError('ONE_EXPLICIT_RESEARCH_REQUEST_REQUIRED')
    changed=subprocess.check_output(['git','diff-tree','--no-commit-id',
      '--name-only','-r',os.environ['GITHUB_SHA']],text=True).strip().splitlines()
    if changed!=[request]:
        raise ValueError('OTHER_FILES_IN_EXPLICIT_REQUEST_COMMIT')
    permission=json.loads(Path(request).read_text())
    if (permission.get('kind')!='R29_V26_EXPLICIT_FULL_OCT11_OCT12_SHA_PINNED_RAW_RESEARCH'
        or permission.get('schema')!=1 or permission.get('read_only') is not True
        or permission.get('source_revision')!=REV
        or permission.get('max_raw_provider_files')!=2
        or permission.get('no_original_october_data_delivery_claim') is not True
        or permission.get('no_winners_or_trades') is not True):
        raise ValueError('V26_NOT_AUTHORIZED_RAW_RECONSTRUCTION')
    old=verify_archived_43day_frames(archive)
    import pyarrow.parquet as pq
    root=Path(output);root.mkdir(parents=True,exist_ok=True)
    events=[];sources=[]
    for day in PINS:
        dest=root/(day+'.parquet')
        record=fetch_pinned(day,dest)
        f=pq.ParquetFile(dest)
        if f.metadata.num_rows!=PINS[day][0]:
            raise ValueError('PINNED_RAW_ROW_COUNT_MISMATCH_'+day)
        columns=set(f.schema_arrow.names)
        if not {'mint','t','ts'}.issubset(columns):
            raise ValueError('NO_MINT_OR_EVENT_TIME_IN_PARQUET')
        if not ({'rugged','peak_rs','outcome_status'} & columns):
            raise ValueError('EXPECTED_SEPARATE_OUTCOME_COLUMNS_ABSENT')
        # Safest admission: read only identity and timestamp. Do not even
        # materialize the full row with future outcomes in model memory.
        subset=f.read(columns=['mint','t']).to_pylist()
        good,rejected=neutral_valid_rows(subset,day)
        events.extend(good)
        record.update({'raw_rows':f.metadata.num_rows,
          'accepted_event_time_mint_rows':len(good),
          'rejected_invalid_event_time_or_mint_rows':rejected,
          'raw_loaded_columns':['mint','t'],
          'all_later_outcome_columns_excluded':True})
        sources.append(record)
        dest.unlink()
        print('R29_V26_ORIGINAL_RAW_PARQUET_SHA_VERIFIED',json.dumps(record),flush=True)
    frames=build_hourly_visibility(events)
    payload={'schema':1,'kind':'R29_V26_POSTEVENT_TWO_DAY_ALL_RAW_SOURCE_MINT_HOURLY_VISIBILITY',
      'historical_day':'2026-10-12',
      'source_is_retrospective_published_after_historical_day':True,
      'only_one_biased_solana_provider_not_global_market':True,
      'original_october_delivery_authenticated':False,
      'full_historical_client_buy_sell_quote_authenticated':False,
      'winner_oracle_accessed':False,'gpt_trades_authorized':False,
      'frames':frames}
    snapfile=root/'neutral-oct12-full-feature-mint-visibility.json.gz'
    with gzip.GzipFile(filename=str(snapfile),mode='wb',mtime=0) as out:
        out.write((json.dumps(payload,separators=(',',':'))+'\n').encode())
    data=snapfile.read_bytes()
    summary={'schema':1,'kind':'R29_V26_FULL_TWO_DAY_PINNED_RAW_PARQUET_MINT_COVERAGE_AUDIT',
      'source_revision':REV,'original_archive_crosscheck':old,'sources':sources,
      'total_source_feature_rows_oct11_and_oct12':sum(x['raw_rows'] for x in sources),
      'decoded_valid_feature_rows':len(events),
      'historical_hourly_model_wakes':24,
      'prior_192_last8_neutral_sampled_mints':192,
      'prior_24_last5min_window_mint_occurrences':2598,
      'prior_24_last5min_feature_rows':11226,
      'first_scan_00utc_previous_day_feature_mints':frames[0]['neutral_distinct_mints_in_two_day_history'],
      'last_scan_23utc_visible_feature_mints':frames[-1]['neutral_distinct_mints_in_two_day_history'],
      'per_scan_counts':[{'scan_at_utc':f['scan_at_utc'],
        'mint_count':f['neutral_distinct_mints_in_two_day_history'],
        'row_count':f['raw_feature_rows_before_scan']} for f in frames],
      'snapshot_file':snapfile.name,'snapshot_sha256':sha(data),
      'source_retrospective_first_not_original_provider_capture':True,
      'not_all_markets_or_chains':True,
      'original_provider_delivery_in_october_proven':False,
      'historical_buy_sell_quote_pairs_verified':0,
      'historical_sellability_proven':0,
      'real_gpt_decisions':0,'actual_paper_or_real_orders':0,
      'no_code_imports_from_legacy_branch':True}
    (root/'final-audit.json').write_text(json.dumps(summary,indent=2)+'\n')
    print('R29_V26_PINNED_FULL_RAW_MINT_RECONSTRUCTION',json.dumps({
      'two_day_raw_rows':summary['total_source_feature_rows_oct11_and_oct12'],
      'valid_rows':len(events),
      'original_eight_sample_size':192,
      'first_scan_00utc_mints':summary['first_scan_00utc_previous_day_feature_mints'],
      'last_scan_23utc_mints':summary['last_scan_23utc_visible_feature_mints'],
      'original_asof_and_trading_still_blocked':True,'orders':0}),flush=True)

if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit('USAGE: v26.py <artifact-output-dir> <pinned-43day-frame-zip>')
    main(sys.argv[1],sys.argv[2])
