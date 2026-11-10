import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {archiveNewsEvent,archivedNewsEvent,newsArchivePath} from './research-news-archive.mjs';
import {updateLocalNewsJournal} from './research-news-journal.mjs';

const day0='2026-11-10T08:00:00Z';
const plusDays=n=>new Date(Date.parse(day0)+n*86400000).toISOString();
const xml='<rss><channel><item><title>Viral squirrel memecoin narrative</title>'+
 '<link>https://news.example.org/squirrel</link>'+
 '<pubDate>Tue, 10 Nov 2026 07:30:00 GMT</pubDate>'+
 '<description>New token launch</description></item></channel></rss>';
const fetcher=async()=>({ok:true,headers:{get:()=>null},text:async()=>xml});
const example=(id='a'.repeat(32),first=day0)=>({
 event_id:'news-'+id,source_url:'https://news.example.org/squirrel',
 original_published_at_utc:'2026-11-10T07:30:00.000Z',
 first_observed_at_utc:first,paper_only:true,actionable:false,
 title:'Viral squirrel memecoin narrative',candidate_id:null
});

test('day-46 retention only trims hot cache; first-seen evidence remains in immutable month shard',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-archive-retain-'));
 const filename=path.join(dir,'news.json');
 const ledger=path.join(dir,'paper-state-v03.json');
 await writeFile(ledger,'{"cashUsdc":500}');
 try{
  const a=await updateLocalNewsJournal({filename,now:day0,fetcher});
  assert.equal(a.new_saved_events,1);
  const event=a.leads[0];
  const file=newsArchivePath(filename,event);
  const original=await readFile(file,'utf8');
  assert.equal(JSON.parse(original).first_observed_at_utc,day0);
  const b=await updateLocalNewsJournal({filename,now:plusDays(46),fetcher});
  assert.equal(b.stored_events,0);
  assert.equal((await archivedNewsEvent(filename,event)).first_observed_at_utc,day0);
  assert.equal(await readFile(file,'utf8'),original);
  assert.equal(await readFile(ledger,'utf8'),'{"cashUsdc":500}');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('duplicate URL preserves first seen; later snapshot never replaces immutable evidence',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-archive-idempotent-'));
 const filename=path.join(dir,'news.json');
 try{
  const first=example();
  const a=await archiveNewsEvent(filename,first);
  assert.equal(a.created,true);
  const b=await archiveNewsEvent(filename,{...first,first_observed_at_utc:plusDays(46),title:'New title changed later'});
  assert.equal(b.created,false);
  assert.equal(b.event.first_observed_at_utc,day0);
  assert.equal(b.event.title,first.title);
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('corrupt durable record fails closed and does not silently overwrite hot journal or paper ledger',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-archive-failclosed-'));
 const filename=path.join(dir,'news.json'),cash=path.join(dir,'paper-state-v03.json');
 const e=example(),file=newsArchivePath(filename,e);
 await mkdir(path.dirname(file),{recursive:true});
 await writeFile(file,'{corrupted');
 const old={schema:'research_news_journal.v1',paper_only:true,actionable:false,
  last_check_at_utc:day0,last_coverage:[],events:[e]};
 await writeFile(filename,JSON.stringify(old));
 await writeFile(cash,'{"cashUsdc":123}');
 try{
  await assert.rejects(updateLocalNewsJournal({filename,now:plusDays(46),fetcher}),SyntaxError);
  assert.deepEqual(JSON.parse(await readFile(filename,'utf8')),old);
  assert.equal(await readFile(cash,'utf8'),'{"cashUsdc":123}');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('large historical event sequence survives identity-hash partitioning, even when hot journal caps at 1000',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-archive-many-'));
 const filename=path.join(dir,'news.json');
 try{
  for(let i=0;i<1001;i++){
   const e=example(i.toString(16).padStart(32,'0'),i<500?day0:plusDays(32));
   assert.equal((await archiveNewsEvent(filename,e)).created,true);
  }
  assert((await archivedNewsEvent(filename,example('0'.repeat(32)))).event_id);
  assert((await archivedNewsEvent(filename,example((1000).toString(16).padStart(32,'0'),plusDays(32)))).event_id);
 }finally{await rm(dir,{recursive:true,force:true})}
});
