import {createAccount,accountView,applyBroadcast,updateAccountControls,fundAccount} from './device-account.mjs';
import {mobileFeed} from './mobile-feed.mjs';
export function mobileRuntime({storage,feed=mobileFeed(),now=()=>new Date().toISOString()}){
 const raw=storage.read();let account;
 if(raw===''){account=createAccount({now:now()});if(!storage.write(JSON.stringify(account)))throw Error('LOCAL_SAVE_FAILED')}
 else {account=JSON.parse(raw);if(account.schema!=='r31.device.account.v1')throw Error('INVALID_LOCAL_ACCOUNT');accountView(account)}
 let status={state:'NOT_CHECKED',checked_at_utc:null},polling=false,foreground=true;
 function commit(a){if(!storage.write(JSON.stringify(a)))throw Error('LOCAL_SAVE_FAILED');account=a}
 function view(){return {...accountView(account),feed:status,real_money_enabled:false}}
 async function poll(){if(polling||!foreground)return view();polling=true;try{const latest=await feed.latest();if(!foreground)return view();const t=now();if(!latest){status={state:'NOT_PUBLISHING',checked_at_utc:t};return view()}const r=applyBroadcast(account,{...latest,now:t});if(r.account!==account)commit(r.account);status={state:r.status,checked_at_utc:t,sequence:latest.signal.sequence,target_utc:latest.signal.target_utc,expires_at_utc:latest.signal.expires_at_utc}}catch(e){status={state:'FEED_ERROR',checked_at_utc:now(),error:e.message}}finally{polling=false}return view()}
 return {view,poll,controls(input){commit(updateAccountControls(account,input,now()));return view()},fund(input){commit(fundAccount(account,input,now()));return view()},pause(){foreground=false},resume(){foreground=true;return poll()}};
}