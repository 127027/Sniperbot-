// Local transport adapter. No API/model call and no trading/admin commands.
// node runner/agent-client.mjs get
// node runner/agent-client.mjs send event.json
// Token comes from SNIPER_AGENT_TOKEN, not command-line arguments or logs.
import {readFileSync} from 'node:fs';
const token=process.env.SNIPER_AGENT_TOKEN;
if(!token)throw Error('SNIPER_AGENT_TOKEN für genau eine registrierte Rolle setzen');
const port=Number(process.env.SNIPER_PORT||3030);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Ungültiger Port');
const mode=process.argv[2];if(!['get','send'].includes(mode))throw Error('get oder send event.json');
const payload=mode==='send'?readFileSync(process.argv[3],'utf8'):null;
const response=await fetch(`http://127.0.0.1:${port}/api/research${mode==='send'?'/events':''}`,{method:mode==='send'?'POST':'GET',headers:{authorization:`Bearer ${token}`,...(payload?{'content-type':'application/json'}:{})},...(payload?{body:payload}:{}),signal:AbortSignal.timeout(10000)});
console.log(await response.text());if(!response.ok)process.exitCode=1;
