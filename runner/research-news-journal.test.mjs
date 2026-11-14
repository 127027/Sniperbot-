import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {updateLocalNewsJournal} from './research-news-journal.mjs';

const now='2026-11-10T08:00:00Z';
const plus=n=>new Date(Date.parse(now)+n*60000).toISOString();
const xml='<rss><channel><item><title><![CDATA[White House viral penguin news sparks meme speculation]]></title>'+
 '<link>https://news.example.org/original</link>'+
 '<pubDate>Tue, 10 Nov 2026 07:30:00 GMT</pubDate>'+
 '<description><![CDATA[Political meme story with no verified coin ID]]></description></item></channel></rss>';
test('first-seen RSS news is persistent, not refetched for 15 minutes or treated as token advice',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-news-journal-'));
 const filename=path.join(dir,'private-news-captures.json');
 const cash=path.join(dir,'paper-state-v03.json');
 await writeFile(cash,'{"cashUsdc":5000}');
 let count=0;
 const fetcher=async()=>{count++;return {ok:true,headers:{get:()=>null},text:async()=>xml}};
 try{
  let a=await updateLocalNewsJournal({filename,fetcher,now});
  assert.equal(count,3);assert.equal(a.new_saved_events,1);
  assert.equal(a.leads[0].first_observed_at_utc,now);
  assert.equal(a.leads[0].candidate_id,null);
  a=await updateLocalNewsJournal({filename,fetcher,now:plus(14)});
  assert.equal(count,3,'no bursts when 2-minute market scan runs repeatedly');
  assert.equal(a.new_saved_events,0);
  a=await updateLocalNewsJournal({filename,fetcher,now:plus(15)});
  assert.equal(count,6);
  assert.equal(a.new_saved_events,0,'same original news URL is not duplicated');
  const saved=JSON.parse(await readFile(filename,'utf8'));
  assert.equal(saved.events.length,1);
  assert.equal(saved.events[0].first_observed_at_utc,now,'archive first capture unchanged on re-read');
  assert.equal(saved.actionable,false);
  assert.equal(await readFile(cash,'utf8'),'{"cashUsdc":5000}');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('malformed local research archive never silently overwrites existing evidence',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-news-corrupt-'));
 const filename=path.join(dir,'news.json');
 await writeFile(filename,'{unparsed raw');
 try{
  await assert.rejects(updateLocalNewsJournal({filename,now}),SyntaxError);
  assert.equal(await readFile(filename,'utf8'),'{unparsed raw');
 }finally{await rm(dir,{recursive:true,force:true})}
});
test('when news provider is down, archive records explicit failure instead of inventing posts',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'sniper-news-outage-'));
 const filename=path.join(dir,'news.json');
 try{
  const a=await updateLocalNewsJournal({filename,now,fetcher:async()=>{throw Error('DNS_BLOCKED')}});
  assert.equal(a.leads.length,0);
  assert.equal(a.new_saved_events,0);
  assert.equal(a.coverage.length,3);
  assert(a.coverage.every(c=>c.status==='SOURCE_UNAVAILABLE'));
 }finally{await rm(dir,{recursive:true,force:true})}
});
