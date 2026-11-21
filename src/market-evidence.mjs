const evm = /^0x[0-9a-fA-F]{40}$/;
const v4 = /^0x[0-9a-fA-F]{64}$/;
const sol = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const chains = {eth:'ethereum',ethereum:'ethereum',base:'base',bsc:'bsc',solana:'solana'};
export const canonicalChain = s => chains[String(s||'').toLowerCase()] || null;
export function tokenValid(chain,value){
 const c=canonicalChain(chain);
 return typeof value==='string' && (c==='solana' ? sol.test(value) : !!c && evm.test(value));
}
export function poolValid(chain,value,kind){
 const c=canonicalChain(chain);
 if(typeof value!=='string'||!c)return false;
 return c==='solana'?sol.test(value):evm.test(value)||(kind==='UNISWAP_V4_POOL_ID'&&v4.test(value));
}
export function parsePoolUrl(value){
 let u;try{u=new URL(value)}catch{return null}
 if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
 const host=u.hostname.toLowerCase().replace(/^www\./,'');
 let p=u.pathname.split('/').filter(Boolean),chain,pool,provider;
 if(host==='geckoterminal.com'){
   if(p.length===4&&/^[a-z]{2}$/.test(p[0]))p=p.slice(1);
   if(p.length!==3||p[1]!=='pools')return null;
   chain=canonicalChain(p[0]);pool=p[2];provider='GECKOTERMINAL';
 }else if(host==='dexscreener.com'){
   if(p.length!==2)return null;
   chain=canonicalChain(p[0]);pool=p[1];provider='DEXSCREENER';
 }else return null;
 if(!poolValid(chain,pool,'UNISWAP_V4_POOL_ID'))return null;
 return {host,chain,pool,provider};
}
export function exactPoolUrl(value,chain,pool){
 const p=parsePoolUrl(value),c=canonicalChain(chain);
 return !!p&&p.chain===c&&typeof pool==='string'&&(c==='solana'?p.pool===pool:p.pool.toLowerCase()===pool.toLowerCase());
}
export function explorerToken(chain,value){
 let u;try{u=new URL(value)}catch{return null}
 const c=canonicalChain(chain);
 const hosts={solana:'solscan.io',base:'basescan.org',ethereum:'etherscan.io',bsc:'bscscan.com'};
 if(u.protocol!=='https:'||u.hostname.toLowerCase().replace(/^www\./,'')!==hosts[c])return null;
 const m=u.pathname.match(/^\/token\/([^/]+)\/?$/i);
 if(!m||!tokenValid(c,m[1]))return null;
 return {chain:c,contract:m[1],source_url:u.href,verification:'EXPLORER_LINK_ONLY_NOT_INDEPENDENT'};
}
export function identityDiagnostics(x){
 const c=canonicalChain(x?.chain),issues=[];
 if(!c)issues.push('CHAIN_UNSUPPORTED');
 if(!poolValid(c,x?.pool,x?.pool_kind))issues.push('POOL_ADDRESS_UNVERIFIED');
 if(!exactPoolUrl(x?.source_url,c,x?.pool))issues.push('POOL_URL_MISMATCH');
 if(!tokenValid(c,x?.contract))issues.push('TOKEN_CONTRACT_UNVERIFIED');
 if(x?.quote_date_verified!==true)issues.push('PRICE_PROVIDER_ASOF_UNVERIFIED');
 return {chain:c,issues,ready_for_quote_check:issues.length===0};
}
