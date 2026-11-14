import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,createHash} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';
import {enrollPaperPublisherPublicKey} from './paper-publisher-trust.mjs';
test('explicit Dot pairing stores only a PUBLIC Ed25519 key, never a wallet or signer private key',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-public-trust-'));
 try{
  const filename=path.join(dir,'trusted-execution-publishers.json');
  const ed=generateKeyPairSync('ed25519');
  const publicKeyPem=ed.publicKey.export({type:'spki',format:'pem'});
  const privateKeyPem=ed.privateKey.export({type:'pkcs8',format:'pem'});
  const receipt=await enrollPaperPublisherPublicKey({filename,issuer:'dot-news',
   keyId:'key-2026',publicKeyPem});
  assert.equal(receipt.registered,true);
  assert.equal(receipt.private_key_received,false);
  assert.equal(receipt.live_trading_enabled,false);
  assert.equal(receipt.public_key_fingerprint_sha256,createHash('sha256').update(publicKeyPem).digest('hex'));
  const raw=await readFile(filename,'utf8');
  assert(!raw.includes(privateKeyPem));
  assert(!raw.includes('BEGIN PRIVATE KEY'));
  const registry=JSON.parse(raw);
  assert.equal(registry.length,1);
  assert.equal(registry[0].scope,'agent_execution');
  await assert.rejects(enrollPaperPublisherPublicKey({
   filename,issuer:'dot-news',keyId:'key-2026',publicKeyPem}),/ALREADY_REGISTERED/);
  await assert.rejects(enrollPaperPublisherPublicKey({
   filename,issuer:'another-dot',keyId:'different-key',publicKeyPem}),/ALREADY_TRUSTED/);
  await assert.rejects(enrollPaperPublisherPublicKey({filename,issuer:'dot-news',
   keyId:'bad-key',publicKeyPem:privateKeyPem}),/INVALID_PAPER_PUBLISHER_REQUEST/);
 }finally{await rm(dir,{force:true,recursive:true})}
});
test('reject malformed PEM and unsuitable ECDSA signer, never mutate trust file',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'sniper-public-trust-'));
 try{
  const filename=path.join(dir,'trusted-execution-publishers.json');
  const ec=generateKeyPairSync('ec',{namedCurve:'prime256v1'}).publicKey.export({type:'spki',format:'pem'});
  await assert.rejects(enrollPaperPublisherPublicKey({filename,issuer:'dot-news',
   keyId:'key-2026',publicKeyPem:ec}),/NOT_AN_ED25519/);
  await assert.rejects(enrollPaperPublisherPublicKey({filename,issuer:'dot-news',
   keyId:'key-2026',publicKeyPem:'NOT A KEY'}),/INVALID_PAPER/);
  await assert.rejects(readFile(filename));
 }finally{await rm(dir,{force:true,recursive:true})}
});
