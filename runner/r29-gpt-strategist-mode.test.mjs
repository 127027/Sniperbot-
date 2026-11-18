import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ps=readFileSync(new URL('./windows-supervisor.ps1',import.meta.url),'utf8');
const courier=readFileSync(new URL('./r29-windows-courier.mjs',import.meta.url),'utf8');
const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
const start=readFileSync(new URL('../Sniperbot_Starten.bat',import.meta.url),'utf8');

test('canonical R29 starts only existing GitHub GPT courier, no paid API second strategist',()=>{
 assert.match(start,/windows-supervisor\.ps1\" -WithR29/);
 assert.match(ps,/SNIPER_R29_GPT_SOURCE'\]='GITHUB_CHATGPT_COURIER'/);
 assert.match(ps,/SNIPER_GPT_PAPER_BRIDGE'\] = '1'/);
 assert.match(ps,/SNIPER_PAPER_AUTOPILOT'\] = '0'/);
 assert.match(ps,/SNIPER_CENTRAL_AI_ENABLED'\] = '0'/);
 assert.match(courier,/relayGptPaperDecision\(/);
 assert.match(server,/SNIPER_GPT_PAPER_BRIDGE==='1'/);
 assert.match(server,/GITHUB_GPT_ONLY_LOCAL_API_REMOVED/);
 assert.doesNotMatch(ps,/WithCentralAI|ResetAiKey|Initialize-AiKey|Read-AiKey|openai-api-key\.dpapi/);
 assert.doesNotMatch(ps,/LOCAL_OPENAI_API/);
 assert.doesNotMatch(courier,/LOCAL_OPENAI_API/);
 assert.doesNotMatch(server,/startCentralAiCoordinator|SNIPER_CENTRAL_AI_ENABLED==='1'/);
});

test('legacy local encrypted AI key is NEVER deleted, read or forwarded; GitHub PAT remains',()=>{
 assert.doesNotMatch(ps,/Remove-Item[^\n]*openai-api-key/);
 assert.doesNotMatch(ps,/Read-Host 'OpenAI API-Key/);
 assert.doesNotMatch(ps,/Read-AiKey|Initialize-AiKey/);
 assert.match(ps,/EnvironmentVariables.Remove\('SNIPER_OPENAI_API_KEY'\)/);
 assert.doesNotMatch(server,/process\.env\.SNIPER_OPENAI_API_KEY/);
 const publisherAssignment=ps.indexOf("if($role -eq 'R29')");
 const botAssignment=ps.indexOf("if($role -eq 'BOT')");
 assert(botAssignment>=0&&botAssignment<publisherAssignment);
 assert.match(ps,/SNIPER_R29_GITHUB_TOKEN/);
 assert.match(ps,/SNIPER_MARKET_PUBLISH/);
});
