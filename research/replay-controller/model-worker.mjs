// One fresh worker and one stateless Responses request per attempt. No tools,
// conversation IDs, filesystem access or inherited environment in the model input.
import {parentPort, workerData} from 'node:worker_threads';
const {key, body, timeoutMs}=workerData;
try {
 const response=await fetch('https://api.openai.com/v1/responses',{
  method:'POST',redirect:'error',signal:AbortSignal.timeout(timeoutMs),
  headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
  body:JSON.stringify(body)
 });
 if(!response.ok){parentPort.postMessage({error:'HTTP_'+response.status,status:response.status});}
 else {
  const reader=response.body.getReader();let size=0;const chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;
   size+=value.length;if(size>1_000_000){await reader.cancel();throw Error('RESPONSE_TOO_LARGE');}
   chunks.push(Buffer.from(value));
  }
  parentPort.postMessage({response:JSON.parse(Buffer.concat(chunks).toString('utf8'))});
 }
} catch {parentPort.postMessage({error:'TRANSPORT_OR_RESPONSE_FAILURE'});}
