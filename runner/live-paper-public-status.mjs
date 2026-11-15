// R29 live-PAPER autonomous process heartbeat. No balances/positions/wallet keys,
// coin identities, execution envelopes, private activity ledger or profit published.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const REPO='127027/Sniperbot-';
const BRANCH='codex/r29-chatgpt-github-paper-cycle-20261115';
export const AUTOPILOT_PUBLIC_STATUS_PATH='research/r29/channel/live-paper-autopilot-status.json';
const URL='https://api.github.com/repos/'+REPO+'/contents/'+AUTOPILOT_PUBLIC_STATUS_PATH;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const validTime=s=>typeof s==='string'&&s.endsWith('Z')&&Number.isFinite(Date.parse(s));
const int=n=>Number.isInteger(n)&&n>=0&&n<=1000000;

export function sanitizePaperAutoHeartbeat(local){
 if(local?.schema!=='sniper_r29_local_live_paper_autopilot.v1'||
  local.mode!=='PAPER_ONLY'||local.live_trading_enabled!==false||
  local.actual_wallet_access!==false||local.local_signer_only!==true||
  local.expensive_ai_api_required!==false||
  typeof local.enabled!=='boolean'||!int(local.entries_submitted)||
  !int(local.sells_submitted)||!int(local.paper_fills_confirmed)||
  !(local.last_scan_at_utc===null||validTime(local.last_scan_at_utc))||
  typeof local.last_outcome!=='string'||local.last_outcome.length>110||
  !/^[A-Z0-9_]+$/.test(local.last_outcome))
  throw Error('PAPER_AUTOPILOT_HEARTBEAT_INVALID');
 return {schema:'sniper_r29_public_live_paper_autopilot.v1',mode:'PAPER_ONLY',
  research_only:false,live_trading_enabled:false,
  account_balance_or_wallet_published:false,
  executable_commands_published:false,
  process_started:true,enabled:local.enabled,
  last_scan_at_utc:local.last_scan_at_utc,
  last_outcome:local.last_outcome,
  submitted_virtual_buy_count:local.entries_submitted,
  submitted_virtual_sell_count:local.sells_submitted,
  confirmed_virtual_paper_fill_count:local.paper_fills_confirmed,
  verified_actual_wallet_trades:0,
  note:'Virtual simulated activity only. No proof of profitable or executable DEX fills.'};
}

export async function syncLocalPaperAutoHeartbeat({token,fetcher=fetch,
 filename=path.join(process.env.LOCALAPPDATA||path.join(ROOT,'.local'),
  'MemeSniperPaper','live-paper-autopilot','latest.json'),now=Date.now()}={}){
 let local;
 try{
  const raw=await readFile(filename,'utf8');
  if(Buffer.byteLength(raw)>20000)throw Error('PAPER_AUTOPILOT_LOCAL_FILE_TOO_LARGE');
  local=JSON.parse(raw);
 }catch(e){
  if(e.code==='ENOENT')return {status:'WAITING_FOR_LOCAL_AUTOPILOT',
    published:false,skipped:true};
  throw e;
 }
 const status=sanitizePaperAutoHeartbeat(local);
 if(typeof token!=='string'||!/^(?:github_pat_|ghp_)[A-Za-z0-9_]{15,}$/.test(token))
  throw Error('PAPER_AUTOPILOT_TOKEN_REQUIRED');
 const headers={authorization:'Bearer '+token,
  accept:'application/vnd.github+json','content-type':'application/json',
  'X-GitHub-Api-Version':'2022-11-28','user-agent':'SniperR29PaperAutoTelemetry/1'};
 const get=await fetcher(URL+'?ref='+encodeURIComponent(BRANCH),{
  method:'GET',headers,signal:AbortSignal.timeout(12000)});
 let old=null,sha=null;
 if(get.status===200){
  const x=await get.json();
  if(x?.type!=='file'||typeof x.sha!=='string'||!/^[a-f0-9]{40}$/.test(x.sha)||
   x.encoding!=='base64'||typeof x.content!=='string')
   throw Error('PAPER_AUTOPILOT_GITHUB_UNEXPECTED_CONTENTS');
  sha=x.sha;
  old=JSON.parse(Buffer.from(x.content.replace(/\s/g,''),'base64').toString('utf8'));
 }else if(get.status!==404)throw Error('PAPER_AUTOPILOT_GITHUB_GET_HTTP_'+get.status);
 const recent=old&&validTime(old.last_scan_at_utc)&&
  now-Date.parse(old.last_scan_at_utc)>=0&&
  now-Date.parse(old.last_scan_at_utc)<30*60000;
 if(recent&&old.schema===status.schema&&old.last_outcome===status.last_outcome&&
  old.confirmed_virtual_paper_fill_count===status.confirmed_virtual_paper_fill_count&&
  old.submitted_virtual_buy_count===status.submitted_virtual_buy_count&&
  old.submitted_virtual_sell_count===status.submitted_virtual_sell_count&&
  old.enabled===status.enabled)
  return {status:'UNCHANGED',published:false,skipped:true,public:status};
 const body={message:'research(r29): sanitized local virtual paper process telemetry',
  branch:BRANCH,content:Buffer.from(JSON.stringify(status,null,2)+'\n').toString('base64')};
 if(sha)body.sha=sha;
 const put=await fetcher(URL,{method:'PUT',headers,body:JSON.stringify(body),
  signal:AbortSignal.timeout(12000)});
 if(!put.ok)throw Error('PAPER_AUTOPILOT_GITHUB_WRITE_HTTP_'+put.status);
 const x=await put.json();
 if(!/^[a-f0-9]{40}$/.test(x?.commit?.sha||''))
  throw Error('PAPER_AUTOPILOT_COMMIT_UNVERIFIED');
 return {status:'PUBLISHED',published:true,skipped:false,
  commit_sha:x.commit.sha,public:status};
}
