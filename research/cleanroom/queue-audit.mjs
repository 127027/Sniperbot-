import fs from 'node:fs';
import path from 'node:path';
function audit(manifest, reports, now=Date.now()){
 const str=x=>typeof x==="string"&&x.trim().length>0;
 const date=x=>typeof x==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x)?Date.parse(x):NaN;
 const same=(chain,a,b)=>typeof a==="string"&&typeof b==="string"&&(chain==="solana"?a===b:a.toLowerCase()===b.toLowerCase());
 const validUrl=x=>typeof x==="string"&&/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(x);
 if(manifest.schema!=="cleanroom.research-queue.v1"||manifest.mode!=="RESEARCH_ONLY"||!str(manifest.queue_id)||!Array.isArray(manifest.tasks)||!manifest.tasks.length)throw Error("invalid manifest");
 const seen=new Set(),files=new Set();
 const rows=manifest.tasks.map(t=>{
  if(!str(t.id)||!str(t.chain)||!str(t.contract)||!str(t.result_file)||!/^[a-z0-9-]+\.json$/.test(t.result_file))throw Error("invalid task");
  const k=t.chain+":"+(t.chain==="solana"?t.contract:t.contract.toLowerCase());if(seen.has(k)||files.has(t.result_file))throw Error("duplicate task");seen.add(k);files.add(t.result_file);
  const r=reports[t.result_file];const row={id:t.id,coin:t.coin,chain:t.chain,contract:t.contract,result_file:t.result_file};
  if(r===undefined)return {...row,status:"PENDING"};
  if(!r||typeof r!=="object"||r.parse_error)return {...row,status:"INVALID",errors:[r?.parse_error||"invalid JSON"]};
  const e=[];const at=date(r.assessed_at_utc);
  if(r.schema!=="cleanroom.research-result.v1"||r.queue_id!==manifest.queue_id||r.mode!=="RESEARCH_ONLY"||r.non_executable!==true)e.push("schema/queue/mode");
  if(r.id!==t.id||r.chain!==t.chain||!same(t.chain,r.contract,t.contract))e.push("identity");
  if(!Number.isFinite(at)||at>now+60000)e.push("assessment time");
  if(!["PAPER_BUY","REJECT","DATA_GAP"].includes(r.decision))e.push("decision");
  if(!str(r.reason)||!str(r.diagnosis)||!Array.isArray(r.sources)||!r.sources.length||!r.sources.every(validUrl))e.push("reason/diagnosis/sources");
  if(!Array.isArray(r.attempts)||!r.attempts.length||!r.attempts.every(a=>validUrl(a.url)&&str(a.result)))e.push("actual attempts");
  if(r.decision==="DATA_GAP"&&(!Array.isArray(r.gaps)||!r.gaps.length||!r.gaps.every(str)))e.push("document gaps");
  if(r.decision==="PAPER_BUY"){
   const qt=date(r.quote?.observed_at_utc);if(!(Number.isFinite(r.quote?.price_eur)&&r.quote.price_eur>0&&Number.isFinite(qt)&&at>=qt&&at-qt<=900000&&validUrl(r.quote.source_url)))e.push("fresh quote");
   if(!(Number.isFinite(r.pool?.liquidity_usd)&&r.pool.liquidity_usd>0&&str(r.pool.address)&&validUrl(r.pool.source_url)&&Number.isFinite(r.pool.buys_1h)&&Number.isFinite(r.pool.sells_1h)&&r.pool.buys_1h>=0&&r.pool.sells_1h>=0&&r.pool.buys_1h+r.pool.sells_1h>0))e.push("pool evidence");
   if(!(r.risk?.status==="PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT"&&r.risk.fields&&Object.keys(r.risk.fields).length&&validUrl(r.risk.source_url)&&Array.isArray(r.risk.flags)&&!r.risk.flags.some(f=>/honeypot|cannot_sell_all|high_sell_tax|blacklisted|freeze authority/i.test(String(f)))))e.push("risk evidence");
   if(!str(r.thesis_60m)||r.hypothetical_budget_eur!==50)e.push("thesis/budget");
  }
  const current=r.decision==="PAPER_BUY"&&Number.isFinite(date(r.quote?.observed_at_utc))&&now-date(r.quote.observed_at_utc)<=900000&&now>=date(r.quote.observed_at_utc);
  return {...row,status:e.length?"INVALID":r.decision,errors:e,historical_buy:e.length===0&&r.decision==="PAPER_BUY",current_quote_buy:e.length===0&&current};
 });
 const count=s=>rows.filter(x=>x.status===s).length;
 return {schema:"cleanroom.queue-audit.v1",queue_id:manifest.queue_id,mode:"RESEARCH_ONLY",total:rows.length,recorded:count("PAPER_BUY")+count("REJECT")+count("DATA_GAP"),paper_buy:count("PAPER_BUY"),reject:count("REJECT"),data_gap:count("DATA_GAP"),pending:count("PENDING"),invalid:count("INVALID"),buy_quote_still_fresh:rows.filter(x=>x.current_quote_buy).length,next:rows.find(x=>["PENDING","INVALID"].includes(x.status))?.id??null,rows,notice:"Structural audit only; not a safety audit, recommendation or executable signal. Recorded DATA_GAP is not a full risk review. Historical BUYs are not current orders."};
}
function selfTest(){
 const m={schema:"cleanroom.research-queue.v1",queue_id:"q",mode:"RESEARCH_ONLY",tasks:[{id:"a",chain:"solana",contract:"abc",result_file:"a.json"},{id:"b",chain:"bsc",contract:"0xab",result_file:"b.json"}]};
 const now=Date.parse("2026-11-26T17:00:00Z");
 const r={schema:"cleanroom.research-result.v1",queue_id:"q",mode:"RESEARCH_ONLY",non_executable:true,id:"a",chain:"solana",contract:"abc",assessed_at_utc:"2026-11-26T16:59:00Z",decision:"DATA_GAP",reason:"missing risk",diagnosis:"blocked lookup",sources:["https://example.com"],attempts:[{url:"https://example.com",result:"unavailable"}],gaps:["risk"]};
 const check=(v,msg)=>{if(!v)throw Error(msg)};
 check(audit(m,{},now).pending===2,"empty");
 check(audit(m,{"a.json":r},now).data_gap===1,"gap");
 check(audit(m,{"a.json":{...r,contract:"ABC"}},now).invalid===1,"identity");
 check(audit(m,{"a.json":{...r,decision:"PAPER_BUY"}},now).invalid===1,"missing buy evidence");
 const b={...r,decision:"PAPER_BUY",hypothetical_budget_eur:50,thesis_60m:"fixture",quote:{price_eur:1,observed_at_utc:"2026-11-26T16:58:00Z",source_url:"https://example.com"},pool:{address:"pool",liquidity_usd:100,buys_1h:1,sells_1h:1,source_url:"https://example.com"},risk:{status:"PROVIDER_FIELDS_AVAILABLE_NOT_AUDIT",fields:{is_honeypot:"0"},flags:[],source_url:"https://example.com"}};
 check(audit(m,{"a.json":b},now).paper_buy===1,"buy");
 check(audit(m,{"a.json":b},now+3600000).buy_quote_still_fresh===0,"historical");
 check(audit(m,{"a.json":{...b,quote:{...b.quote,observed_at_utc:"2026-11-26T15:00:00Z"}}},now).invalid===1,"stale");
 check(audit(m,{"a.json":{...b,risk:{...b.risk,flags:["HONEYPOT"]}}},now).invalid===1,"risk");
 return "8 fixture assertions passed";
}
if(process.argv.includes('--self-test')){console.log(selfTest());}else{const dir=process.argv[2];if(!dir)throw Error('queue directory required');const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));const reports=Object.create(null);for(const t of m.tasks){if(!/^[a-z0-9-]+\.json$/.test(t.result_file))throw Error('invalid path');try{reports[t.result_file]=JSON.parse(fs.readFileSync(path.join(dir,t.result_file),'utf8'));}catch(e){if(e.code!=='ENOENT')reports[t.result_file]={parse_error:String(e)};}}const out=audit(m,reports);console.log(JSON.stringify(out,null,2));if(out.invalid)process.exitCode=2;}
