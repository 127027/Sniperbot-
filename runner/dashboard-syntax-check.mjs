// Parse the dashboard's inline JS without a browser, catching accidental GUI syntax errors.
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=await readFile(path.join(root,'runner','dashboard.html'),'utf8');
const scripts=[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)];
if(scripts.length!==1)throw Error('DASHBOARD_INLINE_SCRIPT_COUNT_INVALID');
new Script(scripts[0][1],{filename:'runner/dashboard.html'});
for(const marker of ['walletCreate','walletBackupDownload','walletBackupVerify',
 'walletRestore','walletRefresh','walletQuote','walletTokens','walletActivity','walletUnsignedOrder','walletReceiptVerify','externalWalletObserve',
 'deviceChooseMaster','deviceChooseFollower','masterCreateSigningKey',
 'masterStartPublishing','masterStopPublishing',
 'walletNativePreview','walletNativeSend','walletNativeHistory',
 'paperEurDeposit','paperEurWithdraw']){
 if(!html.includes('id="'+marker+'"'))throw Error('MISSING_DASHBOARD_CONTROL_'+marker);
}
console.log('DASHBOARD_SCRIPT_PARSE_OK (wallet, backup, payment, quote, paper UI)');
