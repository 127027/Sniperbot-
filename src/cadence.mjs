export const LEVELS=Object.freeze([4,8,12,24]);
export function researchDue(nowIso,lastCompletedIso,targetPer24h){
  if(!LEVELS.includes(targetPer24h))throw Error('INVALID_DOT_CADENCE');
  const now=Date.parse(nowIso);if(!Number.isFinite(now))throw Error('INVALID_NOW');
  if(!lastCompletedIso)return {due:true,periodMinutes:1440/targetPer24h,nextDue:nowIso};
  const last=Date.parse(lastCompletedIso);
  if(!Number.isFinite(last)||last>now+10000)throw Error('INVALID_LAST_REVIEW');
  const dueTime=last+86400000/targetPer24h;
  return {due:now>=dueTime,periodMinutes:1440/targetPer24h,nextDue:new Date(dueTime).toISOString()};
}
export function chooseCadence(m,previous=4){
  if(!LEVELS.includes(previous))throw Error('INVALID_PREVIOUS_CADENCE');
  if(!m||m.dataAvailable!==true)return {target:previous,reason:'DATA_GAP_HOLD_LAST_LEVEL'};
  const {newPools=0,eligible=0,volumeChangePct=0,openPositions=0}=m;
  if([newPools,eligible,openPositions].some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0) ||
    typeof volumeChangePct!=='number'||!Number.isFinite(volumeChangePct)||volumeChangePct < -100)
    throw Error('INVALID_METRICS');
  const target=eligible>=10||newPools>=80||volumeChangePct>=100?24:eligible>=5||newPools>=35||openPositions>=10?12:eligible>=2||newPools>=12||openPositions>=3?8:4;
  if(target<previous&&(m.consecutiveQuietChecks??0)<2)return {target:previous,reason:'DOWNSHIFT_NEEDS_CONFIRMATION'};
  return {target,reason:'OBSERVED_MARKET_METRICS'};
}
