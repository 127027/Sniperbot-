// Bounded recovery of archived research, never of trade execution.
const H=3600000, iso=t=>new Date(t).toISOString();
const time=x=>{const n=Date.parse(x);if(!Number.isFinite(n))throw Error('INVALID_TIME');return n};
const hour=x=>{const n=time(x);if(n%H)throw Error('UNALIGNED_HOUR');return n};
const pattern=/^reports\/(\d{4}-\d{2}-\d{2})\/(\d{2})\/(dot-[1-4](?:-[^/]+)?|final(?:-[^/]+)?)\.json$/;
export function reportSlot(path){const m=pattern.exec(path);if(!m)return null;const n=Date.parse(m[1]+'T'+m[2]+':00:00Z');if(!Number.isFinite(n)||iso(n).slice(0,13)!==m[1]+'T'+m[2])return null;return {target:iso(n),slot:m[3].startsWith('final')?'final':m[3].slice(0,5)}}
export function planRecovery({nextHour,now,tree,recent=[],maxHours=3}){
 const start=hour(nextHour),end=Math.floor((time(now)-2*H)/H)*H;
 if(!Number.isInteger(maxHours)||maxHours<1||maxHours>24||!Array.isArray(tree)||!Array.isArray(recent))throw Error('INVALID_PLAN');
 const known=new Map(recent.map(r=>[r.path,r.sha])), grouped=new Map();
 for(const r of tree){const s=reportSlot(r.path);if(!s)continue;if(!/^[0-9a-f]{40}$/.test(r.sha))throw Error('INVALID_REPORT_SHA');if(known.has(r.path)&&known.get(r.path)!==r.sha)throw Error('REPORT_HASH_CONFLICT');const list=grouped.get(s.target)??[];list.push({...r,slot:s.slot});grouped.set(s.target,list)}
 const hours=[];for(let n=start;n<=end&&hours.length<maxHours;n+=H){const target=iso(n),rows=grouped.get(target)??[],present=new Set(rows.map(r=>r.slot));hours.push({target,available:rows.filter(r=>!known.has(r.path)).sort((a,b)=>a.path.localeCompare(b.path)).map(({path,sha})=>({path,sha})),missing:['dot-1','dot-2','dot-3','dot-4','final'].filter(s=>!present.has(s))})}
 return {hours,nextHour:hours.length?iso(time(hours.at(-1).target)+H):iso(start),remainingHours:Math.max(0,Math.floor((end-start)/H)+1-hours.length)}
}
export function confirmRecovery(plan,verified,{indexSaved,indexReadback}){
 if(!indexSaved||!indexReadback)throw Error('INDEX_NOT_VERIFIED');
 const got=new Map(verified.map(r=>[r.path,r.sha]));
 for(const h of plan.hours)for(const r of h.available)if(got.get(r.path)!==r.sha)throw Error('REPORT_NOT_MERGED');
 return {nextHour:plan.nextHour,missing:plan.hours.filter(h=>h.missing.length).map(h=>({target:h.target,slots:h.missing}))}
}
