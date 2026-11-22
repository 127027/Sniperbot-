import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const src='scripts/cloud-discovery-runner.mjs';
test('cloud Dot2 runner compiles without executing provider APIs or orders',()=>{
 assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',src],{encoding:'utf8'}));
});
test('multi-chain runner no longer references removed oldCheckpoint variable',async()=>{
 const s=await readFile(src,'utf8');
 assert.ok(s.includes('previous_chain_page_checkpoints'));
 assert.ok(s.includes('precedingMemory.checkpoints'));
 assert.ok(!/oldCheckpoint\s*\?\./.test(s));
});
test('canonical new-chat handoff exists and points to progress and safety contract',async()=>{
 const agents=await readFile('AGENTS.md','utf8');
 const handoff=await readFile('docs/R29_NEXT_CHAT_HANDOFF.md','utf8');
 const readme=await readFile('README.md','utf8');
 for(const file of ['docs/R29_NEXT_CHAT_HANDOFF.md','docs/V19_IMPLEMENTATION_PROGRESS.md']){
   assert.ok(agents.includes(file));
   assert.ok(readme.includes(file));
 }
 assert.ok(handoff.includes('codex/r29-cleanroom-paper-20261121'));
 assert.ok(handoff.includes('keine Echtgeld'));
 assert.ok(handoff.includes('61'));
});
