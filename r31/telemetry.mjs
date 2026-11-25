// Read-only public research telemetry. Never a trading instruction.
const ROOT='https://raw.githubusercontent.com/127027/Sniperbot-/refs/heads/';
const R30=ROOT+'codex/r30-hourly-research-20261124/';
const R31=ROOT+'codex/r31-control-center-paper/r31/broadcast/';
const MIN=60000,HOUR=3600000;
const iso=x=>new Date(x).toISOString();
const ts=x=>typeof x==='string'?Date.parse(x):NaN;
const hash=x=>/^[a-f0-9]{40}$/.test(x??'');
const roles=['Marktanalyse','Coin Discovery','Risikoanalyse','Strategie','Handelsentscheidung'];
const mins=[5,15,25,35,0];
const pathHour=t=>'reports/'+iso(t).slice(0,10)+'/'+iso(t).slice(11,13)+'/';
export function schedule(now=Date.now()){
 const hour=Math.floor(now/HOUR)*HOUR;
 return {hour,nextDecision:iso(hour+HOUR),roles:roles.map((name,i)=>({id:i+1,name,next:iso(hour+mins[i]*MIN+(now>=hour+mins[i]*MIN?HOUR:0)),scheduled:iso(hour+mins[i]*MIN),target:iso(i===4?hour:hour+HOUR)}))};
}
async function blobSha(b){const prefix=new TextEncoder().encode('blob '+b.length+'\0');const data=new Uint8Array(prefix.length+b.length);data.set(prefix);data.set(b,prefix.length);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1',data)),x=>x.toString(16).padStart(2,'0')).join('')}
export function publicTelemetry({fetcher=fetch,now=()=>Date.now()}={}){
 async function read(url,optional=false){const r=await fetcher(url,{method:'GET',cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(12000)});if(optional&&r.status===404)return null;if(!r.ok)throw Error('HTTP_'+r.status);const b=new Uint8Array(await r.arrayBuffer());if(b.length>3*1024*1024)throw Error('REPORT_TOO_LARGE');return {data:JSON.parse(new TextDecoder().decode(b)),sha:await blobSha(b)}}
 async function settled(p){try{return {value:await p,error:null}}catch(e){return {value:null,error:e.message}}}
 async function reference(){const p=(await read(R30+'latest-final.json')).data;if(p.kind!=='R30_LATEST_FINAL_POINTER_V1'||!/^reports\/\d{4}-\d{2}-\d{2}\/\d{2}\/final(?:-[\w-]+)?\.json$/.test(p.final_path)||!hash(p.final_blob_sha))throw Error('INVALID_REFERENCE_POINTER');const f=await read(R30+p.final_path);const d=f.data;if(f.sha!==p.final_blob_sha||ts(d.target_utc)!==ts(p.target_utc)||d.paper_ledger?.mode!=='INDICATIVE_PUBLIC_PRICE_MODEL_ONLY'||!Array.isArray(d.paper_ledger?.positions)||!Array.isArray(d.paper_ledger?.trades))throw Error('REFERENCE_HASH_OR_SCHEMA');return {target_utc:d.target_utc,completed_at_utc:d.completed_at_utc,summary:d.summary,positions:d.paper_ledger.positions,trades:d.paper_ledger.trades,decisions:d.research_decisions??[],missing_roles:d.missing_roles??[],path:p.final_path,sha:f.sha,notes:d.notes??null,role_reports:d.role_reports??null}}
 async function signal(){const p=(await read(R31+'latest.json')).data;if(p.schema!=='r31.broadcast.pointer.v1')throw Error('INVALID_SIGNAL_POINTER');if(p.status==='NOT_PUBLISHING')return {state:'NOT_PUBLISHING'};if(p.status!=='PUBLISHED'||!Number.isSafeInteger(p.sequence)||p.sequence<1||p.path!=='r31/broadcast/signals/'+String(p.sequence).padStart(10,'0')+'.json'||!hash(p.blob_sha))throw Error('INVALID_SIGNAL_POINTER');const f=await read(R31+p.path.slice('r31/broadcast/'.length));if(f.sha!==p.blob_sha||f.data.sequence!==p.sequence||f.data.mode!=='PAPER_ONLY'||!Array.isArray(f.data.decisions))throw Error('SIGNAL_HASH_OR_SCHEMA');return {state:'PUBLISHED',...f.data,sha:f.sha}}
 async function roleReport(n,target){const r=await read(R30+pathHour(target)+'dot-'+n+'.json',true);if(!r)return null;const d=r.data;if(ts(d.target_utc)!==target||!Number.isFinite(ts(d.completed_at_utc))||ts(d.completed_at_utc)>now()+MIN)throw Error('ROLE_REPORT_SCHEMA');return {target_utc:d.target_utc,completed_at_utc:d.completed_at_utc,decisions:Array.isArray(d.research_decisions)?d.research_decisions:Array.isArray(d.decisions)?d.decisions:[],missing_roles:d.missing_roles??[],sha:r.sha,kind:d.kind??null}}
 async function roleStart(n,target){const r=await read(R30+pathHour(target)+'dot-'+n+'-start.json',true);if(!r)return null;const d=r.data;if(d.schema!=='r31.dot.start.v1'||d.dot!==n||ts(d.target_utc)!==target||!Number.isFinite(ts(d.started_at_utc))||ts(d.started_at_utc)>now()+MIN)throw Error('INVALID_START_REPORT');return d}
 async function readStatus(){
  const t=now(),s=schedule(t);
  const [ref,sig,...peer]=await Promise.all([settled(reference()),settled(signal()),...s.roles.slice(0,4).map(async r=>{
    const [current,previous]=await Promise.all([settled(roleReport(r.id,s.hour+HOUR)),settled(roleReport(r.id,s.hour))]);let started={value:null,error:null};if(!current.value&&t>=ts(r.scheduled))started=await settled(roleStart(r.id,s.hour+HOUR));
    return {current,previous,started};
  })]);
  const dots=s.roles.map((r,i)=>{
   if(i===4){
    const current=ref.value&&ts(ref.value.target_utc)===s.hour;
    return {...r,state:ref.error?'ABRUFFEHLER':current?'GESPEICHERT':t-s.hour>10*MIN?'VERZÖGERT':'ABSCHLUSS ERWARTET',last:ref.value?.completed_at_utc??null,report_target:ref.value?.target_utc??null,count:current?ref.value.decisions.length:null,error:ref.error,detail:current?'R30-Abschluss gespeichert; R31-Signal separat prüfen':'Kein aktueller Stundenabschluss nachgewiesen'};
   }
   const {current,previous,started}=peer[i];const latest=current.value??previous.value;
   let state='WARTET';if(current.error)state='ABRUFFEHLER';else if(current.value)state='GESPEICHERT';else if(started.value&&t-ts(started.value.started_at_utc)<=10*MIN)state='START BESTÄTIGT';else if(t-ts(r.scheduled)>10*MIN)state='VERZÖGERT';else if(t>=ts(r.scheduled))state='BERICHT ERWARTET';
   return {...r,state,last:latest?.completed_at_utc??null,report_target:latest?.target_utc??null,count:current.value?.decisions.length??null,error:current.error??started.error??previous.error,detail:current.value?'GitHub-Rollenbericht vorhanden':started.value?'Start gemeldet '+started.value.started_at_utc+'; Abschluss noch nicht bestätigt':'Kein aktueller Rollenbericht nachgewiesen',decisions:latest?.decisions??[]};
  });
  return {checked_at_utc:iso(t),next_decision_utc:s.nextDecision,roles:dots,reference:ref.value,reference_error:ref.error,signal:sig.value,signal_error:sig.error,source:'PUBLIC_GITHUB_READ_ONLY',runtime_visibility:'REPORTS_AND_OPTIONAL_START_MARKERS_ONLY'};
 }
 return {readStatus};
}
