import {createServer} from 'node:http';
import {projectPaperMonitoring} from './v19-paper-monitor.mjs';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fixed=v=>typeof v==='number'&&Number.isFinite(v)?v.toFixed(2):'Unbekannt';
const stamp=v=>v?esc(v):'Nicht bekannt';
const dash=v=>v===null||v===undefined?'Unbekannt':esc(v);
export function renderDashboard(state,{policy=null,nowUtc=new Date().toISOString()}={}){
 const m=projectPaperMonitoring({state,policy,nowUtc});
 const items=m.positions.map(p=>
   '<tr><td>'+esc(p.symbol)+'</td><td>'+esc(p.chain)+'</td><td>'+esc(p.pool)+'</td>'+
   '<td>'+dash(p.opening_buy_order_id)+'</td><td>'+dash(p.quantity)+'</td>'+
   '<td>'+fixed(p.cost_test_usdc)+'</td><td>'+fixed(p.entry_price_usdc)+'</td>'+
   '<td>'+stamp(p.last_capture_at_utc)+'</td>'+
   '<td>'+(p.capture_age_seconds===null?'Unbekannt':esc(p.capture_age_seconds)+' s')+'</td>'+
   '<td>'+esc(p.quote_state)+'</td>'+
   '<td>Keine verifizierte Dot-3-Prüfung im lokalen State</td></tr>').join('');
 const receipts=m.receipts.map(r=>
   '<tr><td>'+stamp(r.timestamp)+'</td><td>'+esc(r.action)+'</td>'+
   '<td>'+esc(r.id)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.reason_code)+'</td>'+
   '<td>'+(r.published?'Lokal als GitHub-publiziert markiert':
      'Ausstehend'+(r.delivery_delay_minutes===null?'':' seit '+esc(r.delivery_delay_minutes)+' min'))+
   '</td></tr>').join('');
 const card=(label,value,unit='')=>'<div class="tile">'+esc(label)+
   ': <strong>'+esc(value)+esc(unit)+'</strong></div>';
 return '<!doctype html><html lang="de"><head><meta charset="utf-8">'+
   '<meta http-equiv="refresh" content="15"><meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<title>R29 CleanPaper</title>'+
   '<style>body{font:15px system-ui;background:#111827;color:#f9fafb;max-width:1320px;'+
   'margin:2rem auto;padding:0 1rem}p,small{color:#b6c1cf}.tile{background:#1f2937;'+
   'border-radius:10px;padding:1rem;display:inline-block;margin:.35rem}'+
   'table{width:100%;border-collapse:collapse;overflow-wrap:anywhere;font-size:13px}'+
   'td,th{padding:.55rem;border-bottom:1px solid #334155;text-align:left;vertical-align:top}'+
   'section{overflow-x:auto;margin-top:1.2rem}th{color:#cbd5e1}'+
   '.note{border-left:3px solid #64748b;padding:.6rem 1rem;background:#1f2937}'+
   '</style></head><body>'+
   '<h1>R29 CleanPaper — PAPER ONLY</h1>'+
   '<p>Lokaler gespeicherter Kontostand, Aktualisierung alle 15 Sekunden</p>'+
   '<p class="note">Keine Echtgeldbörse, keine realen Blockchain-Transaktionen. '+
   'Die Oberfläche ruft keine aktuellen Marktkurse ab. Ohne verifizierte Originalquelle '+
   'werden aktueller Coin-Wert, aktueller Gewinn/Verlust, Dot-3-Risiko und Verkaufbarkeit '+
   'ausdrücklich nicht behauptet.</p>'+
   card('Verfügbares Guthaben',fixed(m.cash_test_usdc),' TEST-USDC')+
   card('Offene Positionen',m.open_position_count)+
   card('Investierte Kostenbasis',fixed(m.open_cost_basis_test_usdc),' TEST-USDC')+
   card('Einsatz/Coin',fixed(m.stake_per_coin_test_usdc),' TEST-USDC')+
   card('Maximal offene Positionen',m.max_positions??'Unbekannt')+
   card('Bereits verarbeitete Aufträge',m.completed_order_count)+
   card('Quittungen noch ausstehend',m.pending_receipts_in_last_30)+
   '<section><h2>Offene Paper-Positionen</h2><table><tr>'+
   '<th>Coin</th><th>Chain</th><th>Pool</th><th>Eröffnender BUY</th>'+
   '<th>Menge</th><th>Kostenbasis</th><th>Einstiegspreis</th>'+
   '<th>Letzter gemeldeter HTTP-Capture</th><th>Alter</th>'+
   '<th>Kurs-Evidenz</th><th>Risikostatus</th></tr>'+
   (items||'<tr><td colspan="11">Noch keine Positionen</td></tr>')+
   '</table></section>'+
   '<section><h2>Lokale Aufträge und Quittungen (letzte 30)</h2><table><tr>'+
   '<th>Zeit</th><th>Aktion</th><th>Order-ID</th><th>Status</th>'+
   '<th>Grund</th><th>GitHub-Übermittlung</th></tr>'+
   (receipts||'<tr><td colspan="6">Noch keine Aufträge verarbeitet</td></tr>')+
   '</table></section>'+
   '<p>Wichtige Abgrenzung: PAPER_REJECTED ist eine lokale Ablehnung, keine Blockchain-Transaktion. '+
   'Eine als publiziert markierte Quittung beweist nicht unabhängig einen externen Fill.</p>'+
   '</body></html>';
}
export function startDashboard(getState,port=8765,getPolicy=()=>null){
 const server=createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',
   "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'");
  if(req.method!=='GET'||req.url!=='/'){
   res.writeHead(404);res.end('Not found');return;
  }
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
  res.end(renderDashboard(getState(),{policy:getPolicy()}));
 });
 server.listen(port,'127.0.0.1');
 return server;
}
