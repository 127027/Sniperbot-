// Executes ONE ChatGPT-authored GitHub intent in a disposable, REPO-ONLY
// synthetic PAPER ledger. Never contacts Windows, RPC, wallets, exchanges, or OpenAI.
// Uses the exact existing Ed25519 paper-agent pipeline with in-process QA key.
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initialR29Ledger,applyR29SandboxIntent,projectR29SandboxState,
 R29_INTENT_PATH,R29_LEDGER_PATH,R29_RECEIPT_PATH} from './r29-paper-protocol.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=file=>path.join(root,file);
if(process.env.R29_CI_SANDBOX!=='1'||process.env.SNIPER_OFFLINE!=='1')
 throw Error('R29_CI_SANDBOX_AND_OFFLINE_REQUIRED');
const readJson=file=>JSON.parse(readFileSync(source(file),'utf8'));
const intent=readJson(R29_INTENT_PATH);
if(intent.target!=='CI_SANDBOX')throw Error('R29_ONLY_CI_INTENT_CAN_REACH_GITHUB_ACTIONS');
const before=existsSync(source(R29_LEDGER_PATH))?
 readJson(R29_LEDGER_PATH):initialR29Ledger();
const outcome=applyR29SandboxIntent(before,intent,{target:'CI_SANDBOX'});
const status=projectR29SandboxState(outcome.ledger);
if(status.real_trading_enabled!==false||status.user_paper_modified!==false)
 throw Error('R29_UNEXPECTED_NON_PAPER_OPERATION');
for(const file of [R29_LEDGER_PATH,R29_RECEIPT_PATH])mkdirSync(path.dirname(source(file)),{recursive:true});
writeFileSync(source(R29_LEDGER_PATH),JSON.stringify(outcome.ledger,null,2)+'\n');
const receipt={...outcome.receipt,
 actual_windows_bot_connected:false,
 transport:'GITHUB_ACTIONS_ISOLATED_PAPER_BOT',
 github_run_id:process.env.GITHUB_RUN_ID||null,
 private_signer_key_stored:false};
writeFileSync(source(R29_RECEIPT_PATH),JSON.stringify(receipt,null,2)+'\n');
console.log('R29_GITHUB_ACTIONS_ISOLATED_LEDGER_RESULT '+JSON.stringify({
 intent_id:receipt.intent_id,action:receipt.action,
 status:receipt.status,positions:status.open_positions.length,
 cash_test_usdc:status.cash_balance_test_usdc,
 closed_pnl_test_usdc:status.closed_pnl_test_usdc,
 real_wallet_touched:false,actual_windows_bot_connected:false
}));
if(receipt.status!=='PAPER_FILLED'&&receipt.status!=='DUPLICATE_ALREADY_APPLIED'){
 console.error('R29_ISOLATED_FILL_NOT_COMPLETED',receipt.reason);
 process.exitCode=1;
}
