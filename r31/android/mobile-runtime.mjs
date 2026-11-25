import {createAccount,accountView,applyBroadcast,updateAccountControls,fundAccount} from './device-account.mjs';
import {mobileFeed} from './mobile-feed.mjs';
export function mobileRuntime({storage,feed=mobileFeed(),now=()=>new Date().toISOString()}){
 let raw=storage.read(),account;
 function write(expected,next){return typeof storage.compareAndSwap==='function'?storage.compareAndSwap(expected,next):storage.write(next)}
 function decode(s){const a=JSON.parse(s);if(a.schema!=='r31.device.account.v1')throw Error('INVALID_LOCAL_ACCOUNT');accountView(a);return a}
 if(raw===''){const fresh=createAccount({now:now()}),serialized=JSON.stringify(fresh);if(write(raw,serialized)){raw=serialized;account=fresh}else{raw=storage.read();if(raw==='')throw Error('LOCAL_SAVE_FAILED');account=decode(raw)}}else account=decode(raw);
 let status={state:'NOT_CHECKED',checked_at_utc:null},polling=false,foreground=true;
 function refresh(){const s=storage.read();if(s!==raw){account=decode(s);raw=s}}
 function commit(a){const next=JSON.stringify(a);if(!write(raw,next))throw Error('LOCAL_SAVE_FAILED_OR_CONFLICT');raw=next;account=a}
 function view(){refresh();return {...accountView(account),feed:status,real_money_enabled:false}}
 function accept(latest){const t=now();try{refresh();if(!latest){status={state:'NOT_PUBLISHING',checked_at_utc:t};return view()}const r=applyBroadcast(account,{...latest,now:t});if(r.account!==account)commit(r.account);status={state:r.status,checked_at_utc:t,sequence:latest.signal.sequence,target_utc:latest.signal.target_utc,expires_at_utc:latest.signal.expires_at_utc}}catch(e){status={state:'FEED_ERROR',checked_at_utc:t,error:e.message}}return view()}
 async function poll(){if(polling||!foreground)return view();polling=true;try{const latest=await feed.latest();if(!foreground)return view();return accept(latest)}catch(e){status={state:'FEED_ERROR',checked_at_utc:now(),error:e.message};return view()}finally{polling=false}}
 return {view,poll,accept,controls(input){refresh();commit(updateAccountControls(account,input,now()));return view()},fund(input){refresh();commit(fundAccount(account,input,now()));return view()},pause(){foreground=false},resume(){foreground=true;return poll()}};
}