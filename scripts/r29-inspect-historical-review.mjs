// Read-only research entry point, separate from formal QA-04 and no trading.
import {readFile} from 'node:fs/promises';
import {inspectHistoricalResearchReadiness} from '../src/r29-historical-research-readiness.mjs';
const [file,expectedSha256,asOfUtc]=process.argv.slice(2);
if(!file||!expectedSha256||!asOfUtc||process.argv.length!==5)throw Error('usage: node scripts/r29-inspect-historical-review.mjs <archive> <trusted-sha256> <virtual-utc>');
const result=inspectHistoricalResearchReadiness({archiveBytes:await readFile(file),expectedSha256,asOfUtc});
console.log(JSON.stringify(result,null,2));
if(result.status==='BLOCKED')process.exitCode=3;
