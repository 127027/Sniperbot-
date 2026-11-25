import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareScalableStrategy} from './producer/scalable.mjs';
import {scalableReceiver} from './consumer/receiver.mjs';
import {blobSha} from '../r31/github.mjs';
import {createAccount,updateAccountControls} from '../r31/device-account.mjs';
const at=(h,m=0)=>'2026-11-25T'+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00.000Z';
const review=(i,h,disposition='ENTRY_ALLOWED',rank=i+1)=>({coin:'TEST'+i,contract:'contract-'+i,chain:'Solana',disposition,reason:'synthetic fixture',risk:'synthetic only',price_eur:1,observed_at_utc:at(h),source_url:'https://example.com/fixture',...(disposition==='ENTRY_ALLOWED'?{entry_rank:rank}:{})});
const header=(h,sequence,previous_blob_sha=null)=>({mode:'PAPER_ONLY',sequence,target_utc:at(h),published_at_utc:at(h),expires_at_utc:at(h,15),previous_blob_sha});
const fresh=()=>{const a=createAccount({now:at(7),initial_cents:50000,max_invest_cents:50000});return updateAccountControls(a,{expected_revision:1,max_invest_cents:50000,stake_cents:5000,allow_new_buys:true},at(7))};
function loader(p,alter){const files=new Map(p.files.map(f=>[f.path,f.content]));return async path=>{let raw=files.get(path);if(!raw)throw Error('MISSING_PART');if(alter)raw=alter(path,raw);return {data:JSON.parse(raw),sha:blobSha(Buffer.from(raw))}}}
test('2001 recommendations, sharded snapshot verified before single local settlement; no 500 ceiling in v2',async()=>{
 const p=prepareScalableStrategy({header:header(8,1),universe:{coins:[]},reviews:Array.from({length:2001},(_,i)=>review(i,8)).reverse()});
 assert.equal(p.manifest.parts.length,9);assert.equal(p.manifest.count,2001);
 const receiver=scalableReceiver({read:loader(p)}),a=fresh(),r=await receiver.process(a,{now:at(8,1)});
 assert.equal(r.account.ledger.positions.length,10);assert.equal(r.account.ledger.cash_eur,0);assert.equal(a.ledger.cash_eur,500);assert.equal(r.account.ledger.positions[0].coin,'TEST0');assert.equal(r.account.ledger.positions[9].coin,'TEST9');
 assert.equal((await receiver.process(r.account,{now:at(8,2)})).status,'ALREADY_PROCESSED');
 const q=prepareScalableStrategy({header:header(9,2,p.pointer.blob_sha),universe:p.universe,reviews:[review(0,9,'EXIT'),review(2001,9,'ENTRY_ALLOWED',1)]});
 assert.equal(q.manifest.count,2002);const next=await scalableReceiver({read:loader(q)}).process(r.account,{now:at(9,1)});assert.equal(next.account.ledger.positions.some(x=>x.coin==='TEST0'),false);assert.equal(next.account.ledger.positions.length,9); // sale at unchanged price nets less than 50, no forced extra buy
});
test('missing/tampered shard fails before any booking, not partial portfolio',async()=>{
 const p=prepareScalableStrategy({header:header(8,1),universe:{coins:[]},reviews:Array.from({length:501},(_,i)=>review(i,8))});
 const a=fresh();await assert.rejects(()=>scalableReceiver({read:loader(p,(path,raw)=>path.endsWith('part-0001.json')?raw+' ':raw)}).process(a,{now:at(8,1)}),/PART_HASH_OR_SCHEMA/);assert.equal(a.ledger.positions.length,0);
 await assert.rejects(()=>scalableReceiver({read:async path=>{if(path.endsWith('part-0002.json'))throw Error('MISSING_PART');return loader(p)(path)}}).process(a,{now:at(8,1)}),/MISSING_PART/);
});
