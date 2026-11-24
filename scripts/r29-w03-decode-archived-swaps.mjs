// W03 explicit offline decode of the already archived 9 raw RPC replies.
import {readFile,mkdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {resolve,join} from 'node:path';import {homedir} from 'node:os';
import {decodeHistoricalSwapFlow} from '../src/r29-historical-swap-flow.mjs';
import {fingerprintProtectedFiles,assertProtectedFilesUnchanged} from '../src/v19-replay-isolation.mjs';
const pins=[
  {
    "id": 1,
    "method": "getSignaturesForAddress",
    "params": [
      "DyxRTvjpxFCe8dJQ4ivtrcpRgXGUEA1vLTYpscaU8NBY",
      {
        "limit": 1000,
        "commitment": "finalized"
      }
    ],
    "http_status": 200,
    "sha256": "a1b66ca14ef4e60ab0374bd04df879fce4fea451b8e448dc46803add44a91247",
    "captured_at_utc": "2026-11-24T07:49:59.487Z",
    "state": "RETURNED"
  },
  {
    "id": 2,
    "method": "getTransaction",
    "params": [
      "2oT7FpsSmKGmouv1HyL9JwvXP4JuyhqyMC87PsdpPo17xmPoa1dRQZnL8u5a9hMVj5ipmN3DaBubWff9jjE5tC3j",
      {
        "encoding": "jsonParsed",
        "commitment": "finalized",
        "maxSupportedTransactionVersion": 1
      }
    ],
    "http_status": 200,
    "sha256": "47a694a8680d01541df67ad758210332d9e072577d46f80b28bd3ec6d72d4bf9",
    "captured_at_utc": "2026-11-24T07:49:59.917Z",
    "state": "RETURNED"
  },
  {
    "id": 3,
    "method": "getTransaction",
    "params": [
      "3f9VxcAZMN96KDpoW8v2ZZQYyr4PjL7vR6Nm4tKtGNB39sZtRAbaS56gm5ybkWty67nNbHAs25Y7AAAmFCGpVhXj",
      {
        "encoding": "jsonParsed",
        "commitment": "finalized",
        "maxSupportedTransactionVersion": 1
      }
    ],
    "http_status": 200,
    "sha256": "110f920ac92f94978a414b4555a426dccd573087b6f9a3d4dc34cb517f5b84cc",
    "captured_at_utc": "2026-11-24T07:50:00.506Z",
    "state": "RETURNED"
  },
  {
    "id": 4,
    "method": "getSignaturesForAddress",
    "params": [
      "DpThJ5k2pXuwtZeAysbjcafjWzRHgqSwYZmih1xupump",
      {
        "limit": 1000,
        "commitment": "finalized"
      }
    ],
    "http_status": 200,
    "sha256": "dce200085d516a8d63563635fdd4d4736cb6833a3b2eac7632ea11b9491fbfc9",
    "captured_at_utc": "2026-11-24T07:50:00.861Z",
    "state": "RETURNED"
  },
  {
    "id": 5,
    "method": "getTransaction",
    "params": [
      "2PxgjemeY3cCA5vxQ9wEC2Ap7yk2FkU7L3K2WgNL3m7Ju3Uv1YDaNK1sjQh3eq5iH1r3cnvfnRF8KmX4EUvnERwn",
      {
        "encoding": "jsonParsed",
        "commitment": "finalized",
        "maxSupportedTransactionVersion": 1
      }
    ],
    "http_status": 200,
    "sha256": "422c7db0a004607f3f2303d90190ab7af90f9b5bc795ad39d7f18949a221d9ce",
    "captured_at_utc": "2026-11-24T07:50:01.249Z",
    "state": "RETURNED"
  },
  {
    "id": 6,
    "method": "getTransaction",
    "params": [
      "mf6XMv3dYj6N3p4SHC5ynUSPtb8mTKuJycPW9EYBwEQyUjsRxwdLkUhLCeKS6Tap9nw9KZKSndfg6ivBGZdp9Gi",
      {
        "encoding": "jsonParsed",
        "commitment": "finalized",
        "maxSupportedTransactionVersion": 1
      }
    ],
    "http_status": 200,
    "sha256": "c67a248dd5d5e361d902211250f56fa63c41b49f7d48c54ec5e0e0dd42b198e7",
    "captured_at_utc": "2026-11-24T07:50:01.520Z",
    "state": "RETURNED"
  },
  {
    "id": 7,
    "method": "getSignaturesForAddress",
    "params": [
      "HjSHamminSCgriev8fW6x8nKr9NxDccMA6JY3iRHpump",
      {
        "limit": 1000,
        "commitment": "finalized"
      }
    ],
    "http_status": 200,
    "sha256": "304ca2d4a2cfb4e7aea7955d519aa82d92064f0c47bd38b69319717c955dde8e",
    "captured_at_utc": "2026-11-24T07:50:01.838Z",
    "state": "RETURNED"
  },
  {
    "id": 8,
    "method": "getTransaction",
    "params": [
      "4dV6Fi1xLVjNrptPLa6kUiTnvh8ZKo45b17xbeUNHtgQo1rqtRnU9duB8Jo5tZPXQMvc4gaFs1AEUbnwitBCFD5C",
      {
        "encoding": "jsonParsed",
        "commitment": "finalized",
        "maxSupportedTransactionVersion": 1
      }
    ],
    "http_status": 200,
    "sha256": "fed21e9516d2884aa5851e17836b0b814b36d4c9acd6233165abe64eb2b48788",
    "captured_at_utc": "2026-11-24T07:50:02.137Z",
    "state": "RETURNED"
  },
  {
    "id": 9,
    "method": "getTransaction",
    "params": [
      "4XrM8bEQpnnkEwL8jvsByA99dxMoBB8LwUN1QnqZ3YZaXPJHxe9k3wTC9T77F2DY8nnkoUinGTSKoez3Ex4jv8EH",
      {
        "encoding": "jsonParsed",
        "commitment": "finalized",
        "maxSupportedTransactionVersion": 1
      }
    ],
    "http_status": 200,
    "sha256": "7ac851b138a39cd60432f1b070e31065845fe7880fe03cf091f67fb9b91871c0",
    "captured_at_utc": "2026-11-24T07:50:02.451Z",
    "state": "RETURNED"
  }
];
const sha=x=>createHash('sha256').update(x).digest('hex');
const commit=process.env.GITHUB_SHA,run=process.env.GITHUB_RUN_ID;
if(process.env.GITHUB_REF!=='refs/heads/codex/r29-cleanroom-paper-20261121'||!/^\d+$/.test(run||''))throw Error('WRONG_BRANCH');
const changes=execFileSync('git',['diff-tree','--no-commit-id','--name-only','-r',commit],{encoding:'utf8'}).trim().split('\n');
if(changes.length!==1||!/^research\/w03-archive-requests\/2026-11-24\/[\w-]+\.json$/.test(changes[0]))throw Error('EXPLICIT_REQUEST_REQUIRED');
const request=JSON.parse(await readFile(changes[0],'utf8'));
if(request.kind!=='R29_W03_ARCHIVED_ECONOMIC_FLOW'||request.source_run!==45351015863||request.offline_only!==true||request.no_orders!==true)throw Error('WRONG_REQUEST');
const protectedPaths=[resolve('signals/index.json'),resolve(join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json'))];
const before=await fingerprintProtectedFiles(protectedPaths);
const base='probe-artifacts/w03-original/v210-evidence-45351015863';
const known=JSON.parse(await readFile('research/audits/2026-11-24/r29-v210-actual-comparison-and-midnight-chain.json','utf8')).midnight_chain.chain;
const raw=new Map();
for(const p of pins){const body=await readFile(base+'/rpc-'+p.id+'.json','utf8');if(sha(body)!==p.sha256)throw Error('PIN_MISMATCH_'+p.id);raw.set(p.id,body);}
const rows=[],plans=[];
for(const c of known){
 const tick=Date.parse(c.scan_at)/1000;
 for(const d of c.details){const p=pins.find(x=>x.id===d.receipt_id);if(p.method!=='getTransaction'||p.params[0]!==d.signature)throw Error('SOURCE_TARGET_MISMATCH');
  const row=decodeHistoricalSwapFlow({raw:raw.get(p.id),expectedSha256:p.sha256,receiptId:p.id,signature:d.signature,mint:c.mint,slot:d.slot,blockTime:d.block_time,scanAtUtc:c.scan_at});
  rows.push(row);console.log('R29_W03_FLOW',JSON.stringify({...row,mint_balance_rows:undefined,native_system_transfers:undefined,matched_pool_candidates:undefined}));}
 const pg=pins.find(x=>x.id===c.pages[0].id);
 if(pg.method!=='getSignaturesForAddress'||pg.params[0]!==c.mint)throw Error('MINT_PAGE_MISMATCH');
 const page=JSON.parse(raw.get(pg.id));
 if(page.id!==pg.id||!Array.isArray(page.result)||page.error)throw Error('BAD_SIGNATURE_PAGE');
 const already=new Set(c.details.map(d=>d.signature));
 const nearby=page.result.filter(x=>typeof x.signature==='string'&&!already.has(x.signature)&&x.err===null&&Number.isInteger(x.blockTime)&&x.blockTime>=tick-600&&x.blockTime<tick-60);
 const chosen=[...new Map(nearby.map(x=>[x.signature,x])).values()].sort((a,b)=>b.blockTime-a.blockTime||a.signature.localeCompare(b.signature)).slice(0,2);
 plans.push({mint:c.mint,scan_at:c.scan_at,archived_page_sha256:pg.sha256,remaining_prescan_signatures:nearby.length,proposed_complementary_details:chosen.map(x=>({signature:x.signature,slot:x.slot,block_time:x.blockTime,direction:'UNKNOWN_UNTIL_DECODED'})),not_requested:true});
}
if(rows.length!==6)throw Error('EXPECTED_SIX');
const out='probe-artifacts/w03-flow-'+run;await mkdir(out,{recursive:true});
const summary={kind:'R29_W03_ARCHIVED_ECONOMIC_FLOW',source_run:45351015863,source_pins:pins,transactions:6,correlated_pool_flows:rows.filter(x=>x.observed_flow).length,observed_buy_flows:rows.filter(x=>x.observed_flow&&x.side==='BUY').length,observed_sell_flows:rows.filter(x=>x.observed_flow&&x.side==='SELL').length,model_quote_ready:0,provider_rpc_calls:0,orders:0,rows,plans};
await writeFile(out+'/economic-flows.json',JSON.stringify(summary,null,2)+'\n');
console.log('R29_W03_RESULT',JSON.stringify({...summary,source_pins:undefined,rows:undefined}));
assertProtectedFilesUnchanged(before,await fingerprintProtectedFiles(protectedPaths));
