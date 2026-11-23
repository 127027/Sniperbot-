#!/usr/bin/env python3
"""R29 V2.7 READ-ONLY cross-archive evidence bridge.

Inputs:
 * v26 verified all-mint October feature timeline, 11-12 October, published later.
 * v19 original Solana getTransaction byte blobs (four sell transactions).
 * v19 SHA-pinned sell-instruction forensic result.
Outputs:
 * exact two-asset observational timeline, evidence ledger and missing proof gates.

Zero API calls, zero orders, zero buyer-price extrapolation, no winner oracle.
This does NOT attest that a GPT/Dot received any of these sources in October.
"""
import gzip
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import defaultdict
from datetime import datetime,timezone
from decimal import Decimal
from pathlib import Path

PIN_V26_MANIFEST="40c8578fb30537e5b0bb5c8396b10f53f022bf51593fdf2581d1b55c15eea532"
PIN_V26_GZIP="ad5defbfd86a3f230e0924b0feddd5ab6af592e4dee276570be6835e88c490e6"
PIN_ORIGINAL_SELL_AUDIT="e88ca1d749bd502ff64d3e1b442f2c265bc5272dea2ab71678e22012a3ed0c25"
PIN_REVISION="9b9a04e7e3e85775d614d16105daad2e69ce8544"
TOKEN_PROGRAM_2022="TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
SELL_PROGRAM="6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
UTC=timezone.utc
TARGETS=[
 dict(name="TANK",scan="2026-10-12T02:00:00.000Z",
      mint="3nXL1jYC4rTL9hWnEYz1w4WkbbKceFmb5jxX7RL5pump",
      pool="CTemNiKyDcmqrYMB2EF6fp4LcRprYm7LeCBoM14228sT",
      expected_sells=2),
 dict(name="ARIANA",scan="2026-10-12T18:00:00.000Z",
      mint="28FFbG2j5d5XGvyuLSdDixAgQnmN4YDZqmSVbbzJpump",
      pool="8TgpUYKfnG2UM43rFQMV9v3XRiciAqqDSp8BgXSBcq7P",
      expected_sells=2)
]
V26_PATH="v26-full-two-day-source-45272055484"
SELL_PATH="r29-oct12-original-third-party-sells-45166769490"
TX_PATH="r29-oct12-tx-v1-45135625789"

def digest(b):return hashlib.sha256(b).hexdigest()
def utc_ms(value):
    if not isinstance(value,str) or not value.endswith("Z"):
        raise ValueError("UTC_TIMESTAMP_WITH_Z_REQUIRED")
    return datetime.fromisoformat(value.replace("Z","+00:00")).timestamp()*1000
def fingerprint_file(path,pin):
    b=Path(path).read_bytes()
    if digest(b)!=pin:
        raise ValueError("R29_V27_SOURCE_HASH_MISMATCH:"+str(path))
    return b

def research_feature_at_scan(frames,target):
    frame=next((f for f in frames if f.get("scan_at_utc")==target["scan"]),None)
    if not frame:raise ValueError("V27_MISSING_FROZEN_HOURLY_SCAN")
    target_mint=target["mint"]
    hits=[r for r in frame.get("research_only_mints",[]) if r.get("mint")==target_mint]
    if len(hits)!=1:raise ValueError("V27_EXACT_NEUTRAL_MINT_NOT_FOUND_ONCE")
    hit=hits[0]
    first=utc_ms(hit["first_feature_at_utc"])
    last=utc_ms(hit["last_feature_before_scan_utc"])
    scan=utc_ms(target["scan"])
    if first>last or last>=scan or hit["feature_occurrences_before_scan"]<1:
        raise ValueError("V27_FUTURE_FEATURE_OR_INVALID_TIME")
    return {
     "mint":target_mint,
     "first_reconstructed_feature_at_utc":hit["first_feature_at_utc"],
     "last_reconstructed_feature_before_scan_utc":hit["last_feature_before_scan_utc"],
     "reconstructed_feature_occurrences_before_scan":hit["feature_occurrences_before_scan"],
     "first_feature_lead_ms_before_scan":int(scan-first),
     "last_feature_lead_ms_before_scan":int(scan-last),
     "raw_hour_candidate_count":frame["neutral_distinct_mints_in_two_day_history"],
     "feature_is_original_october_provider_delivery_proof":False
    }

