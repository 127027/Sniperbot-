import {existsSync,mkdirSync,readFileSync,writeFileSync,renameSync,copyFileSync,openSync,closeSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {freshState} from './core.mjs';
import {ROLES,emptyResearch} from './research.mjs';
export function storage(root){
 const legacy=path.join(root,'.local','paper-state-v03.json');
 const dir=path.resolve(process.env.SNIPER_DATA_DIR||(process.platform==='win32'&&process.env.LOCALAPPDATA?path.join(process.env.LOCALAPPDATA,'MemeSniperPaper'):path.join(root,'.local')));
 mkdirSync(dir,{recursive:true});
 const file=path.join(dir,'paper-state-v03.json'),lock=path.join(dir,'runner.lock');
 if(existsSync(lock)){
  const pid=Number(readFileSync(lock,'utf8'));if(!Number.isInteger(pid)||pid<=0)throw Error('Ungültige Runner-Sperre; Daten unverändert');
  let alive=true;try{process.kill(pid,0)}catch(e){if(e.code==='ESRCH')alive=false;else throw e}
  if(alive)throw Error('Dieser Datenordner wird bereits von einem Runner verwendet');
  unlinkSync(lock);
 }
 const fd=openSync(lock,'wx');writeFileSync(fd,String(process.pid));closeSync(fd);
 process.on('exit',()=>{try{unlinkSync(lock)}catch{}});
 function validate(s){
  if(s.version!==3||!Array.isArray(s.positions)||!Array.isArray(s.candidates)||!Array.isArray(s.history)||![s.cashEur,s.cashUsdc,s.closedPnl,s.minTrade,s.maxTrade,s.takeProfit,s.stopLoss].every(Number.isFinite)||s.cashEur<0||s.cashUsdc<0)throw Error('Ungültiger gespeicherter Paper-Stand; kein Reset');
  if(s.positions.some(p=>![p.qty,p.priceUsd,p.entryPriceUsd,p.amountUsdc].every(v=>Number.isFinite(v)&&v>0)))throw Error('Ungültige gespeicherte Position');
  if(s.research&&(!Array.isArray(s.research.events)||!Array.isArray(s.research.candidates)||!Array.isArray(s.research.decisions)))throw Error('Ungültiger Research-Speicher');
  if(s.paperDecisions&&(!Array.isArray(s.paperDecisions.receipts)||!s.paperDecisions.revisions||typeof s.paperDecisions.revisions!=='object'||Array.isArray(s.paperDecisions.revisions)))throw Error('Ungültiger Entscheidungsspeicher');
  return s;
 }
 if(!process.env.SNIPER_DATA_DIR&&file!==legacy&&!existsSync(file)&&existsSync(legacy)){
  validate(JSON.parse(readFileSync(legacy,'utf8')));copyFileSync(legacy,file);copyFileSync(legacy,path.join(dir,'migration-backup-v03.json'));
 }
 let state=existsSync(file)?validate(JSON.parse(readFileSync(file,'utf8'))):freshState();
 state={...freshState(),...state,research:state.research||emptyResearch()};
 // Retired portfolio caps must not silently survive migration.
 for(const key of ['maxPositions','maxExposure','perPositionCap'])delete state[key];
 const credentialsFile=path.join(dir,'gateway-credentials.json');
 let credentials;
 if(existsSync(credentialsFile))credentials=JSON.parse(readFileSync(credentialsFile,'utf8'));
 else{
  credentials=[...ROLES,'risk_controller'].map(role=>({id:`local-${role}`,role,token:randomBytes(32).toString('hex')}));
  writeFileSync(credentialsFile,JSON.stringify(credentials,null,2),{flag:'wx',mode:0o600});
 }
 if(!Array.isArray(credentials)||credentials.some(c=>!c.id||![...ROLES,'risk_controller'].includes(c.role)||!/^[-\w]{32,200}$/.test(c.token))||new Set(credentials.map(c=>c.id)).size!==credentials.length||new Set(credentials.map(c=>c.token)).size!==credentials.length)throw Error('Ungültige Agenten-Registry');
 return {state,credentials,dir,save(next){
  validate(next);
  const temp=file+'.tmp';writeFileSync(temp,JSON.stringify(next,null,2),{mode:0o600});
  if(existsSync(file))copyFileSync(file,file+'.bak');
  renameSync(temp,file);
 }};
}
