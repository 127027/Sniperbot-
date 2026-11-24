// Immutable request bytes, latest state. The workflow serializes captures.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
export function loadPinnedCaptureRequest({requestCommit,cwd=process.cwd()}={}){
 if(!/^[a-f0-9]{40}$/.test(requestCommit||''))throw Error('MISSING_COMMIT_SHA');
 const git=(args)=>execFileSync('git',args,{cwd,encoding:'utf8'});
 git(['merge-base','--is-ancestor',requestCommit,'HEAD']);
 const changed=git(['diff-tree','--no-commit-id','--name-only','-r',requestCommit]).trim().split(/\r?\n/).filter(x=>/^research\/requests\/20\d{2}-\d{2}-\d{2}\/[A-Za-z0-9_-]+\.json$/.test(x));
 if(changed.length!==1)throw Error('EXPECTED_ONE_REQUEST_FILE');
 const path=changed[0],pinned=git(['show',requestCommit+':'+path]);
 // Do not execute a changed/deleted request from a later branch commit.
 if(readFileSync(cwd+'/'+path,'utf8')!==pinned)throw Error('CAPTURE_REQUEST_CHANGED_SINCE_TRIGGER');
 return {path,request:JSON.parse(pinned),request_commit:requestCommit,state_commit:git(['rev-parse','HEAD']).trim()};
}
