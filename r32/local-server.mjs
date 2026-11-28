import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {Pilot} from './runtime.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const dir=process.env.R32_DATA_DIR||path.join(process.env.LOCALAPPDATA||os.homedir(),'MemeSniperR32');
const exec=promisify(execFile);
const readNarratives=async()=>{
  const {stdout}=await exec('gh',['api','repos/127027/Sniperbot-/contents/r32/feeds/events.json?ref=r32-local-paper',
    '-H','Accept: application/vnd.github.raw+json'],{timeout:20000,maxBuffer:3000000,windowsHide:true});
  return JSON.parse(stdout);
};
const bot=new Pilot({dir,readNarratives});
bot.diag.code_version=createHash('sha256').update(['local-server.mjs','runtime.mjs','scanner.mjs','decision.mjs','providers.mjs','risk.mjs']
  .map(f=>fs.readFileSync(path.join(root,f))).reduce((a,b)=>Buffer.concat([a,b]))).digest('hex');
const host='127.0.0.1:3030',origin='http://'+host;
const server=http.createServer((req,res)=>{
  if(req.headers.host!==host||(req.headers.origin&&req.headers.origin!==origin)){res.writeHead(403);return res.end();}
  const url=new URL(req.url,origin);
  res.setHeader('Cache-Control','no-store');
  if(req.method==='GET'&&url.pathname==='/'){
    res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(fs.readFileSync(path.join(root,'dashboard.html')));
  }
  res.setHeader('Content-Type','application/json');
  if(req.method==='GET'&&url.pathname==='/api/state')return res.end(JSON.stringify(bot.view()));
  if(req.method==='GET'&&url.pathname==='/api/diag')return res.end(JSON.stringify(bot.view().diag));
  if(req.method==='POST'&&url.pathname==='/api/toggle'&&req.headers.origin===origin){
    bot.toggle();if(bot.state.enabled)void bot.entries();return res.end(JSON.stringify(bot.view()));
  }
  res.writeHead(404);res.end('{}');
});
let entryHour=null;
async function entryTick(){
  const h=Math.floor(Date.now()/3600000);
  if(entryHour===h||bot.busy.entries)return;
  entryHour=h;await bot.context();await bot.entries();
}
server.listen(3030,'127.0.0.1',()=>{
  console.log('R32 LOCAL PAPER PILOT '+origin);
  if(process.env.R32_OFFLINE==='1')return;
  void (async()=>{await bot.context();await bot.scan();await entryTick();})();
  setInterval(()=>void bot.scan(),60000);
  setInterval(()=>void bot.context(),300000);
  setInterval(()=>void bot.exits(),60000);
  setInterval(()=>void entryTick(),15000);
});