def validate_original_tx(raw,obs,target):
    """Recalculate pool SOL and exact owner-token balance changes from
    ORIGINAL SHA-pinned Solana RPC bytes, not from seller's summary claims.
    Token movement and SOL movement are not independent quoted prices.
    """
    if digest(raw)!=obs.get("source_sha256"):
        raise ValueError("V27_ORIGINAL_SOLANA_TX_RAW_BYTES_MODIFIED")
    tx=json.loads(raw).get("result")
    if not isinstance(tx,dict) or tx.get("meta",{}).get("err") is not None:
        raise ValueError("V27_TX_NOT_SUCCESSFUL")
    if tx.get("slot")!=obs.get("slot"):
        raise ValueError("V27_ORIGINAL_SLOT_MISMATCH")
    signature=obs.get("original_signature")
    if signature not in tx.get("transaction",{}).get("signatures",[]):
        raise ValueError("V27_ORIGINAL_SIGNER_SIGNATURE_MISMATCH")
    block=tx.get("blockTime")
    if not isinstance(block,int) or block*1000>=utc_ms(target["scan"]):
        raise ValueError("V27_HISTORICAL_TX_NOT_STRICTLY_BEFORE_SCAN")
    if int(utc_ms(obs.get("block_time_utc"))/1000)!=block:
        raise ValueError("V27_SELL_REPORT_TIME_MISMATCH")
    if obs.get("pool")!=target["pool"] or obs.get("mint")!=target["mint"]:
        raise ValueError("V27_CROSS_CHAIN_MINT_POOL_IDENTITY_MISMATCH")
    if obs.get("token_program_address")!=TOKEN_PROGRAM_2022 or \
       obs.get("sell_program_address")!=SELL_PROGRAM or \
       obs.get("actual_original_third_party_sell_transaction_correlated") is not True or \
       obs.get("transfer_checked_exact_mint_and_pool_delta_matched") is not True:
        raise ValueError("V27_ORIGINAL_SELL_ATTESTATION_MISSING")
    keys=tx.get("transaction",{}).get("message",{}).get("accountKeys")
    if not isinstance(keys,list):raise ValueError("V27_TX_ACCOUNT_KEYS_MISSING")
    keyvals=[x if isinstance(x,str) else x.get("pubkey") for x in keys]
    if keyvals.count(target["pool"])!=1:raise ValueError("V27_POOL_KEY_NOT_UNIQUE")
    ix=keyvals.index(target["pool"])
    m=tx["meta"]
    prebal=m.get("preBalances")
    postbal=m.get("postBalances")
    if not isinstance(prebal,list) or not isinstance(postbal,list):
        raise ValueError("V27_NATIVE_SOL_BALANCE_MISSING")
    lamports_out=int(prebal[ix])-int(postbal[ix])
    if lamports_out<=0 or lamports_out!=int(obs["pool_native_sol_decreased_lamports"]):
        raise ValueError("V27_POOL_NATIVE_SOL_DELTA_NOT_VERIFIED")
    def owner_token(accounts):
        vals={}
        for row in accounts:
            if row.get("owner")==target["pool"] and row.get("mint")==target["mint"] and \
               row.get("programId")==TOKEN_PROGRAM_2022:
                a=row.get("uiTokenAmount",{})
                if int(a.get("decimals",-1))!=int(obs["token_decimals"]):
                    raise ValueError("V27_TOKEN_DECIMALS_CHANGED")
                vals[row["accountIndex"]]=int(a["amount"])
        return vals
    pre=owner_token(m.get("preTokenBalances") or [])
    post=owner_token(m.get("postTokenBalances") or [])
    common=set(pre)&set(post)
    if len(common)!=1:raise ValueError("V27_POOL_TOKEN_ACCOUNT_NOT_UNIQUE")
    token_in=next(post[i]-pre[i] for i in common)
    if token_in<=0 or token_in!=int(obs["raw_mint_token_units_in"]):
        raise ValueError("V27_POOL_TOKEN_IN_DELTA_MISMATCH")
    token_qty=Decimal(token_in)/(Decimal(10)**int(obs["token_decimals"]))
    sol_qty=Decimal(lamports_out)/Decimal(10**9)
    return {
      "original_signature":signature,
      "slot":tx["slot"],
      "block_time_utc":obs["block_time_utc"],
      "original_source_bytes_sha256":digest(raw),
      "original_successful_other_trader_sell":True,
      "confirmed_pool_mint_token_in":str(token_qty),
      "confirmed_pool_native_sol_out":str(sol_qty),
      "native_sol_pool_out_per_mint_token_in_observed_ratio":
          str(sol_qty/token_qty),
      "observed_ratio_is_not_executable_quote":True,
      "sol_usdc_historical_fx_verified":False,
      "full_amm_reserve_and_fee_state_verified":False,
      "client_50usdc_buy_or_sell_verified":False
    }

