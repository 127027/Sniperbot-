import {timingSafeEqual} from 'node:crypto';
export function authenticate(header,registry){
 const raw=String(header||'').replace(/^Bearer /,'');
 if(!/^[-\w]{32,200}$/.test(raw))return null;
 return registry.find(p=>{const a=Buffer.from(raw),b=Buffer.from(p.token);return a.length===b.length&&timingSafeEqual(a,b)})||null;
}
export function limiter(){
 const buckets=new Map();
 return id=>{const now=Date.now(),old=buckets.get(id);const b=old&&now-old.start<60000?old:{start:now,count:0};buckets.set(id,b);return ++b.count<=120};
}
export async function body(req){
 if(!req.headers['content-type']?.startsWith('application/json'))throw Object.assign(Error('JSON erforderlich'),{status:415});
 let raw='',size=0;for await(const chunk of req){size+=chunk.length;if(size>16384)throw Object.assign(Error('Anfrage zu groß'),{status:413});raw+=chunk}
 try{return JSON.parse(raw)}catch{throw Object.assign(Error('Ungültiges JSON'),{status:400})}
}
