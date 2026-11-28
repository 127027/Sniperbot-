// Local append-only evidence journal. No uploads, no network, no secrets.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {applyBuy,monitor,decide} from './decision.mjs';
import {fresh,identity} from './paper.mjs';
const VERSION=1;
const safeTime=t=>Number.isSafeInteger(t)&&t>=0;
export class Recorder{
 constructor(dir,{clock=Date.now,session=randomUUID()}={}){
  this.dir=path.join(dir,'records');this.clock=clock;this.session=session;this.seq=0;
  fs.mkdirSync(this.dir,{recursive:true});
 }
 append(kind,data){
  const at=data?.decision_at??this.clock();if(!safeTime(at))throw Error('INVALID_RECORD_TIME');
  const row={version:VERSION,mode:'PAPER_ONLY',session:this.session,seq:++this.seq,at,kind,data};
  const file=path.join(this.dir,new Date(at).toISOString().slice(0,10)+'.jsonl');
  fs.appendFileSync(file,JSON.stringify(row)+'\n','utf8');return row;
 }
}
export function readRecords(dir){
 const rows=[];
 for(const name of fs.readdirSync(dir).filter(n=>/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(n)).sort()){
  for(const [i,line] of fs.readFileSync(path.join(dir,name),'utf8').split('\n').entries()){
   if(!line.trim())continue;
   try{rows.push(JSON.parse(line));}catch{throw Error('INVALID_RECORD '+name+':'+(i+1));}
  }
 }
 return rows;
}
// Decision replay, NOT counterfactual strategy search. Uses recorded quotes only.
// Start state is an explicit snapshot; gaps/other sessions must be disclosed.
export function replay(rows,{start,end,initial}){
 if(!safeTime(start)||!safeTime(end)||end<=start||!initial||initial.version!==1)throw Error('INVALID_REPLAY_WINDOW');
 const s0=structuredClone(initial);let s=s0,last=start,previous=null;
 const counts={buy:0,sell:0,scan:0,entry_attempts:0,exit_attempts:0,toggles:0};
 const failures=[],sessions=new Set();
 for(const r of rows){
  if(r?.version!==VERSION||r.mode!=='PAPER_ONLY'||!safeTime(r.at))throw Error('INVALID_RECORD_SCHEMA');
  if(r.at<start||r.at>=end)continue;
  if(r.at<last)throw Error('OUT_OF_ORDER_RECORD');
  if(previous&&previous.session===r.session&&r.seq!==previous.seq+1)throw Error('RECORD_SEQUENCE_GAP');
  last=r.at;previous=r;sessions.add(r.session);
  const d=r.data??{};
  if(r.kind==='scan'){counts.scan++;continue;}
  if(r.kind==='toggle'){s={...s,enabled:d.enabled===true};counts.toggles++;continue;}
  if(r.kind==='entry'){
   counts.entry_attempts++;
   const {buys}=decide([d.candidate],r.at);
   if(!buys.length){failures.push({at:r.at,reason:'RECORDED_ENTRY_NOT_QUALIFIED'});continue;}
   const id=identity(buys[0]),hour=Math.floor(r.at/3600000);
   if(s.history.some(h=>h.id===id&&h.action==='BUY'&&Math.floor(Date.parse(h.at)/3600000)===hour))continue;
   const result=applyBuy(s,buys[0],d.candidate,r.at);s=result.state;if(result.reason==='BOUGHT')counts.buy++;
  }else if(r.kind==='exit'){
   counts.exit_attempts++;const result=monitor(s,d.id,d.evidence,r.at);s=result.state;
   if(['STOP_LOSS','TRAILING','LIQUIDITY_DROP','CENTRAL_SELL'].includes(result.reason))counts.sell++;
  }
 }
 return {mode:'PAPER_ONLY',kind:'RECORDED_DECISION_REPLAY',start,end,counts,sessions:sessions.size,
  covered_until:last,failures,state:s,limitations:'Not a full counterfactual backtest; missing quotes and market coverage cannot be reconstructed. Initial portfolio and journal continuity require validation.'};
}
