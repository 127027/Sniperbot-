// R29 release invariant: users only ever double-click Sniperbot_Starten.bat.
// Internal PowerShell and Node tools remain required, but no second BAT/CMD.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('exactly ONE Windows user start file in project root',()=>{
 const bat=readdirSync(root).filter(n=>/\.(bat|cmd)$/i.test(n));
 assert.deepEqual(bat,['Sniperbot_Starten.bat']);
 const entry=readFileSync(path.join(root,bat[0]),'utf8');
 assert.match(entry,/windows-supervisor\.ps1/i);
 assert.match(entry,/-WithR29/);
 assert.match(entry,/%\*/,'single launcher may forward safe -SelfTest / -NoBrowser / -ResetToken');
 assert.doesNotMatch(entry,/-AllowR29MainPaperDemo\b/,'default launcher MUST NOT restart expired one-shot test trading');
 assert.doesNotMatch(entry,/SNIPER_OPENAI_API_KEY|main-paper-intent\.json/,'no paid API key or embedded GitHub orders');
});

test('default GUI shows one account, archive-only old R29 synthetic ledger',()=>{
 const html=readFileSync(path.join(root,'runner/dashboard.html'),'utf8');
 const courier=readFileSync(path.join(root,'runner/r29-windows-courier.mjs'),'utf8');
 const startup=readFileSync(path.join(root,'runner/windows-supervisor.ps1'),'utf8');
 assert.doesNotMatch(html,/R29-Sandbox \(TEST-USDC\)|5028[.,]408|Fünf-Agenten-Kommunikation/);
 assert.match(startup,/SNIPER_R29_GITHUB_TOKEN/);
 assert.match(startup,/research-github-token\.dpapi/);
 assert.match(courier,/SNIPER_R29_LEGACY_QA/);
 assert.match(courier,/SNIPER_R29_MAIN_PAPER_DEMO/);
 assert.match(html,/sniper_user_paper_dashboard\.v1/);
});
