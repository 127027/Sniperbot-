// Read-only UI projection of locally persisted, non-actionable research receipts.
// It does not fetch research, create signals, or enter the trading pipeline.
export const DOT_ROLES = Object.freeze([
  {id:'news_discovery',label:'Meme Scout',producer:'Meme Scout – Forschungsradar'},
  {id:'social_acceleration',label:'Social Research',producer:'Sniper Social Research'},
  {id:'onchain_liquidity',label:'Onchain Research',producer:'Sniper Onchain Research'},
  {id:'contract_security',label:'Contract / Security',producer:'Meme Sniper – Techniklabor'},
  {id:'opportunity_qa',label:'Opportunity QA',producer:'Sniper Opportunity QA'}
]);
const MAX_AGE_MS=2*60*60*1000;
const validTime=(x,now)=>{const t=typeof x==='string'?Date.parse(x):NaN;return Number.isFinite(t)&&t>0&&t<=now+30000?t:null;};

export function buildDotStatus(inbox,{enabled=false,now=Date.now()}={}){
  const receipts=Array.isArray(inbox?.receipts)?inbox.receipts:[];
  const roles=DOT_ROLES.map(role=>({...role,last_received_at:null,last_published_at:null,event_id:null,stale:false}));
  const historical=receipts.filter(r=>r?.historical_probe===true&&r?.message?.schema==='research_transport_probe.v1'&&r.actionable===false&&validTime(r.received_at_utc,now)!==null)
    .sort((a,b)=>Date.parse(b.received_at_utc)-Date.parse(a.received_at_utc))[0];
  for(const role of roles){
    const matches=receipts.filter(r=>{
      const m=r?.message;
      if(!m||r.historical_probe!==false||r.actionable!==false||r.delivery!=='GITHUB_PULL')return false;
      if(m.producer!==role.producer||m.paper_only!==true||m.actionable!==false)return false;
      if(!['research_notice.v1','research_role_snapshot.v1'].includes(m.schema))return false;
      const received=validTime(r.received_at_utc,now),published=validTime(m.published_at_utc,now);
      return received!==null&&published!==null&&published<=received+30000;
    });
    matches.sort((a,b)=>Date.parse(b.received_at_utc)-Date.parse(a.received_at_utc));
    const r=matches[0];
    if(!r)continue;
    role.last_received_at=r.received_at_utc;
    role.last_published_at=r.message.published_at_utc;
    const id=r.message.schema==='research_role_snapshot.v1'?r.message.snapshot_id:r.message.event_id;
    role.event_id=typeof id==='string'?id:null;
    const expiry=typeof r.message.expires_at_utc==='string'?Date.parse(r.message.expires_at_utc):NaN;
    role.stale=now-Date.parse(r.received_at_utc)>MAX_AGE_MS||(Number.isFinite(expiry)&&expiry<=now);
  }
  const latest=roles.filter(r=>r.last_received_at)
    .sort((a,b)=>Date.parse(b.last_received_at)-Date.parse(a.last_received_at))[0]||null;
  const lastError=typeof inbox?.lastError==='string'?inbox.lastError.slice(0,200):null;
  let status='no_receipt';
  if(!enabled)status='disabled';
  else if(lastError)status='error';
  else if(latest)status=latest.stale?'stale':'received';
  else if(historical)status='historical_only';
  return {
    status,enabled:!!enabled,
    latest:latest?{role:latest.id,label:latest.label,received_at_utc:latest.last_received_at,published_at_utc:latest.last_published_at,event_id:latest.event_id,stale:latest.stale}:null,
    historical_received_at_utc:historical?.received_at_utc||null,
    last_check_at_utc:validTime(inbox?.lastCheckAt,now)!==null?inbox.lastCheckAt:null,
    last_error:lastError,
    roles
  };
}
