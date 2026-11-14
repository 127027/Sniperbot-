import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {fetchMasterPresence,GITHUB_MASTER_ENDPOINT} from './github-master-presence.mjs';
import {createSignedMasterPresence} from './device-topology.mjs';
const master='device_'+'a'.repeat(32),follower='device_'+'b'.repeat(32);
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const at=Date.parse('2026-11-10T18:00:00Z');
const cfg={mode:'FOLLOWER',master_device_id:master,
 github_repository:'127027/Sniperbot-',github_branch:'coordination/master-live',
 master_public_key_pem:publicKey.export({format:'pem',type:'spki'})};
const env=createSignedMasterPresence({masterDeviceId:master,sequence:55,now:at,privateKey});
function response(envelope=env){
 return new Response(JSON.stringify({type:'file',path:'coordination/master-presence.v1.json',
 encoding:'base64',content:Buffer.from(JSON.stringify(envelope)).toString('base64')}),{status:200});
}
test('GitHub read of pinned signed master presence only indicates recent contact',async()=>{
 let called=0;
 const fetcher=async(url,opts)=>{
  called++;
  assert.equal(new URL(url).origin,'https://api.github.com');
  assert.equal(new URL(url).pathname,new URL(GITHUB_MASTER_ENDPOINT).pathname);
  assert.equal(new URL(url).searchParams.get('ref'),'coordination/master-live');
  assert.equal(opts.method,'GET');
  return response();
 };
 const r=await fetchMasterPresence(cfg,{fetcher,now:at+5000});
 assert.equal(called,1);
 assert.equal(r.coordination_online,true);
 assert.equal(r.trade_authorized,false);
 assert.equal(r.sequence,55);
});
test('stale/forged/offline GitHub state displays phone-the-master warning',async()=>{
 for(const fetcher of [
  async()=>response({...env,sequence:999}),
  async()=>new Response('not here',{status:404}),
  async()=>new Response('bad json'),
  async()=>{throw Error('OFFLINE')}
 ]){
  const r=await fetchMasterPresence(cfg,{fetcher,now:at+5000});
  assert.equal(r.coordination_online,false);
  assert.equal(r.trade_authorized,false);
  assert.equal(r.message,'Keine Verbindung – ruf Andreas an');
 }
 const outdated=await fetchMasterPresence(cfg,{fetcher:async()=>response(),now:at+130000});
 assert.equal(outdated.coordination_online,false);
});
test('an attacker cannot inject a different URL or GitHub branch',async()=>{
 let called=0;
 const r=await fetchMasterPresence({...cfg,github_branch:'malicious'},
  {fetcher:async()=>{called++;return response()},now:at+1000});
 assert.equal(r.coordination_online,false);
 assert.equal(called,0);
});
