// Copy only validated sealed history, never partial role files or future frames.
import fs from 'node:fs';
import path from 'node:path';
import {load,runPath} from './controller.mjs';
import {digest} from './engine.mjs';
export function forkSealedPrefix(sourceName,targetName,dataset,count){
 if(!targetName.startsWith('r22-'))throw Error('R22_TARGET_REQUIRED');
 if(!Number.isInteger(count)||count<1||count>=dataset.ticks.length)throw Error('INVALID_CHECKPOINT_LENGTH');
 const source=load(sourceName),target=runPath(targetName);
 if(source.meta.mode!=='DIAGNOSTIC'||digest(source.dataset)!==digest(dataset))throw Error('CHECKPOINT_DATASET_MISMATCH');
 if(source.index<count)throw Error('CHECKPOINT_NOT_SEALED');
 if(fs.existsSync(target))throw Error('CHECKPOINT_TARGET_EXISTS');
 fs.mkdirSync(path.join(target,'commits'),{recursive:true});
 for(const name of ['meta.json','dataset.private.json'])
  fs.copyFileSync(path.join(source.root,name),path.join(target,name),fs.constants.COPYFILE_EXCL);
 for(let i=0;i<count;i++){
  const name=String(i).padStart(5,'0')+'.json';
  fs.copyFileSync(path.join(source.root,'commits',name),path.join(target,'commits',name),fs.constants.COPYFILE_EXCL);
 }
 const verified=load(targetName);
 if(verified.index!==count)throw Error('CHECKPOINT_REPLAY_FAILED');
 return {source_session:sourceName,inherited_frames:count,next_frame_index:count,
  next_historical_time:dataset.ticks[count],sealed_prefix_hash:verified.previous_hash,
  inherited_votes_are_new_model_responses:false};
}
