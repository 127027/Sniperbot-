// R29 verifies the real single-user dashboard, its static controls and
// readable inline script without a browser or external APIs.
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=await readFile(path.join(root,'runner','dashboard.html'),'utf8');
const scripts=[...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)];
if(scripts.length!==1)throw Error('R29_USER_DASHBOARD_INLINE_SCRIPT_INVALID');
new Script(scripts[0][1],{filename:'runner/dashboard.html'});
const controls=[
 'tabPaper','tabReal','availableValue','totalValue','openCount','openPnl',
 'realizedPnl','positionRows','historyList','toggleBot',
 'paperSettings','realSettings','preferredEntry','exposureCap',
 'saveBudget','setPaperBalance','newPaperBalance',
 'realUsdc','realSol','refreshWallet','walletInfo',
 'diagCourier','diagMain','diagnostics'
];
for(const id of controls){
 const re=new RegExp('id=["\\\x27]'+id+'["\\\x27]');
 if(!re.test(html))throw Error('R29_MISSING_USER_CONTROL_'+id);
}
for(const outdated of [
 'R29-Sandbox (TEST-USDC)','Dot-Eingang','Fünf-Agenten-Kommunikation',
 'masterGithubToken','centralFollow','paperPipelineSelftest',
 'walletNativeSend','dynamicRouteCheck','agentDotRoles'
]){
 if(html.includes(outdated))throw Error('R29_OUTDATED_DEVELOPER_UI_STILL_PRESENT_'+outdated);
}
for(const needed of [
 '/api/dashboard/paper','/api/wallet/overview','/api/wallet/status',
 '/api/r29/main-paper/status','/api/command',
 'portfolio_budget','quote_status','estimated_net_exit_test_usdc'
]){
 if(!html.includes(needed))throw Error('R29_DASHBOARD_DATA_CONTRACT_MISSING_'+needed);
}
if(!html.includes('Echtgeldhandel ist derzeit gesperrt')||
 !html.includes('Keine unabhängig bestätigten Bot-Live-Positionen')||
 !html.includes('Keine verifizierte EUR-Bewertung')){
 throw Error('R29_LIVE_ACCOUNT_MUST_FAIL_CLOSED');
}
if(!html.includes('role="tablist"')||!html.includes('aria-label="Positionstabelle"')||
 !html.includes('overflow-x:auto'))throw Error('R29_ACCESSIBLE_RESPONSIVE_LAYOUT_MISSING');
console.log('R29_TRADING_DASHBOARD_OK: one Paper account, read-only real wallet, position PnL, no retired sandbox budget or Dot/debug UI');
