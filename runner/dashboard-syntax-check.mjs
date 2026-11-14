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
 'dynamicRouteCheck','dynamicInboxRefresh',
 'paperWorkspaceTab','realWorkspaceTab','paperWorkspace','realWorkspace',
 'realEurTotal','realSolTotal','realUsdcTotal','realRefreshOverview',
 'realLiveSwitch','liveModeForceOff','liveModeStatus',
 'paperEurDeposit','paperEurWithdraw','agentResearchStage','agentDotRoles','agentCourierHealth','paperPipelineSelftest','paperPipelineSelftestResult']){
 if(!html.includes('id="'+marker+'"'))throw Error('MISSING_DASHBOARD_CONTROL_'+marker);
}
if(!html.includes('initializeWorkspaces();')||!html.includes('refreshRealModePolicy();'))
 throw Error('WORKSPACE_INITIALIZATION_MISSING');
if(!/<input id="realLiveSwitch"[^>]*type="checkbox"[^>]*disabled>/.test(html.replace(/\s+/g,' ')))
 throw Error('LIVE_SWITCH_MUST_START_DISABLED');
if(!html.includes('AUSSCHLIESSLICH')&&!html.includes('Ausschließlich'))
 throw Error('PAPER_FUNDS_WARNING_MISSING');
console.log('DASHBOARD_SCRIPT_PARSE_OK (separate Paper/Real tabs, real balance, locked live switch and diagnostics)');
