// No network, replay, order, wallet or client accesses. Only reads five
// version-controlled read-only input/source documents from this checkout.
import {readFile} from 'node:fs/promises';
import {inspectV21OctoberEvidenceInventory,V21_OCTOBER_ARCHIVE_PATHS}
 from '../src/v21-october-evidence-inventory.mjs';
if(process.argv.length!==2)throw Error('R29_V21_NO_ARGS_AND_NO_LIVE_IO');
const raws={};
for(const path of Object.values(V21_OCTOBER_ARCHIVE_PATHS)){
 raws[path]=await readFile(path,'utf8');
}
const result=inspectV21OctoberEvidenceInventory(raws);
console.log('R29_V21_OCTOBER_EVIDENCE',JSON.stringify(result));
if(result.integrity_issues.length>0||result.original_document_integrity!=='INTERNAL_GIT_BLOBS_MATCH')
 process.exitCode=3; // fail-closed without writing anything
