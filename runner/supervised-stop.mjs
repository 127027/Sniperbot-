// Optional, parent-only local shutdown pipe; not an HTTP endpoint or trading command.
// Disabled for every ordinary/manual runner invocation.
export function attachSupervisedStop(shutdown,{env=process.env,stream=process.stdin}={}){
  if(env.SNIPER_SUPERVISED!=='1')return ()=>{};
  if(typeof shutdown!=='function')throw Error('Shutdown callback required');
  let buffer='',requested=false;
  stream.setEncoding?.('utf8');
  const receive=chunk=>{
    if(requested)return;
    buffer=(buffer+String(chunk)).slice(-256);
    if(buffer.includes('SNIPER_STOP_V1\n')){
      requested=true;
      try{shutdown()}catch(e){console.error('Shutdown error:',e?.message||'UNKNOWN')}
    }
  };
  stream.on('data',receive);
  stream.resume?.();
  return ()=>stream.off('data',receive);
}
