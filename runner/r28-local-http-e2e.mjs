// Real HTTP localhost test for R28, with an EPHEMERAL offline bot process.
// Does not invoke OpenAI, GitHub, a real wallet or the user's actual portfolio.
// The signed paper selftest takes place in its own in-memory ledger.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {makeR28ConnectionReport} from './r28-connection-diagnostic.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-r28-connection-e2e-'));
const freePort=async()=>{
 const server=net.createServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 await new Promise(resolve=>server.close(resolve));
 return port;
};
let proc,lastErr='';
try{
 const port=await freePort(),base='http://127.0.0.1:'+port;
 proc=spawn(process.execPath,[path.join(root,'runner','server.mjs')],{
  cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],
  env:{...process.env,SNIPER_PORT:String(port),SNIPER_DATA_DIR:dir,
   SNIPER_OFFLINE:'1',SNIPER_PIPELINE_QA:'1',
   SNIPER_CENTRAL_AI_ENABLED:'0',SNIPER_OPENAI_API_KEY:'',
   SNIPER_LOCAL_DISCOVERY:'0',SNIPER_RESEARCH_READ:'0',
   SNIPER_AGENT_PAPER_FEED:'0',SNIPER_RESEARCH_FEED:'0'}
 });
 proc.stderr.on('data',buf=>lastErr=(lastErr+buf.toString()).slice(-1700));
 let up=false;
 for(let k=0;k<110;k++){
  if(proc.exitCode!==null)throw Error('R28_SERVER_EXIT '+lastErr);
  try{
   const r=await fetch(base+'/api/health');
   if(r.ok){up=true;break}
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert(up,'R28_TEST_LOCAL_BOT_FAILED '+lastErr);
 const before=(await (await fetch(base+'/api/state')).json()).state;
 const result=await makeR28ConnectionReport({port});
 assert.equal(result.conclusion,'BOT_AND_TEST_PIPELINE_OK_AI_DISABLED');
 assert.equal(result.bot.online,true);
 assert.equal(result.central_ai.real_openai_exchange_observed,false);
 assert.equal(result.isolated_signed_paper_roundtrip.passed,true);
 assert.equal(result.isolated_signed_paper_roundtrip.original_paper_state_untouched,true);
 const after=(await (await fetch(base+'/api/state')).json()).state;
 assert.deepEqual(after.positions,before.positions);
 assert.equal(after.cashEur,before.cashEur);
 assert.equal(after.cashUsdc,before.cashUsdc);
 assert.equal(after.agentOrderReceipts.length,before.agentOrderReceipts.length);
 assert.equal(result.chat_session_direct_connection,false);
 console.log('R28_REAL_LOCAL_HTTP_HANDSHAKE_PASSED_OFFLINE_NO_USER_FUNDS');
}catch(e){
 console.error('R28_REAL_LOCAL_HTTP_HANDSHAKE_FAILED',String(e?.message||e).slice(0,2000));
 process.exitCode=1;
}finally{
 if(proc&&proc.exitCode===null){
  proc.kill();
  await new Promise(resolve=>{
   if(proc.exitCode!==null)return resolve();
   proc.once('exit',resolve);
   setTimeout(resolve,5000).unref?.();
  });
 }
 await rm(dir,{recursive:true,force:true});
}