def join_evidence(frames,observations,read_raw):
    if len(frames)!=24 or len(observations)!=4:
        raise ValueError("V27_REQUIRED_24_HOURLY_AND_FOUR_TX_EVIDENCE")
    if len({x["original_signature"] for x in observations})!=4:
        raise ValueError("V27_DUPLICATE_CHAIN_TX")
    grouped=defaultdict(list)
    for obs in observations:
        if obs.get("coin") not in {"TANK","ARIANA"}:raise ValueError("V27_NOT_NEUTRAL_POOL")
        grouped[obs["coin"]].append(obs)
    output=[]
    for target in TARGETS:
        raw_feature=research_feature_at_scan(frames,target)
        sells=grouped[target["name"]]
        if len(sells)!=target["expected_sells"]:
            raise ValueError("V27_MISSING_OR_EXTRA_HISTORICAL_SELLS")
        transactions=[validate_original_tx(read_raw(o["source_raw_file"]),o,target)
                      for o in sells]
        transactions.sort(key=lambda x:(x["slot"],x["original_signature"]))
        # Millisecond timestamps of features and chain transactions are
        # historically recorded events, NOT provider delivery evidence.
        if not all(utc_ms(q["block_time_utc"])<utc_ms(target["scan"]) for q in transactions):
            raise ValueError("V27_TX_AT_OR_AFTER_DECISION")
        output.append({
          "chain":"solana","coin_label_for_research_only":target["name"],
          "mint":target["mint"],"pool_confirmed_by_original_tx":target["pool"],
          "virtual_scan_at_utc":target["scan"],
          "historical_raw_feature_time_reconstruction":raw_feature,
          "historically_recorded_successful_third_party_sells":transactions,
          "historical_sale_count":len(transactions),
          "historical_event_sequence_found":True,
          "market_population_across_all_chains_complete":False,
          "provider_originally_delivered_feature_to_dot_at_scan":False,
          "chain_tx_confirmation_arrival_before_scan_authenticated":False,
          "publisher_independent_historical_issuer_quote_proven":False,
          "mint_authority_freeze_transfer_hooks_verified":False,
          "executable_50_usdc_bid_and_ask_at_scan_verified":False,
          "size_aware_reserves_impact_fees_and_slippage_verified":False,
          "user_sell_route_blacklist_and_taxes_verified":False,
          "historical_sol_usdc_conversion_independently_verified":False,
          "actual_gpt_dot_buy_sell_journal_verified":False,
          "actual_windows_paper_fill_verified":False,
          "risk_status":"SOURCE_MINT_AND_THIRD_PARTY_SELL_VERIFIED_BUT_TRADE_GATES_BLOCKED",
          "paper_buy_and_sell_authorized":False,
          "why_not_eligible":[
            "RETROSPECTIVE_PARQUET_NOT_ORIGINAL_OCTOBER_PROVIDER_CAPTURE",
            "CHAIN_SLOT_SEEN_IN_NOVEMBER_NOT_CAPTURED_BY_GPT_AT_OCT_SCAN",
            "HISTORICAL_50_USDC_TWO_WAY_EXECUTABLE_QUOTES_MISSING",
            "AMM_RESERVES_AND_FEE_EFFECTS_NOT_AUTHENTICATED",
            "TOKEN_2022_TRANSFER_TAX_HOOK_FREEZE_RISK_NOT_CLEARED",
            "NO_AUTHENTICATED_FIVE_DOT_GPT_OR_WINDOWS_RECEIPTS"]
        })
    return output

