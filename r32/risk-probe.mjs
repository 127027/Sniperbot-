// Read-only manual probe of the actual R32 risk module. No orders or secrets in output.
import {inspectMint} from './risk.mjs';
const address=process.argv[2];
if(!address){console.error('Usage: node r32/risk-probe.mjs <mint>');process.exitCode=1;}
else {
 const result=await inspectMint(address);
 console.log(JSON.stringify(result,null,2));
 process.exitCode=result.risk==='UNKNOWN'?2:0;
}
