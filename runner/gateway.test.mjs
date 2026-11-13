import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {get as httpGet} from 'node:http';
import {fileURLToPath} from 'node:url';
import {identity,ROLES} from './research.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function launch(dir){
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const child=spawn(process.execPath,['runner/server.mjs'],{cwd:root,env:{...process.env,SNIPER_DATA_DIR:dir,SNIPER_PORT:String(port),SNIPER_OFFLINE:'1'},stdio:['ignore','pipe','pipe']});
 let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
 const base=`http://127.0.0.1:${port}`;
 for(let i=0;i<80;i++){
  if(child.exitCode!==null)throw Error(logs);
  try{if((await fetch(base+'/api/health')).ok)return {child,base}}catch{}
  await wait(50);
 }
 child.kill();throw Error(logs);
}
async function stop(child){if(child.exitCode!==null)return;const exited=new Promise(r=>child.once('exit',r));child.kill();await exited}
test('authenticated gateway: shared evidence, scoped identities, replay, research only; HTTP demo and restart',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-gateway-'));let running;
 try{
  running=await launch(dir);let base=running.base;
  const credentials=JSON.parse(await readFile(path.join(dir,'gateway-credentials.json'),'utf8'));
  const request=async(route,body,token,expected=200,extra={})=>{
   const r=await fetch(base+route,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(token?{authorization:`Bearer ${token}`} :{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
   assert.equal(r.status,expected,await r.clone().text());return r.json();
  };
  const cmd=(a,expected=200)=>request('/api/command',a,null,expected);
  const central=await request('/api/decisions');assert.equal(central.publisherConfigured,false);
  await request('/api/decisions/events',{type:'BUY'},null,422);
  await cmd({type:'SET_CENTRAL_FOLLOW',enabled:true});
  assert.equal((await request('/api/state')).state.centralPaperFollow,true);
  await request('/api/research',undefined,null,401);
  await request('/api/research/events',{type:'BUY'},credentials[0].token,422);
  await request('/api/research',undefined,credentials[0].token,403,{origin:'https://evil.example'});
  const hostStatus=await new Promise((resolve,reject)=>{httpGet(base+'/api/health',{headers:{host:'evil.example'}},r=>{r.resume();resolve(r.statusCode)}).on('error',reject)});assert.equal(hostStatus,403);
  const token='0x'+'1'.repeat(40),pool='0x'+'2'.repeat(40),id=identity('base',token,pool);
  // Backdate fixture by one second for Windows cross-process clock granularity.
  const observed=Date.now()-1000;
  const common={candidate_id:id,paper_only:true,observed_at_utc:new Date(observed).toISOString(),expires_at_utc:new Date(observed+240000).toISOString()};
  const event={...common,schema:'candidate.v1',event_id:'candidate-1',agent_id:credentials[0].id,chain:'base',token_address:token,pool_address:pool,symbol:'External'};
  await request('/api/research/events',event,credentials[0].token);
  await request('/api/research/events',event,credentials[0].token);
  await request('/api/research/events',{...event,symbol:'conflict'},credentials[0].token,422);
  await request('/api/research/events',{...event,event_id:'forged'},credentials[1].token,422);
  for(let i=0;i<5;i++){
   const principal=credentials[i];
   await request('/api/research/events',{...common,schema:'evidence.v1',event_id:`e-${i}`,agent_id:principal.id,evidence_id:`source-${i}`,url:`https://source-${i}.example.org/claim`,independence_key:`source-${i}`,summary:'Test evidence'},principal.token);
   const shared=await request('/api/research',undefined,credentials[(i+1)%5].token);assert.equal(shared.research.candidates[0].evidence.length,i+1);
   await request('/api/research/events',{...common,schema:'agent_vote.v1',event_id:`v-${i}`,agent_id:principal.id,role:ROLES[i],vote:'YES',reason:'Test review',evidence_ids:[`source-${i}`],counterevidence_ids:[],risk_flags:[]},principal.token);
  }
  const risk={...common,schema:'risk_assessment.v1',event_id:'risk',agent_id:credentials[5].id,contract:'PASS',liquidity:'PASS',sellability:'PASS',max_amount_usdc:50,reason:'Adapter claim'};
  await request('/api/research/events',{...risk,agent_id:credentials[0].id},credentials[0].token,422);
  await request('/api/research/events',risk,credentials[5].token);
  await cmd({type:'DEPOSIT',eur:150});await cmd({type:'TOGGLE_BOT'});await cmd({type:'SET_AUTO',enabled:true});
  let s=(await request('/api/state')).state;assert.equal(s.positions.length,0);assert.match(s.research.candidates[0].reason,/REAL_VALIDATOR_UNAVAILABLE/);
  await cmd({type:'SET_EXITS',mode:'TRAILING',profit:15,loss:10,trailing:25});
  await cmd({type:'SIMULATE_AGENTS',negative:true});s=(await request('/api/state')).state;assert.equal(s.positions.length,0);
  await cmd({type:'SIMULATE_AGENTS'});s=(await request('/api/state')).state;assert.equal(s.positions.length,1);assert.equal(s.positions[0].amountUsdc,50);
  const positionId=s.positions[0].id;
  await cmd({type:'DEMO_MOVE',id:positionId,percent:20});s=(await request('/api/state')).state;assert.equal(s.positions.length,1);
  await cmd({type:'TOGGLE_BOT'});await cmd({type:'SIMULATE_AGENTS'});s=(await request('/api/state')).state;assert.equal(s.positions.length,1);
  const count=s.research.events.length;
  await stop(running.child);running=await launch(dir);base=running.base;
  s=(await request('/api/state')).state;assert.equal(s.research.events.length,count);assert.equal(s.positions.length,1);assert.equal(s.entriesEnabled,false);
  await request('/api/research/events',event,credentials[0].token);s=(await request('/api/state')).state;assert.equal(s.research.events.length,count);
  await cmd({type:'DEMO_MOVE',id:positionId,percent:-30});s=(await request('/api/state')).state;assert.equal(s.positions.length,0);assert(s.cashUsdc>0);
  const rendered=await (await fetch(base+'/')).text();assert.match(rendered,/Fünf-Agenten-Kommunikation/);
  assert(!JSON.stringify(s).includes(credentials[0].token));assert(!rendered.includes(credentials[0].token));
 }finally{if(running)await stop(running.child);await rm(dir,{recursive:true,force:true})}
});
test('corrupt state fails closed without overwriting original',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-corrupt-')),file=path.join(dir,'paper-state-v03.json');
 try{await writeFile(file,'{broken');await assert.rejects(()=>launch(dir));assert.equal(await readFile(file,'utf8'),'{broken')}
 finally{await rm(dir,{recursive:true,force:true})}
});
