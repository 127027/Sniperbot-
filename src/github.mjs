// GitHub is the only remote transport; no market, wallet or OpenAI API calls.
import { gitBlobSha, Reject } from './core.mjs';
export const REPO='127027/Sniperbot-';
export const BRANCH='codex/r29-cleanroom-paper-20261121';
const ROOT=`https://api.github.com/repos/${REPO}/contents/`;
const encPath=path=>path.split('/').map(encodeURIComponent).join('/');
export class GitHubTransport {
  constructor(token,clientId='paper-local-0001'){
    if(!token)throw Error('GITHUB_TOKEN required for receipt publishing/authenticated polling');
    if(!/^[a-zA-Z0-9_-]{8,80}$/.test(clientId))throw Error('INVALID_CLIENT_ID');
    this.token=token;this.clientId=clientId;
  }
  async request(path,{method='GET',body}={}) {
    const url=`${ROOT}${encPath(path)}${method==='GET'?`?ref=${encodeURIComponent(BRANCH)}`:''}`;
    const r=await fetch(url,{method,signal:AbortSignal.timeout(15000),
      headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${this.token}`,
        'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},
      body:body?JSON.stringify(body):undefined});
    if (!r.ok) throw Error(`GitHub HTTP ${r.status} for ${path}; no order executed on failed fetch`);
    return r.json();
  }
  async read(path,expectedSha) {
    const d=await this.request(path);
    if (d.type!=='file'||d.encoding!=='base64') throw Error(`Unexpected content: ${path}`);
    const raw=Buffer.from(d.content.replace(/\s/g,''),'base64').toString('utf8');
    const actual=gitBlobSha(raw);
    if (d.sha!==actual) throw new Reject('BLOB_SHA_MISMATCH',`GitHub SHA mismatch: ${path}`);
    if (expectedSha&&expectedSha!==actual) throw new Reject('POINTER_SHA_MISMATCH',`Index SHA mismatch: ${path}`);
    return {data:JSON.parse(raw),sha:actual};
  }
  async publishReceipt(id,receipt){
    if(!/^[a-zA-Z0-9_-]{8,80}$/.test(id))throw Error('INVALID_RECEIPT_ID');
    const path=`receipts/${this.clientId}/${id}.json`;
    receipt={...receipt,client_id:this.clientId};
    const content=Buffer.from(JSON.stringify(receipt,null,2)+'\n','utf8').toString('base64');
    await this.request(path,{method:'PUT',body:{message:`r29 clean-paper: record ${id} result`,
      content,branch:BRANCH}});
  }
}
