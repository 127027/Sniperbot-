// Versioned Dot advisory validation, no network or portfolio access.
export const MAX_TTL=90*60000;
const MINT=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const time=x=>typeof x==='string'?Date.parse(x):NaN;
const validIdentity=x=>x?.chain==='solana'&&typeof x.address==='string'&&MINT.test(x.address);
const nonempty=x=>typeof x==='string'&&x.trim().length>0&&x.length<=4000;
const https=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const recent=(x,now,max=MAX_TTL)=>Number.isFinite(time(x))&&time(x)<=now&&now-time(x)<=max;
export function validAdvisory(a,now){
 return validIdentity(a)&&a.mode==='PAPER_ONLY'&&['BUY','SELL'].includes(a.action)&&
  recent(a.observed_at,now)&&time(a.expires_at)>now&&time(a.expires_at)-time(a.observed_at)<=MAX_TTL&&
  nonempty(a.thesis)&&Array.isArray(a.sources)&&a.sources.length>0&&a.sources.length<=10&&a.sources.every(https)&&
  Array.isArray(a.risks)&&a.risks.every(nonempty)&&Number.isInteger(a.rank)&&a.rank>=1&&a.rank<=10;
}
// Each envelope is {expected_dot,feed}; caller binds expected_dot to its fixed file path.
// An unexpired SELL takes priority over BUY; absence of a signal never means SELL.
// Fresh objections veto only an explicit target dot or all BUYs if target_dot is null.
export function mergeSignals(inputs,now){
 const byAddress=new Map(),objections=[],rejected=[],freshDots=[],notMeme=[],newIdentities=new Map();
 for(const {expected_dot,feed:f} of inputs){
  if(!Number.isInteger(expected_dot)||expected_dot<1||expected_dot>4||f?.dot!==expected_dot||
    f?.version!==1||f.mode!=='PAPER_ONLY'||!recent(f.run_at,now)||
    !Array.isArray(f.advisories)||f.advisories.length>20){rejected.push({dot:expected_dot,reason:'INVALID_OR_STALE_FEED'});continue;}
  freshDots.push(expected_dot);
  for(const n of (Array.isArray(f.new_identities)?f.new_identities.slice(0,30):[])){
   if(validIdentity(n)&&https(n.source)&&recent(n.observed_at,now)&&time(n.observed_at)<=time(f.run_at)){
    const old=newIdentities.get(n.address);
    if(!old||time(n.observed_at)>time(old.observed_at))newIdentities.set(n.address,{chain:'solana',address:n.address,source:n.source,observed_at:n.observed_at,dot:expected_dot});
   }
  }
  let buyCount=0;
  for(const a of f.advisories){
   if(!validAdvisory(a,now)||time(a.observed_at)>time(f.run_at)||a.action==='BUY'&&++buyCount>10){
    rejected.push({dot:expected_dot,address:a?.address??null,reason:'INVALID_ADVISORY'});continue;
   }
   const x={...a,dot:expected_dot};
   if(!byAddress.has(a.address))byAddress.set(a.address,[]);
   byAddress.get(a.address).push(x);
  }
  for(const o of Array.isArray(f.objections)?f.objections:[]){
   if(validIdentity(o)&&nonempty(o.reason)&&recent(o.observed_at,now)&&time(o.observed_at)<=time(f.run_at)&&
    (o.target_dot===null||Number.isInteger(o.target_dot)&&o.target_dot>=1&&o.target_dot<=4)&&
    o.target_dot!==expected_dot)objections.push({...o,dot:expected_dot});
  }
  for(const n of Array.isArray(f.not_meme)?f.not_meme:[]){
   if(validIdentity(n)&&nonempty(n.reason)&&recent(n.observed_at,now)&&time(n.observed_at)<=time(f.run_at))notMeme.push(n);
  }
 }
 const buys=[],sells=[];
 for(const [address,list] of byAddress){
  const ordered=list.sort((a,b)=>time(b.observed_at)-time(a.observed_at)||a.rank-b.rank||a.dot-b.dot);
  const sell=ordered.find(a=>a.action==='SELL');
  if(sell){sells.push(sell);continue;}
  const buy=ordered.find(a=>!notMeme.some(n=>n.address===address)&&!objections.some(o=>o.address===address&&o.dot!==a.dot&&(o.target_dot===null||o.target_dot===a.dot)));
  if(buy)buys.push(buy);else rejected.push({address,reason:'VETOED'});
 }
 buys.sort((a,b)=>a.rank-b.rank||time(b.observed_at)-time(a.observed_at)||a.dot-b.dot||a.address.localeCompare(b.address));
 return {buys:buys.slice(0,10),sells,new_identities:[...newIdentities.values()],fresh_dots:[...new Set(freshDots)],rejected};
}
