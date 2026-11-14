// Smoke-test child: never touches paper state, network or GitHub.
import {attachSupervisedStop} from './supervised-stop.mjs';
if(!process.argv.includes('--ignore-stop')){
  attachSupervisedStop(()=>process.exit(0));
}
setInterval(()=>{},1000);
