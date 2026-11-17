import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ps=readFileSync(new URL('./windows-supervisor.ps1',import.meta.url),'utf8');
const courier=readFileSync(new URL('./r29-windows-courier.mjs',import.meta.url),'utf8');
const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
test('opted-in direct GPT Responses API is exclusive Paper strategist, no second GitHub order source',()=>{
 assert.match(ps,/SNIPER_R29_GPT_SOURCE/);
 assert.match(ps,/LOCAL_OPENAI_API/);
 assert.match(ps,/SNIPER_GPT_PAPER_BRIDGE.*if\(\$WithCentralAI/);
 assert.match(courier,/process\.env\.SNIPER_R29_GPT_SOURCE!=='LOCAL_OPENAI_API'/);
 assert.match(server,/SNIPER_CENTRAL_AI_ENABLED==='1'/);
 assert.match(server,/SNIPER_GPT_PAPER_BRIDGE==='1'/);
});
test('local AI API key stays opt-in DPAPI; never added to R29 public GitHub courier',()=>{
 assert.match(ps,/openai-api-key\.dpapi/);
 assert.match(ps,/ConvertTo-SecureString/);
 assert.match(ps,/SNIPER_OPENAI_API_KEY/);
 const courierAssignment=ps.indexOf("if($role -eq 'R29')");
 const modelAssignment=ps.indexOf("if($role -eq 'BOT')");
 assert(modelAssignment< courierAssignment);
 assert(!ps.slice(courierAssignment,courierAssignment+410).includes("SNIPER_OPENAI_API_KEY"));
 assert.match(ps,/SNIPER_PAPER_AUTOPILOT'\] = '0'/);
});
