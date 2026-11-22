// Execute ONLY on the Windows machine with explicit operator access.
// NEVER calls runner.load(), starts GitHub transport, writes state, signs,
// resets the account, or sends provider/API requests. By default only prints
// a privacy-minimized summary to local stdout; nothing uploads to GitHub.
import {readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {inspectReadOnlyLocalPaperSnapshot}
 from '../src/v19-local-client-readonly-proof.mjs';
const args=process.argv.slice(2);
if(args.length>2||args.some(x=>x==='--help')){
 console.log('Usage: node scripts/v19-readonly-windows-paper-proof.mjs [--state <absolute-or-relative-state.json>]');
 process.exit(0);
}
if(args.length>0&&(args.length!==2||args[0]!=='--state'))
 throw Error('ONLY_OPTIONAL_STATE_FILE_FLAG_ACCEPTED');
const path=args.length?resolve(args[1]):
 join(process.env.R29_STATE_DIR||join(homedir(),'.r29-cleanpaper'),'state.json');
const raw=await readFile(path,'utf8'); // ENOENT: STOP. Never initialize an account.
const report=inspectReadOnlyLocalPaperSnapshot({
 rawStateJson:raw,asOfUtc:new Date().toISOString()
});
console.log('R29_LOCAL_WINDOWS_PAPER_READONLY_PROOF',JSON.stringify(report));
if(report.blockers.length)process.exitCode=2;
