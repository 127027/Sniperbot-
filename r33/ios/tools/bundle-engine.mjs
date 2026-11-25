import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');
const modules=['policy.mjs','paper-engine.mjs','broadcast.mjs','device-account.mjs','performance.mjs'];
let out="const modules={}; const structuredClone=x=>JSON.parse(JSON.stringify(x)); const randomUUID=()=>nativeUUID(); const URL=function(s){const p=nativeURL(String(s));if(!p)throw Error('INVALID_URL');Object.assign(this,JSON.parse(p));};\n";
for(const name of modules){
 let src=await readFile(resolve(root,'r31',name),'utf8');
 src=src.replace(/import \{randomUUID\} from 'node:crypto';/g,'').replace(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/([^'"]+)['"];?/g,(_,ids,path)=>'const {'+ids+'}=modules['+JSON.stringify(path)+'];');
 const exports=[];src=src.replace(/export\s+(function|const|let|class)\s+(\w+)/g,(_,kind,id)=>{exports.push(id);return kind+' '+id});
 if(/\b(?:import|export)\s+(?:\{|\*|default|from)/.test(src))throw Error('UNSUPPORTED_MODULE '+name);
 out+='modules['+JSON.stringify(name)+']=(()=>{\n'+src+'\nreturn {'+exports.join(',')+'};})();\n';
}
out+=`const A=modules['device-account.mjs'];const P=modules['performance.mjs'];
globalThis.r33Call=(op,raw,input,now)=>{try{
 const a=raw?JSON.parse(raw):null,i=input?JSON.parse(input):null;let next=a,status=null;
 if(op!=='create'&&a?.schema!=='r31.device.account.v1')throw Error('INVALID_LOCAL_ACCOUNT');
 switch(op){case 'create':next=A.createAccount({now});break;case 'view':break;case 'fund':next=A.fundAccount(a,i,now);break;case 'controls':next=A.updateAccountControls(a,i,now);break;case 'signal':{const r=A.applyBroadcast(a,{...i,now});next=r.account;status=r.status;break;}default:throw Error('UNKNOWN_OP')}
 const view=A.accountView(next);return JSON.stringify({account:next,view,performance:P.performance(view),status});
}catch(e){return JSON.stringify({error:String(e.message||e)})}};\n`;
const dest=resolve(root,'r33/ios/App/Resources/engine.js');await mkdir(dirname(dest),{recursive:true});await writeFile(dest,out);
