import {Worker} from 'node:worker_threads';
import {setTimeout as delay} from 'node:timers/promises';
import {randomUUID} from 'node:crypto';
import {ephemeralRoleTask} from './role-task.mjs';
import {validateDecisions,ROLES,digest} from './engine.mjs';

const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const str={type:'string'};
const schema=obj({
 reviews:{type:'array',items:obj({candidate_id:str,verdict:{enum:['YES','NO','UNKNOWN'],type:'string'},evidence_ids:{type:'array',items:str}})},
 orders:{type:'array',items:obj({candidate_id:str,action:{type:'string',enum:['BUY','HOLD','ADD','REDUCE','SELL']},amount_quote:{type:['number','null']},fraction:{type:['number','null']}})}
});
function workerRequest({key,body,timeoutMs,signal}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted)return reject(Error('ROLE_CANCELLED'));
  const worker=new Worker(new URL('./model-worker.mjs',import.meta.url),{
   workerData:{key,body,timeoutMs},env:{},resourceLimits:{maxOldGenerationSizeMb:64}
  });
  let settled=false;
  const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);
   signal?.removeEventListener('abort',abort);void worker.terminate();error?reject(error):resolve(result);};
  const abort=()=>finish(Error('ROLE_CANCELLED'));
  const timer=setTimeout(()=>finish(Error('MODEL_TIMEOUT')),timeoutMs);
  signal?.addEventListener('abort',abort,{once:true});
  worker.once('message',m=>finish(null,m));
  worker.once('error',()=>finish(Error('MODEL_WORKER_FAILURE')));
  worker.once('exit',()=>finish(Error('MODEL_WORKER_EXIT')));
 });
}
function positive(x){return typeof x==='number'&&Number.isFinite(x)&&x>0;}
// Stable opaque IDs use only already-visible identities, never future cohort size
// or outcomes. Natural-language recognition is still not a blind attestation.
function modelView(frame,peers){
 const lookup=new Map(),reverse=new Map();
 const alias=(value,kind)=>{if(typeof value!=='string')return value;
  if(!lookup.has(value)){const id=kind+'_'+digest(value).slice(0,24);lookup.set(value,id);reverse.set(id,value);}
  return lookup.get(value);};
 for(const e of frame.events){alias(e.candidate_id,'candidate');alias(e.id,'evidence');alias(e.token,'token');alias(e.pool,'pool');alias(e.evidence.ref,'source');}
 for(const id of Object.keys(frame.portfolio.positions))alias(id,'candidate');
 const replace=x=>{
  if(typeof x==='string'){
   if(lookup.has(x))return lookup.get(x);
   let s=x;for(const [raw,masked]of [...lookup].sort((a,b)=>b[0].length-a[0].length))if(raw.length>=4)s=s.split(raw).join(masked);
   return s;
  }
  if(Array.isArray(x))return x.map(replace);
  if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([k,v])=>[lookup.get(k)||k,replace(v)]));
  return x;
 };
 const projected=replace(frame);delete projected.input_hash;
 projected.input_hash=digest(projected);
 return {frame:projected,peers:peers.map(p=>({...replace(p),input_hash:projected.input_hash})),
  restore:answer=>({...answer,reviews:answer.reviews?.map(r=>({...r,candidate_id:reverse.get(r.candidate_id)||r.candidate_id,evidence_ids:r.evidence_ids?.map(id=>reverse.get(id)||id)})),
   orders:answer.orders?.map(o=>({...o,candidate_id:reverse.get(o.candidate_id)||o.candidate_id}))})};
}
export function configFromEnv(env=process.env){return {
 apiKey:env.OPENAI_API_KEY,model:env.R22_MODEL,
 privacyApproved:env.R22_PUBLIC_DATA_APPROVED==='1',
 budgetUsd:Number(env.R22_BUDGET_USD),inputUsdPerMillion:Number(env.R22_INPUT_USD_PER_MILLION),
 outputUsdPerMillion:Number(env.R22_OUTPUT_USD_PER_MILLION),
 maxOutputTokens:Number(env.R22_MAX_OUTPUT_TOKENS||2048),
 timeoutMs:Number(env.R22_TIMEOUT_MS||45000),retries:Number(env.R22_RETRIES||1)
};}
export function createModelAdapter(config,{transport=workerRequest,onReservation=()=>{}}={}){
 const c={maxOutputTokens:2048,timeoutMs:45000,retries:1,...config};
 if(!c.apiKey)throw Error('MODEL_AUTH_MISSING');
 if(typeof c.model!=='string'||!c.model.trim())throw Error('MODEL_NOT_CONFIGURED');
 if(c.privacyApproved!==true)throw Error('PUBLIC_DATA_APPROVAL_MISSING');
 if(![c.budgetUsd,c.inputUsdPerMillion,c.outputUsdPerMillion].every(positive))throw Error('COST_LIMITS_REQUIRED');
 if(!Number.isInteger(c.maxOutputTokens)||c.maxOutputTokens<128||c.maxOutputTokens>8192||
 !Number.isInteger(c.timeoutMs)||c.timeoutMs<10||c.timeoutMs>120000||
 !Number.isInteger(c.retries)||c.retries<0||c.retries>2)throw Error('INVALID_MODEL_LIMITS');
 let reserved=0,attempts=0,actual=0;const receipts=[];
 const invokeRole=async(role,task,context={})=>{
  // Rebuild the task from the verified frame; never trust arbitrary extra task fields.
  const clean=ephemeralRoleTask(role,task.frame), f=clean.frame;
  const peers=role==='qa'?structuredClone(context.current_peer_votes):[];
  if(role==='qa'){
   if(!Array.isArray(peers)||peers.length!==4||peers.some(p=>p.role==='qa'))throw Error('QA_PEERS_REQUIRED');
   validateDecisions(f,[...peers,{role:'qa',run_id:'validation-only',index:f.index,at:f.at,input_hash:f.input_hash,reviews:[],orders:[]}]);
  }
  const view=modelView(f,peers);
  const body={model:c.model,store:false,tools:[],max_output_tokens:c.maxOutputTokens,
   instructions:clean.instructions+' Return JSON matching the schema. Every claim must use supplied evidence. Missing data means UNKNOWN. Do not use pretrained knowledge of later outcomes.',
   input:JSON.stringify({frame:view.frame,role,current_peer_votes:view.peers}),
   text:{format:{type:'json_schema',name:'historical_role_vote',strict:true,schema}}
  };
  const bytes=Buffer.byteLength(JSON.stringify(body));
  if(bytes>100000)throw Error('MODEL_INPUT_TOO_LARGE');
  // Conservative byte-based token reservation plus framing overhead. No refund
  // on errors: a timed-out request may still be billed by the provider.
  const ceiling=((bytes+4096)*c.inputUsdPerMillion+c.maxOutputTokens*c.outputUsdPerMillion)/1e6;
  for(let attempt=0;attempt<=c.retries;attempt++){
   if(context.signal?.aborted)throw Error('ROLE_CANCELLED');
   if(reserved+ceiling>c.budgetUsd)throw Error('MODEL_BUDGET_EXHAUSTED');
   reserved+=ceiling;attempts++;
   onReservation({attempts,reserved_usd:reserved,role,frame_hash:f.input_hash});
   const result=await transport({key:c.apiKey,body:structuredClone(body),timeoutMs:c.timeoutMs,signal:context.signal});
   if(result.error){
    if([429,500,502,503,504].includes(result.status)&&attempt<c.retries){
     await delay(Math.min(2000,250*2**attempt),undefined,{signal:context.signal});continue;
    }
    throw Error(/^HTTP_\d{3}$/.test(result.error)?'MODEL_'+result.error:'MODEL_TRANSPORT_FAILURE');
   }
   const r=result.response;
   if(r?.status!=='completed'||typeof r.id!=='string'||!r.id||!r.usage)throw Error('MODEL_RESPONSE_INCOMPLETE');
   const usage=r.usage;
   if(!Number.isInteger(usage.input_tokens)||usage.input_tokens<0||!Number.isInteger(usage.output_tokens)||usage.output_tokens<0)throw Error('MODEL_USAGE_INVALID');
   actual+=(usage.input_tokens*c.inputUsdPerMillion+usage.output_tokens*c.outputUsdPerMillion)/1e6;
   if(usage.input_tokens>bytes+4096||usage.output_tokens>c.maxOutputTokens)throw Error('MODEL_USAGE_EXCEEDS_RESERVATION');
   const parts=(r.output||[]).flatMap(x=>x.content||[]);
   if(parts.some(x=>x.type==='refusal'))throw Error('MODEL_REFUSAL');
   let answer;try{answer=JSON.parse(parts.filter(x=>x.type==='output_text').map(x=>x.text).join(''));}catch{throw Error('MODEL_JSON_INVALID');}
   if(!answer||Object.keys(answer).sort().join(',')!=='orders,reviews')throw Error('MODEL_SCHEMA_INVALID');
   answer=view.restore(answer);
   const vote={role,run_id:'r22-'+randomUUID(),index:f.index,at:f.at,input_hash:f.input_hash,reviews:answer.reviews,orders:answer.orders};
   validateDecisions(f,[vote,...ROLES.filter(x=>x!==role).map(x=>({role:x,run_id:'validation-only',index:f.index,at:f.at,input_hash:f.input_hash,reviews:[],orders:[]}))]);
   receipts.push({role,index:f.index,input_hash:f.input_hash,response_id:r.id,model:r.model||c.model,
    vote_hash:digest(vote),usage,attempt:attempt+1});
   return vote;
  }
 };
 return {invokeRole,report:()=>({provider:'OPENAI_RESPONSES',model:c.model,attempts,
  reserved_usd:reserved,usage_cost_estimate_usd:actual,budget_usd:c.budgetUsd,
  pricing_operator_supplied:true,receipts:structuredClone(receipts),
  isolation:'FRESH_WORKER_STATELESS_REQUEST_NO_TOOLS',independent_authorship_verified:false})};
}
