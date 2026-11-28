import test from 'node:test';
import assert from 'node:assert/strict';
import {replay} from './recorder.mjs';
import {fresh} from './paper.mjs';
const t=1795876980000;
const row=(seq,at,kind='scan',data={})=>({version:1,mode:'PAPER_ONLY',session:'test',seq,at,kind,data});
test('window excludes future records, rejects gaps and reverse ordering',()=>{
 const args={start:t,end:t+1000,initial:fresh()};
 assert.equal(replay([row(1,t),row(2,t+1000,'toggle',{enabled:true})],args).state.enabled,false);
 assert.throws(()=>replay([row(1,t),row(3,t+1)],args),/SEQUENCE_GAP/);
 assert.throws(()=>replay([row(1,t+2),row(2,t+1)],args),/OUT_OF_ORDER/);
});
