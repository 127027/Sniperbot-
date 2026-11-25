import {fork} from 'node:child_process';
import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,resolve,dirname} from 'node:path';
import {homedir} from 'node:os';
import {verifyStage,recoverOwnedLock} from './updater.mjs';
const account=resolve(process.env.R31_ACCOUNT_DIR||join(homedir(),'.r31-paper-device')),root=join(account,'updates'),pointer=join(root,'active.json');
const original={root:resolve(dirname(fileURLToPath(import.meta.url)),'..'),version:40};
await mkdir(root,{recursive:true,mode:0o700});
let current=original,child=null,pending=null,stopping=false;
try{const saved=JSON.parse(await readFile(pointer,'utf8'));if(typeof saved.root!=='string'||dirname(resolve(saved.root))!==root||!Number.isSafeInteger(saved.version)||saved.version<original.version)throw Error('INVALID_POINTER');await verifyStage(saved.root,saved.version);current=saved}catch(e){if(e.code!=='ENOENT')console.error('Update pointer ignored:',e.message)}
async function persist(v){const tmp=pointer+'.tmp';await writeFile(tmp,JSON.stringify(v),{mode:0o600});await rename(tmp,pointer)}
function start(v,rollback=null){let ready=false,failed=false;child=fork(join(v.root,'r31/device-server.mjs'),[],{env:{...process.env,R31_ACCOUNT_DIR:account,R31_MANAGED:'1',R31_UPDATE_TRIAL:rollback?'1':'0'},stdio:['inherit','inherit','inherit','ipc']});const proc=child;
 const timer=setTimeout(()=>{if(!ready){failed=true;proc.kill()}},30000);
 proc.on('message',async m=>{if(m?.type==='ready'&&!ready&&!failed){clearTimeout(timer);try{if(rollback)await persist(v);ready=true;current=v;proc.send({type:'activate'});}catch(e){failed=true;proc.kill()}}else if(m?.type==='restart'&&ready&&!pending&&!stopping){try{if(dirname(resolve(m.root))!==root||m.version<=v.version)throw Error('INVALID_UPDATE_TARGET');await verifyStage(m.root,m.version);pending={root:m.root,version:m.version};proc.send({type:'shutdown-for-update'});}catch(e){proc.send({type:'update-rejected',error:e.message})}}});
 proc.on('exit',async(code)=>{clearTimeout(timer);if(stopping)return;if(pending){const next=pending;pending=null;if(code===42)start(next,v);else{console.error('Update shutdown failed; keeping old version');start(v)}}else if(rollback&&!ready){console.error('Update startup failed; restoring previous program, never old account data');try{await recoverOwnedLock(account,proc.pid);start(rollback)}catch(e){console.error('Rollback blocked:',e.message);process.exitCode=1}}else{console.error('Bot stopped:',code);process.exitCode=code||1}});
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;child?.kill(signal)});
start(current);
