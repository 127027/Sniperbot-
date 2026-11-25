import {mobileRuntime} from './mobile-runtime.mjs';
try{
 const runtime=mobileRuntime({storage:window.R31Local});
 window.r31Process=raw=>{try{return JSON.stringify(runtime.accept(JSON.parse(raw)).feed)}catch(e){return JSON.stringify({state:'FEED_ERROR',error:e.message})}};
 window.R31Worker.ready();
}catch(e){window.R31Worker.failed(String(e.message));}
