import { createServer } from 'node:http';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderDashboard(state) {
 const positions=Object.values(state.positions||{});
 const receipts=Object.values(state.receipts||{}).slice(-30).reverse();
 const rows=positions.map(p=>'<tr><td>'+esc(p.coin?.symbol)+'</td><td>'+esc(p.coin?.chain)+'</td><td>'+esc(p.coin?.pool)+'</td><td>'+esc(p.quantity)+'</td></tr>').join('');
 const events=receipts.map(r=>{const v=r.data||{};return '<tr><td>'+esc(v.timestamp)+'</td><td>'+esc(v.action||'-')+'</td><td>'+esc(v.id)+'</td><td>'+esc(v.status)+'</td><td>'+esc(v.reason_code||'-')+'</td><td>'+(r.published?'Publiziert':'Ausstehend')+'</td></tr>'}).join('');
 return '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta http-equiv="refresh" content="15"><meta name="viewport" content="width=device-width,initial-scale=1"><title>R29 CleanPaper</title><style>body{font:16px system-ui;background:#111827;color:#f9fafb;max-width:1000px;margin:3rem auto;padding:0 1rem}p,small{color:#b6c1cf}.tile{background:#1f2937;border-radius:12px;padding:1rem;display:inline-block;margin:.5rem}table{width:100%;border-collapse:collapse;overflow-wrap:anywhere}td,th{padding:.7rem;border-bottom:1px solid #334155;text-align:left}section{overflow-x:auto}</style></head><body><h1>R29 CleanPaper — PAPER ONLY</h1><p>Eigenständiger neuer Bot; lokale Ansicht; Aktualisierung alle 15 Sekunden</p><div class="tile">Guthaben: <strong>'+esc(Number(state.cash||0).toFixed(2))+' TEST-USDC</strong></div><div class="tile">Positionen: '+positions.length+'</div><div class="tile">Aufträge: '+Object.keys(state.processed||{}).length+'</div><section><h2>Offene Positionen</h2><table><tr><th>Coin</th><th>Chain</th><th>Pool</th><th>Token-Menge</th></tr>'+(rows||'<tr><td colspan="4">Noch keine Positionen</td></tr>')+'</table></section><section><h2>Aufträge und GitHub-Quittungen</h2><table><tr><th>Zeit</th><th>Aktion</th><th>Order-ID</th><th>Status</th><th>Grund</th><th>GitHub</th></tr>'+(events||'<tr><td colspan="6">Noch keine Signale eingetroffen</td></tr>')+'</table></section><p>Diese Darstellung ist ein virtuelles Paper-Konto. Dot-Analysen werden erst nach tatsächlicher GitHub-Übermittlung sichtbar.</p></body></html>';
}
export function startDashboard(getState,port=8765) {
 const server=createServer((req,res)=>{
   res.setHeader('Cache-Control','no-store');
   res.setHeader('X-Content-Type-Options','nosniff');
   res.setHeader('Content-Security-Policy',"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
   if(req.method!=='GET'||req.url!=='/'){res.writeHead(404);res.end('Not found');return;}
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
   res.end(renderDashboard(getState()));
 });
 server.listen(port,'127.0.0.1');
 return server;
}
