// Persistent, read-only discovery register. No ranking, signals, wallets or orders.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const chains=new Set(['solana','ethereum','bsc','base','arbitrum','polygon','optimism','avalanche']);
const canon=(chain,c)=>chains.has(chain)&&typeof c==='string'?(chain==='solana'?(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(c)?c:null):(/^0x[0-9a-fA-F]{40}$/.test(c)?c.toLowerCase():null)):null;
const sha=s=>createHash('sha256').update(s).digest('hex');
const validTime=t=>typeof t==='string'&&Number.isFinite(Date.parse(t));
const iso=t=>new Date(t).toISOString();
const key=(chain,contract)=>chain+':'+contract;
const shard=k=>sha(k).slice(0,2);
const schema='cleanroom.token-registry.v1';
function merge(existing,evidence){
 if(evidence?.schema!=='cleanroom.evidence.v1'||!validTime(evidence.finished_at)||!Array.isArray(evidence.discovery?.rows)||!Array.isArray(evidence.rows))throw Error('DISCOVERY_INPUT_MISSING_OR_INVALID');
 const at=iso(evidence.finished_at), observed=new Map();
 for(const r of evidence.discovery.rows){
  const contract=canon(r.chain,r.contract);if(!contract)continue;
  const k=key(r.chain,contract), entry=observed.get(k)??{chain:r.chain,contract,observations:[],asset_ids:new Set()};
  for(const o of r.observations??[])if(typeof o.source==='string'&&typeof o.url==='string'&&o.url.startsWith('https://')&&validTime(o.retrieved_at)&&Date.parse(o.retrieved_at)<=Date.parse(at)){
   entry.observations.push({source:o.source,url:o.url,retrieved_at:iso(o.retrieved_at),symbol:o.symbol??null,pool:o.pool??null});
  }
  if(entry.observations.length)observed.set(k,entry);
 }
 for(const r of evidence.rows)for(const i of r.identities??[]){
  const contract=canon(i.chain,i.contract);if(!contract||typeof r.id!=='string'||!validTime(r.observed_at_utc)||Date.parse(r.observed_at_utc)>Date.parse(at)||typeof r.source_url!=='string'||!r.source_url.startsWith('https://'))continue;
  const k=key(i.chain,contract), entry=observed.get(k)??{chain:i.chain,contract,observations:[],asset_ids:new Set()};
  entry.asset_ids.add(r.id);entry.observations.push({source:'asset identity join',url:r.source_url,retrieved_at:at,symbol:r.coin??null,pool:i.pool?.pool_address??null});
  observed.set(k,entry);
 }
 const rows=new Map(existing.map(r=>[key(r.chain,r.contract),r]));let added=0,updated=0;
 for(const [k,x] of observed){
  const p=rows.get(k);if(p&&Date.parse(p.last_seen_at)>=Date.parse(at))continue;
  const times=x.observations.map(o=>o.retrieved_at).sort();
  const sourceMap=new Map((p?.sources??[]).map(o=>[o.source,o]));
  for(const o of x.observations){const old=sourceMap.get(o.source);if(!old||o.retrieved_at>=old.retrieved_at)sourceMap.set(o.source,o)}
  // Keep a bounded history of actual pool locators per token; a new pool is not a new token.
  const poolMap=new Map((p?.observed_pools??[]).map(v=>[v.pool_address,v]));
  for(const o of [...(p?.sources??[]),...x.observations]){
   const address=canon(x.chain,o.pool);if(!address||!validTime(o.retrieved_at))continue;
   const old=poolMap.get(address),t=iso(o.retrieved_at);
   poolMap.set(address,{pool_address:address,first_observed_at:old&&old.first_observed_at<t?old.first_observed_at:t,last_observed_at:old&&old.last_observed_at>t?old.last_observed_at:t});
  }
  const observed_pools=[...poolMap.values()].sort((a,b)=>b.last_observed_at.localeCompare(a.last_observed_at)||a.pool_address.localeCompare(b.pool_address)).slice(0,32);
  // Preserve historical identities without implying that they are currently valid or verified memecoins.
  rows.set(k,{chain:x.chain,contract:x.contract,first_seen_at:p?.first_seen_at??times[0],last_seen_at:at,seen_snapshots:(p?.seen_snapshots??0)+1,asset_ids:[...new Set([...(p?.asset_ids??[]),...x.asset_ids])].sort(),sources:[...sourceMap.values()].sort((a,b)=>a.source.localeCompare(b.source)),observed_pools,classification:'DISCOVERY_ONLY_NOT_BUY'});
  p?updated++:added++;
 }
 return {rows:[...rows.values()].sort((a,b)=>key(a.chain,a.contract).localeCompare(key(b.chain,b.contract))),added,updated,observed:observed.size};
}
async function readJson(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code==='ENOENT')return fallback;throw e}}
async function atomic(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(value,null,2)+'\n');await fs.rename(file+'.tmp',file)}
if(process.argv.includes('--self-test')){
 const a='0x'+'a'.repeat(40),b='0x'+'b'.repeat(40),t='2026-11-26T12:00:00.000Z';
 const fixture=(at,cs)=>({schema:'cleanroom.evidence.v1',finished_at:at,rows:[],discovery:{rows:cs.map(contract=>({chain:'ethereum',contract,observations:[{source:'test',url:'https://example.com',retrieved_at:at}]}))}});
 const one=merge([],fixture(t,[a,a.toUpperCase().replace('0X','0x'),'bad']));assert.equal(one.added,1);
 const two=merge(one.rows,fixture('2026-11-26T12:05:00.000Z',[a,b]));assert.equal(two.added,1);assert.equal(two.rows.length,2);assert.equal(two.rows.find(r=>r.contract===a).seen_snapshots,2);
 const replay=merge(two.rows,fixture('2026-11-26T12:05:00.000Z',[a,b]));assert.equal(replay.added,0);assert.equal(replay.updated,0);assert.deepEqual(replay.rows,two.rows);
 const outage=merge(two.rows,fixture('2026-11-26T12:10:00.000Z',[]));assert.equal(outage.rows.length,2);assert.throws(()=>merge(two.rows,{rows:[]}));
 assert.notEqual(shard(key('ethereum',a)).length,0);assert.equal(canon('solana','AbCdEFghJKLMNPQRSTUVWXyz123456789'),'AbCdEFghJKLMNPQRSTUVWXyz123456789');
 const poolFixture=fixture(t,[a]);poolFixture.discovery.rows[0].observations[0].pool=b;
 const firstPool=merge([],poolFixture).rows[0];assert.equal(firstPool.observed_pools[0].pool_address,b);
 const secondPool=fixture('2026-11-26T12:05:00Z',[a]);secondPool.discovery.rows[0].observations[0].pool='0x'+'c'.repeat(40);
 assert.equal(merge([firstPool],secondPool).rows[0].observed_pools.length,2);
 console.log('Registry fixtures passed: deduplication, growth, replay, outage and input rejection');
}else{
 const root=process.env.CLEANROOM_REGISTRY_DIR??'research/cleanroom/token-registry',input=process.env.CLEANROOM_EVIDENCE??'research/cleanroom/evidence-latest.json';
 const e=JSON.parse(await fs.readFile(input,'utf8')), previous=await readJson(path.join(root,'index.json'),null);
 if(previous&&previous.schema!==schema)throw Error('INVALID_REGISTRY_SCHEMA');
 const old=[];for(const s of previous?.shards??[]){if(!/^[0-9a-f]{2}$/.test(s.id))throw Error('INVALID_SHARD_ID');const f=await readJson(path.join(root,s.id+'.json'),null);if(!f||f.schema!==schema||!Array.isArray(f.rows)||f.rows.length!==s.count||f.rows.some(r=>shard(key(r.chain,r.contract))!==s.id||!canon(r.chain,r.contract)))throw Error('REGISTRY_SHARD_MISSING_OR_INVALID');old.push(...f.rows)}
 if(previous&&old.length!==previous.total_contracts)throw Error('REGISTRY_COUNT_MISMATCH');
 const result=merge(old,e), groups=new Map(), priorGroups=new Map();
 for(const r of old){const s=shard(key(r.chain,r.contract));if(!priorGroups.has(s))priorGroups.set(s,[]);priorGroups.get(s).push(r)}
 for(const r of result.rows){const s=shard(key(r.chain,r.contract));if(!groups.has(s))groups.set(s,[]);groups.get(s).push(r)}
 const shards=[];for(const [id,rows] of [...groups].sort(([a],[b])=>a.localeCompare(b))){if(JSON.stringify(rows)!==JSON.stringify(priorGroups.get(id)))await atomic(path.join(root,id+'.json'),{schema,rows});shards.push({id,count:rows.length})}
 const by_chain={};for(const r of result.rows)by_chain[r.chain]=(by_chain[r.chain]??0)+1;
 const history=[...(previous?.history??[])];if(!history.some(h=>h.snapshot===e.finished_at))history.push({snapshot:e.finished_at,total:result.rows.length,added:result.added,updated:result.updated,observed:result.observed});
 const retainedPoolKeys=new Set(result.rows.flatMap(r=>(r.observed_pools??[]).map(p=>key(r.chain,p.pool_address))));
 const index={schema,retained_distinct_pool_locators:retainedPoolKeys.size,mode:'RESEARCH_ONLY',updated_at:new Date().toISOString(),last_snapshot:e.finished_at,total_contracts:result.rows.length,with_asset_mapping:result.rows.filter(r=>r.asset_ids.length).length,by_chain,shards,history:history.slice(-288),limitations:'Cumulative observed contract identities, not global coverage or verified memecoins. Stored observations are historical, never executable quotes. No deletions on provider outage.'};
 await atomic(path.join(root,'index.json'),index);console.log(JSON.stringify({total_contracts:index.total_contracts,added:result.added,updated:result.updated,observed:result.observed,by_chain,shards:shards.length}));
}
