// Local transport adapter. No API/model call and no trading/admin commands.
// node runner/agent-client.mjs get
// node runner/agent-client.mjs send event.json
// node runner/agent-client.mjs notes
// node runner/agent-client.mjs put-note note.json
// Token comes from SNIPER_AGENT_TOKEN, not command-line arguments or logs.
import {readFileSync} from 'node:fs';
const token=process.env.SNIPER_AGENT_TOKEN;
if(!token)throw Error('SNIPER_AGENT_TOKEN für genau eine registrierte Rolle setzen');
const port=Number(process.env.SNIPER_PORT||3030);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Ungültiger Port');
const mode=process.argv[2];if(!['get','send','notes','put-note'].includes(mode))throw Error('get, send event.json, notes oder put-note note.json');
const payload=['send','put-note'].includes(mode)?readFileSync(process.argv[3],'utf8'):null;
if(payload&&Buffer.byteLength(payload,'utf8')>6000)throw Error('Notiz zu gross');
const route=['notes','put-note'].includes(mode)?'/api/agent/scratchpad':'/api/research'+(mode==='send'?'/events':'');
const response=await fetch(`http://127.0.0.1:${port}${route}`,{method:payload?'POST':'GET',headers:{authorization:`Bearer ${token}`,...(payload?{'content-type':'application/json'}:{})},...(payload?{body:payload}:{}),signal:AbortSignal.timeout(10000)});
console.log(await response.text());if(!response.ok)process.exitCode=1;
