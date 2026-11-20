import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('V6.9 supervisor starts no external API or WebSocket processes',()=>{
 const s=readFileSync(path.join(root,'runner/windows-supervisor.ps1'),'utf8');
 assert.match(s,/SNIPER_NETWORK_POLICY'\] = 'GITHUB_ONLY'/);
 assert.match(s,/NODE_OPTIONS'\] = '--import=\.\/runner\/github-only-network-policy\.mjs'/);
 assert.doesNotMatch(s,/\$market=Start-Child\s+'MARKET'/);
 assert.doesNotMatch(s,/\$solanaStream=Start-Child\s+'SOLANA'/);
 assert.match(s,/Start-Child\s+'R29'\s+'runner\/r29-windows-courier.mjs'/);
 const courier=readFileSync(path.join(root,'runner/r29-windows-courier.mjs'),'utf8');
 assert.doesNotMatch(courier,/syncGptPaperSecurityResearch\(/);
 assert.doesNotMatch(courier,/syncPublicForwardSolanaResearch\(/);
 assert.doesNotMatch(courier,/mirrorFreshLocalMarketToCanonical\(/);
});
test('V6.9 actual Node preload blocks non-GitHub APIs before connecting',()=>{
 const script=`
 import assert from 'node:assert/strict';
 import http from 'node:http';
 import https from 'node:https';
 import {isAllowedGithubOnlyEndpoint} from './runner/github-only-network-policy.mjs';
 assert.equal(isAllowedGithubOnlyEndpoint('https://api.github.com/repos/127027/Sniperbot-'),true);
 assert.equal(isAllowedGithubOnlyEndpoint('http://127.0.0.1:3030/api/health'),true);
 assert.equal(isAllowedGithubOnlyEndpoint('http://localhost:3030/api/health'),true);
 for(const uri of [
  'https://api.geckoterminal.com/api/v2/networks/solana/new_pools',
  'https://api.dexscreener.com/token-pairs/v1/solana/x',
  'https://api.gopluslabs.io/api/v1/token_security/1',
  'https://api.honeypot.is/v2/IsHoneypot',
  'https://quote-api.jup.ag/v6/quote',
  'https://api.mainnet-beta.solana.com/',
  'https://api.openai.com/v1/responses',
  'https://evil.example/',
  'http://example.com/',
  'https://api.github.com.evil.example/',
  'https://api.github.com:444/'
 ]){
  assert.equal(isAllowedGithubOnlyEndpoint(uri),false,uri);
  await assert.rejects(fetch(uri),{code:'R29_EXTERNAL_API_BLOCKED_GITHUB_ONLY'},uri);
 }
 assert.throws(()=>https.get('https://api.dexscreener.com/x'),
  {code:'R29_EXTERNAL_API_BLOCKED_GITHUB_ONLY'});
 assert.throws(()=>http.get('http://example.com/x'),
  {code:'R29_EXTERNAL_API_BLOCKED_GITHUB_ONLY'});
 if(typeof WebSocket==='function')
  assert.throws(()=>new WebSocket('wss://pumpportal.fun/api/data'),
   {code:'R29_EXTERNAL_API_BLOCKED_GITHUB_ONLY'});
 console.log('GITHUB_ONLY_EGRESS_ENFORCED');
 `;
 const out=execFileSync(process.execPath,['--input-type=module','-e',script],{
  cwd:root,encoding:'utf8',timeout:20000,
  env:{...process.env,SNIPER_NETWORK_POLICY:'GITHUB_ONLY',
   NODE_OPTIONS:'--import=./runner/github-only-network-policy.mjs'}
 });
 assert.match(out,/GITHUB_ONLY_EGRESS_ENFORCED/);
});
