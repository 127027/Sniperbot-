// READ ONLY public market-data adapter. Never handles wallets, keys, transactions or fiat funds.
export const CHAINS=Object.freeze({solana:'Solana',base:'Base',bsc:'BNB Chain',eth:'Ethereum'});
export const DS_CHAIN=Object.freeze({solana:'solana',base:'base',bsc:'bsc',eth:'ethereum'});
const base='https://api.geckoterminal.com/api/v2';
const finite=(v)=>{const n=Number(v);return Number.isFinite(n)?n:null};
const trimmed=(s,max=100)=>String(s||'').slice(0,max);
export function validTokenAddress(chain,addr){
 if(chain==='solana')return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr||'');
 return ['base','bsc','eth'].includes(chain) && /^0x[a-fA-F0-9]{40}$/.test(addr||'');
}
export async function jsonGet(url,fetcher=fetch){
 // SSRF prevention: all URLs are constructed here from strict allowlists, never from user URL input.
 const host=new URL(url).hostname;
 if(!['api.geckoterminal.com','api.dexscreener.com'].includes(host))throw Error('Provider not permitted');
 const response=await fetcher(url,{headers:{accept:'application/json','user-agent':'MemeSniperPaperResearch/0.3'},signal:AbortSignal.timeout(9500)});
 if(!response.ok)throw Error(`Marktdatenanbieter HTTP ${response.status}`);
 return response.json();
}
export function parseGeckoPool(chain,p){
 const a=p?.attributes||{}, rel=p?.relationships||{};
 const pool=trimmed(a.address,100), tokenId=String(rel.base_token?.data?.id||'');
 const token=tokenId.startsWith(chain+'_')?tokenId.slice(chain.length+1):null;
 const price=finite(a.base_token_price_usd), liq=finite(a.reserve_in_usd), vol=finite(a.volume_usd?.m5);
 const age=Date.parse(a.pool_created_at||a.created_at||'');
 const tx=a.transactions?.m5||{};const buys=finite(tx.buys),sells=finite(tx.sells);
 if(!token||!pool||!validTokenAddress(chain,token)||!Number.isFinite(price)||price<=0)return null;
 const ageMin=Number.isFinite(age)?Math.max(0,(Date.now()-age)/60000):null;
 const diagnostics=[];let score=0;
 if(liq!==null && liq>=30000)score+=30;else diagnostics.push('Liquidität unzureichend/unbekannt');
 if(ageMin!==null && ageMin>=5 && ageMin<=720)score+=20;else diagnostics.push('Pool-Alter außerhalb Untersuchungsfenster');
 if(vol!==null && vol>=10000)score+=20;else diagnostics.push('5-Min-Volumen nicht bestätigt');
 if(buys!==null&&sells!==null&&buys>=20 && buys>sells*1.25)score+=20;else diagnostics.push('Organische Nachfrage nicht bestätigt');
 if(liq!==null&&vol!==null&&vol<liq*4)score+=10;else diagnostics.push('Volumen/Liquidität auffällig/unklar');
 // This quantitative watch score is NOT a fraud/contract safety score.
 return {id:`${chain}:${pool}`,source:'GeckoTerminal',chain,poolAddress:pool,tokenAddress:token,
   symbol:trimmed(a.name||token.slice(0,8),36),name:trimmed(a.name||'Neuer Pool',95),priceUsd:price,
   liquidityUsd:liq,volume5mUsd:vol,buys5m:buys,sells5m:sells,createdAt:Number.isFinite(age)?new Date(age).toISOString():null,
   asOf:new Date().toISOString(),score,criteria:diagnostics,safety:'NICHT VERIFIZIERT',isDemo:false,
   paperEligible:score>=80, url:`https://www.geckoterminal.com/${chain}/pools/${encodeURIComponent(pool)}`};
}
export async function scanNewPools(fetcher=fetch){
 const results=[],errors=[];
 for(const chain of Object.keys(CHAINS)){
  try{
   const json=await jsonGet(`${base}/networks/${chain}/new_pools?page=1`,fetcher);
   for(const pool of Array.isArray(json.data)?json.data:[]){
    const c=parseGeckoPool(chain,pool);if(c)results.push(c);
   }
  }catch(error){errors.push(`${CHAINS[chain]}: ${error.message}`)}
 }
 return {results:results.sort((a,b)=>b.score-a.score).slice(0,60),errors,at:new Date().toISOString()};
}
export function parseDexPair(pair,expectedChain,tokenAddress){
 if(!pair||pair.chainId!==DS_CHAIN[expectedChain]||pair.baseToken?.address?.toLowerCase()!==tokenAddress.toLowerCase())return null;
 const p=finite(pair.priceUsd); if(p===null||p<=0)return null;
 return {priceUsd:p,liquidityUsd:finite(pair.liquidity?.usd),asOf:new Date().toISOString(),source:'DEX Screener',pairAddress:pair.pairAddress};
}
export async function tokenQuote(chain,addr,fetcher=fetch,selectedPool=null){
 if(!validTokenAddress(chain,addr))throw Error('Ungültige Token-Adresse');
 const pairs=await jsonGet(`https://api.dexscreener.com/token-pairs/v1/${DS_CHAIN[chain]}/${encodeURIComponent(addr)}`,fetcher);
 const available=(Array.isArray(pairs)?pairs:[]).map(p=>parseDexPair(p,chain,addr)).filter(q=>q&&(!selectedPool||q.pairAddress?.toLowerCase()===selectedPool.toLowerCase())).sort((a,b)=>(b.liquidityUsd||0)-(a.liquidityUsd||0));
 return available[0]||null;
}
export async function lookupToken(chain,addr,fetcher=fetch,selectedPool=null){
 if(!validTokenAddress(chain,addr))throw Error('Ungültige Token-Adresse');
 const pairs=await jsonGet(`https://api.dexscreener.com/token-pairs/v1/${DS_CHAIN[chain]}/${encodeURIComponent(addr)}`,fetcher);
 const raw=(Array.isArray(pairs)?pairs:[]).filter(p=>p?.chainId===DS_CHAIN[chain]&&p.baseToken?.address?.toLowerCase()===addr.toLowerCase()&&(!selectedPool||p.pairAddress?.toLowerCase()===selectedPool.toLowerCase()));
 raw.sort((a,b)=>(finite(b?.liquidity?.usd)||0)-(finite(a?.liquidity?.usd)||0));
 const p=raw[0];if(!p)throw Error('Kein verifizierbarer DEX-Pool gefunden');
 const price=finite(p.priceUsd),liq=finite(p.liquidity?.usd),vol=finite(p.volume?.m5),buys=finite(p.txns?.m5?.buys),sells=finite(p.txns?.m5?.sells);
 if(!price||price<=0)throw Error('Kein gültiger USD-Preis');
 const pool=trimmed(p.pairAddress,100);
 return {id:`${chain}:${pool}`,source:'DEX Screener',chain,tokenAddress:addr,poolAddress:pool,
 symbol:trimmed(p.baseToken?.symbol,24),name:trimmed(p.baseToken?.name,95),priceUsd:price,liquidityUsd:liq,
 volume5mUsd:vol,buys5m:buys,sells5m:sells,createdAt:p.pairCreatedAt?new Date(p.pairCreatedAt).toISOString():null,
 asOf:new Date().toISOString(),score:0,criteria:['Manuell hinzugefügt – KEIN automatisches Scoring'],safety:'NICHT VERIFIZIERT',isDemo:false,
 paperEligible:false,url:`https://dexscreener.com/${DS_CHAIN[chain]}/${encodeURIComponent(pool)}`};
}
