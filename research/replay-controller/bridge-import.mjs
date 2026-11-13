// R15: stage five independently stored bridge votes for a DIAGNOSTIC/SYNTHETIC replay.
// No simulated fills until the caller separately runs controller.mjs advance.
// BLIND import is deliberately unavailable without independent role-authentication.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ROLES,digest,validateDecisions} from './engine.mjs';
import {load,nextFrame} from './controller.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));

export function importBridgeVotes(name,bridgeDirectory){
 const s=load(name);
 if(!['DIAGNOSTIC','SYNTHETIC'].includes(s.meta.mode))
  throw Error('BLIND_IMPORT_REQUIRES_INDEPENDENT_AGENT_PROVENANCE');
 const info=nextFrame(name);
 if(info.status!=='WAITING_FOR_FIVE_ROLES')throw Error('REPLAY_ALREADY_COMPLETE');
 const recordedFrame=read(path.join(bridgeDirectory,'input.json'));
 const expectedFrame=read(info.input_path);
 if(recordedFrame.index!==expectedFrame.index||
    recordedFrame.input_hash!==expectedFrame.input_hash||
    digest(recordedFrame)!==digest(expectedFrame))
   throw Error('BRIDGE_INPUT_NOT_CURRENT_FRAME');
 const votes=[];
 for(const role of ROLES){
  const file=path.join(bridgeDirectory,'decisions',role+'.json');
  if(!fs.existsSync(file))throw Error('MISSING_REAL_BRIDGE_VOTE:'+role);
  const v=read(file);
  if(v.role!==role)throw Error('WRONG_ROLE_IN_BRIDGE_FILE:'+role);
  votes.push(v);
 }
 validateDecisions(expectedFrame,votes);
 const destination=info.decision_directory;
 if(fs.existsSync(destination))throw Error('DECISION_DIRECTORY_ALREADY_EXISTS');
 const parent=path.dirname(destination);
 fs.mkdirSync(parent,{recursive:true});
 const staging=fs.mkdtempSync(path.join(parent,'.bridge-staging-'));
 try{
  for(let i=0;i<ROLES.length;i++){
   const file=path.join(staging,ROLES[i]+'.json');
   fs.writeFileSync(file,JSON.stringify(votes[i],null,2)+'\n',{flag:'wx'});
  }
  fs.writeFileSync(path.join(staging,'_import_receipt.json'),JSON.stringify({
   schema:'dot_replay_vote_import.v1',mode:s.meta.mode,
   index:expectedFrame.index,input_hash:expectedFrame.input_hash,
   roles:ROLES.map((r,i)=>({role:r,run_id:votes[i].run_id,sha256:digest(votes[i])})),
   provenance:'SOURCE_FILES_ARE_NOT_INDEPENDENTLY_AUTHENTICATED',
   successful_blind_test:false,no_orders_executed:true
  },null,2)+'\n',{flag:'wx'});
  fs.renameSync(staging,destination);
 }catch(e){fs.rmSync(staging,{recursive:true,force:true});throw e;}
 return {status:'FIVE_VOTES_STAGED_DIAGNOSTIC_ONLY',index:expectedFrame.index,
  staged_roles:ROLES,decision_directory:destination,
  next_step:'Run controller.mjs advance only after inspecting the vote import receipt',
  independently_authenticated:false,trade_executed:false,blind_test_passed:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [name,bridgePath]=process.argv.slice(2);
  if(!name||!bridgePath)throw Error('Usage: node bridge-import.mjs RUN_NAME /path/to/bridge/frame');
  console.log(JSON.stringify(importBridgeVotes(name,path.resolve(bridgePath)),null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
