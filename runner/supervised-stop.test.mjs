import test from 'node:test';
import assert from 'node:assert/strict';
import {PassThrough} from 'node:stream';
import {attachSupervisedStop} from './supervised-stop.mjs';

test('ordinary unsupervised instance ignores stdin without mutating data',()=>{
  const stream=new PassThrough();
  let stopped=0;
  const detach=attachSupervisedStop(()=>stopped++,{env:{},stream});
  stream.write('SNIPER_STOP_V1\n');
  assert.equal(stopped,0);
  detach();stream.destroy();
});
test('supervisor command on private stdin stops only once',()=>{
  const stream=new PassThrough();let stopped=0;
  const detach=attachSupervisedStop(()=>stopped++,{env:{SNIPER_SUPERVISED:'1'},stream});
  stream.write('SNIPER_ST');
  stream.write('OP_V1\n');
  stream.write('SNIPER_STOP_V1\n');
  assert.equal(stopped,1);
  detach();stream.destroy();
});
test('ordinary input and unrecognized commands have no effect',()=>{
  const stream=new PassThrough();let stopped=0;
  attachSupervisedStop(()=>stopped++,{env:{SNIPER_SUPERVISED:'1'},stream});
  stream.write('BUY\nSELL\nRESET\n');
  assert.equal(stopped,0);stream.destroy();
});