def main(v26root,sellroot,txroot,outdir):
    if os.getenv("GITHUB_REF")!="refs/heads/codex/r29-cleanroom-paper-20261121" or \
       not re.fullmatch(r"[0-9a-f]{40}",os.getenv("GITHUB_SHA","")):
        raise ValueError("V27_ISOLATED_CLEANROOM_COMMIT_REQUIRED")
    request="research/full-chain-bridge-requests/2026-11-23/r29-user-go-original-neutral-chain-bridge.json"
    changed=subprocess.check_output(
      ["git","diff-tree","--no-commit-id","--name-only","-r",os.environ["GITHUB_SHA"]],
      text=True).strip().splitlines()
    if changed!=[request]:raise ValueError("V27_EXPLICIT_SINGLE_REQUEST_ONLY")
    req=json.loads(Path(request).read_text())
    if req.get("kind")!="R29_V27_FULL_NEUTRAL_FEATURE_AND_ORIGINAL_CHAIN_SELL_BRIDGE" or \
       req.get("schema")!=1 or req.get("read_only") is not True or \
       req.get("no_winner_oracle") is not True or \
       req.get("no_client_or_wallet_writes") is not True:
        raise ValueError("V27_INVALID_APPROVAL")
    v26root=Path(v26root)/V26_PATH
    sellroot=Path(sellroot)/SELL_PATH
    txroot=Path(txroot)/TX_PATH
    manifest=json.loads(fingerprint_file(v26root/"final-audit.json",PIN_V26_MANIFEST))
    if manifest.get("source_revision")!=PIN_REVISION or \
       manifest.get("total_source_feature_rows_oct11_and_oct12")!=259851 or \
       manifest.get("first_scan_00utc_previous_day_feature_mints")!=30181 or \
       manifest.get("last_scan_23utc_visible_feature_mints")!=63890 or \
       manifest.get("original_provider_delivery_in_october_proven") is not False:
        raise ValueError("V27_RAW_SOURCE_MANIFEST_MISMATCH")
    archive=v26root/manifest["snapshot_file"]
    fingerprint_file(archive,PIN_V26_GZIP)
    with gzip.open(archive,"rt") as f:hourly=json.load(f)
    if hourly.get("kind")!="R29_V26_POSTEVENT_TWO_DAY_ALL_RAW_SOURCE_MINT_HOURLY_VISIBILITY" or \
       hourly.get("original_october_delivery_authenticated") is not False or \
       hourly.get("winner_oracle_accessed") is not False:
        raise ValueError("V27_RAW_PARQUET_SOURCE_NOT_QUARANTINED")
    frames=hourly["frames"]
    if len(frames)!=24:raise ValueError("V27_NOT_24_SCANS")
    for h,frame in enumerate(frames):
        expected="2026-10-12T"+str(h).zfill(2)+":00:00.000Z"
        if frame["scan_at_utc"]!=expected or \
           frame["neutral_distinct_mints_in_two_day_history"]!=manifest["per_scan_counts"][h]["mint_count"] or \
           frame["raw_feature_rows_before_scan"]!=manifest["per_scan_counts"][h]["row_count"] or \
           len(frame["research_only_mints"])!=frame["neutral_distinct_mints_in_two_day_history"]:
            raise ValueError("V27_ORIGINAL_HOURLY_FRAME_COUNT_SHA_FAIL")
    sales=json.loads(fingerprint_file(sellroot/"sell-instructions.json",PIN_ORIGINAL_SELL_AUDIT))
    if sales.get("kind")!="R29_V19_REAL_OCT12_THIRD_PARTY_ORIGINAL_SELLV2_V3_INSTRUCTIONS" or \
       sales.get("sha_pinned_tx_count")!=4 or \
       sales.get("original_qa04_five_gpt_dot_backtest_ready") is not False or \
       sales.get("no_original_winner_oracle_read") is not True:
        raise ValueError("V27_ORIGINAL_SELL_SOURCE_IDENTITY_BAD")
    read_raw=lambda filename:(txroot/filename).read_bytes()
    results=join_evidence(frames,sales["observations"],read_raw)
    out=Path(outdir);out.mkdir(parents=True,exist_ok=True)
    data={
     "schema":1,
     "kind":"R29_V27_SHA_PINNED_FULL_FEATURE_AND_ORIGINAL_THIRD_PARTY_SELL_JOIN",
     "source_commit":os.environ["GITHUB_SHA"],
     "github_run_id":os.getenv("GITHUB_RUN_ID"),
     "raw_full_feature_run_id":"45272055484",
     "raw_full_feature_artifact_id":14865617008,
     "raw_full_feature_manifest_sha256":PIN_V26_MANIFEST,
     "raw_full_feature_gzip_sha256":PIN_V26_GZIP,
     "original_tx_run_id":"45135625789",
     "original_tx_artifact_id":14798694515,
     "original_four_sell_audit_run_id":"45166769490",
     "original_four_sell_audit_artifact_id":14815010884,
     "original_four_sell_audit_sha256":PIN_ORIGINAL_SELL_AUDIT,
     "full_raw_11_and_12_oct_rows_checked":259851,
     "full_reconstructed_sol_mint_population_00_utc":30181,
     "full_reconstructed_sol_mint_population_23_utc":63890,
     "neutral_example_assets_with_reconstructed_pre_scan_feature_and_original_sell_event":2,
     "individual_original_solana_chain_sells_reverified":4,
     "independent_original_october_gpt_data_deliveries_verified":0,
     "historical_bidirectional_executable_50_usdc_quote_pairs_verified":0,
     "actual_buy_orders":0,
     "actual_sell_orders":0,
     "original_qa04_trading_backtest_accepted":False,
     "later_winner_oracle_labels_used":False,
     "source_is_november_research_not_octal_authenticated_gpt":True,
     "results":results
    }
    (out/"join-report.json").write_text(json.dumps(data,indent=2)+"\n")
    print("R29_V27_FULL_RAW_TO_ORIGINAL_CHAIN_SELL_JOIN",json.dumps({
      "matched_neutral_mint_scans":len(results),
      "original_solana_sells_revalidated":4,
      "source_population_before_00":30181,
      "source_population_before_23":63890,
      "original_historical_50_usdc_two_way_quotes":0,
      "actual_gpt_orders":0,
      "historical_backtest_status":"BLOCKED_ORIGINAL_PROVIDER_AND_EXECUTION_EVIDENCE",
      "report_path":str(out/"join-report.json")}),flush=True)

if __name__=="__main__":
    if len(sys.argv)!=5:raise SystemExit("usage: v27.py <v26-extracted> <sells-extracted> <orig-tx-extracted> <out>")
    main(*sys.argv[1:])
