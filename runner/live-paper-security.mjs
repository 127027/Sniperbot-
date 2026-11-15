// Public-only, zero-key EVM contract/sell simulation checks for LOCAL PAPER signals.
// These sources provide risk indicators, NOT guarantees or executable swap quotes.
import {validTokenAddress} from './market.mjs';

const CHAIN_IDS=Object.freeze({eth:1,bsc:56,base:8453});
const indicator=x=>x==='0'||x===0?false:x==='1'||x===1?true:null;
const percent=x=>x===null||x===undefined||x===''?null:
 Number.isFinite(Number(x))?Number(x):null;
const safeAddress=(chain,x)=>validTokenAddress(chain,x)?x.toLowerCase():null;
const date=s=>typeof s==='string'&&s.endsWith('Z')&&Number.isFinite(Date.parse(s));
const scrub=e=>Number.isInteger(e?.status)?'HTTP_'+e.status:
 ['AbortError','TimeoutError'].includes(e?.name)?'TIMEOUT':'SECURITY_PROVIDER_UNAVAILABLE';
export const LIVE_PAPER_SECURITY_CHAINS=Object.freeze(Object.keys(CHAIN_IDS));

async function publicJson(url,fetcher){
 const u=new URL(url);
 if(u.protocol!=='https:'||!['api.gopluslabs.io','api.honeypot.is'].includes(u.hostname)||
  u.username||u.password)throw Error('SECURITY_PROVIDER_HOST_INVALID');
 const response=await fetcher(u.href,{method:'GET',redirect:'error',
  signal:AbortSignal.timeout(10000),
  headers:{accept:'application/json','user-agent':'SniperR29LocalPaperRisk/1.0'}});
 if(!response?.ok){const e=Error('SECURITY_HTTP_UNAVAILABLE');e.status=response?.status;throw e}
 const t=await response.text();
 if(t.length>300000)throw Error('SECURITY_RESPONSE_TOO_LARGE');
 return JSON.parse(t);
}

export function assessEvmSecurityRaw({chain,token,pool,goplus,honeypot,now=Date.now()}={}){
 const address=safeAddress(chain,token),pair=safeAddress(chain,pool);
 if(!address||!pair||!Number.isFinite(now)||!Object.hasOwn(CHAIN_IDS,chain))
  throw Error('SECURITY_INVALID_EVM_IDENTITY');
 const gp=goplus?.code===1?goplus.result?.[address]:null;
 const simulation=honeypot||{};
 const flags=Array.isArray(simulation.flags)?simulation.flags:[];
 const criteria=['is_open_source','is_proxy','is_mintable','hidden_owner',
  'can_take_back_ownership','owner_change_balance','transfer_pausable',
  'is_blacklisted','is_whitelisted','is_honeypot','cannot_buy','cannot_sell_all',
  'slippage_modifiable'];
 const missing=criteria.filter(x=>indicator(gp?.[x])===null);
 const dangerous=criteria.filter(x=>indicator(gp?.[x])===true);
 // is_open_source=1 is required; it is not itself a dangerous flag.
 const unsafe=dangerous.filter(x=>x!=='is_open_source');
 if(indicator(gp?.is_open_source)===false)unsafe.push('NOT_OPEN_SOURCE');
 const hResult=simulation.honeypotResult?.isHoneypot;
 const taxes=simulation.simulationResult;
 const sellTax=percent(taxes?.sellTax),buyTax=percent(taxes?.buyTax);
 const simulationOk=simulation.simulationSuccess===true&&hResult===false&&
  sellTax!==null&&buyTax!==null&&sellTax>=0&&sellTax<=5&&
  buyTax>=0&&buyTax<=5&&flags.length===0;
 const identity=simulation?.token?.address;
 // Must prove the simulated token is the same as submitted token.
 const tokenMatched=typeof identity==='string'&&identity.toLowerCase()===address;
 const poolMatched=typeof simulation.pair?.pairAddress==='string'&&
  simulation.pair.pairAddress.toLowerCase()===pair;
 const approved=missing.length===0&&unsafe.length===0&&
  simulationOk&&tokenMatched&&poolMatched&&
  indicator(gp.is_open_source)===true;
 const reasons=[
  ...(gp?[]:['GOPLUS_UNAVAILABLE_OR_UNKNOWN']),
  ...missing.map(x=>'GOPLUS_MISSING_'+x),
  ...unsafe.map(x=>'GOPLUS_RISK_'+x),
  ...(simulationOk?[]:['HONEYPOT_SIMULATION_INCOMPLETE_OR_RISK']),
  ...(tokenMatched?[]:['HONEYPOT_TOKEN_UNVERIFIED']),
  ...(poolMatched?[]:['HONEYPOT_POOL_UNVERIFIED'])
 ].slice(0,30);
 const evidence={schema:'r29_public_evm_security_gate.v1',
  mode:'PAPER_ONLY',chain,token_address:address,pool_address:pair,
  checked_at_utc:new Date(now).toISOString(),
  provider_names:['GoPlus','Honeypot.is'],
  goplus_evaluated:gp!==null,honeypot_simulation_ok:simulationOk,
  contract_authorities_ok:missing.length===0&&unsafe.length===0,
  exact_token_and_pair_verified:tokenMatched&&poolMatched,
  risk_flags:reasons,approved,
  security_is_guaranteed:false,
  independent_executable_quote_verified:false,
  paper_only:true};
 return evidence;
}
export function validatePaperSecurityEvidence(x,{chain,token,pool,now=Date.now()}={}){
 if(x?.schema!=='r29_public_evm_security_gate.v1'||x.mode!=='PAPER_ONLY'||
  x.paper_only!==true||x.approved!==true||
  x.security_is_guaranteed!==false||
  x.independent_executable_quote_verified!==false||
  x.chain!==chain||safeAddress(chain,token)!==x.token_address||
  safeAddress(chain,pool)!==x.pool_address||
  !Array.isArray(x.provider_names)||
  x.provider_names.join(',')!=='GoPlus,Honeypot.is'||
  !Array.isArray(x.risk_flags)||x.risk_flags.length!==0||
  x.goplus_evaluated!==true||x.honeypot_simulation_ok!==true||
  x.contract_authorities_ok!==true||x.exact_token_and_pair_verified!==true||
  !date(x.checked_at_utc)||Date.parse(x.checked_at_utc)>now||
  now-Date.parse(x.checked_at_utc)>120000)
  return false;
 return true;
}
export async function collectEvmSecurity({chain,token,pool,fetcher=fetch,
 now=Date.now()}={}){
 const address=safeAddress(chain,token),pair=safeAddress(chain,pool);
 if(!address||!pair||!Object.hasOwn(CHAIN_IDS,chain))
  throw Error('SECURITY_INVALID_EVM_IDENTITY');
 const urls=[
  'https://api.gopluslabs.io/api/v1/token_security/'+CHAIN_IDS[chain]+
  '?contract_addresses='+encodeURIComponent(address),
  'https://api.honeypot.is/v2/IsHoneypot?'+new URLSearchParams({
   address,chainID:String(CHAIN_IDS[chain]),pair}).toString()
 ];
 const outputs=await Promise.allSettled(urls.map(u=>publicJson(u,fetcher)));
 const [a,b]=outputs.map(x=>x.status==='fulfilled'?x.value:null);
 const result=assessEvmSecurityRaw({chain,token,pool,goplus:a,honeypot:b,now});
 return {...result,provider_errors:outputs.map((x,i)=>
  x.status==='rejected'?{provider:i===0?'GoPlus':'Honeypot.is',reason:scrub(x.reason)}:null)
  .filter(Boolean)};
}
