// Honest comparison report: R26 price-only reference is NOT substituted
// for R27's missing 615 historical AI research snapshots.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {r27Compare,emptyR27Bundle} from './r27-asof-frequency.mjs';

export async function buildR27Report({bundle=emptyR27Bundle(),sourceProbe=null,baseline=null}={}){
 const report=await r27Compare(bundle);
 const gdelt=sourceProbe?{metadata_urls:sourceProbe.observed_url_metadata_count,
  window_statuses:sourceProbe.date_buckets?.map(x=>({start:x.window_start_utc,
   status:x.status,reported_articles:x.articles_returned}))||[],
  contemporaneous_verified:sourceProbe.verified_historical_asof_news_items||0}:null;
 const reference=baseline?.schema==='sniper_r26_frequency_comparison.v1'?{
  type:'R26_PRICE_ONLY_NOT_COMPARABLE',
  frequencies:baseline.runs?.map(x=>({per_day:x.frequency_per_day,
   price_only_virtual_end:x.equity_if_liquidated_test_usdc,
   price_only_virtual_net:x.net_pnl_test_usdc}))}:null;
 return {report,source_probe:gdelt,previous_price_only_reference:reference};
}
export function r27ReportMarkdown(analysis){
 const {report,source_probe,previous_price_only_reference}=analysis;
 const lines=['# R27 – 15-Tage-Früherkennung / 1–4–12–24 Analysen',
  '',
  '**Befund:** Für diesen vergangenen Zeitraum liegen in der bisherigen',
  'R27-Historienbasis noch nicht genügend nachweisbar zeitkorrekte',
  'Nachrichten-, neue-DEX-Pool-, Sicherheits- und Ausführungs-Snapshots vor.',
  'Ein vollständiger KI-Blindtest ist damit noch NICHT durchführbar.',
  '',
  '| Analysen pro Tag | Vorgesehen | Historisch mit belegten Quellen überprüfbar | Fehlende Zeitpunkte | Tatsächlich durchgeführte historische KI-Aufrufe | Nachgewiesener KI-Gewinn |',
  '|---:|---:|---:|---:|---:|---:|'];
 for(const x of report.runs){
  lines.push(`| ${x.frequency_per_day} | ${x.scheduled_analyses} | ${x.research_eligible_analyses} | ${x.data_gap_analyses} | ${x.model_calls} | NICHT ERMITTELBAR |`);
 }
 lines.push('',`**Gesamt:** ${report.summary.total_scheduled_analyses} vorgesehene Zeitpunkte; ${report.summary.total_historical_model_calls} belegte historische KI-Analysen; ${report.summary.total_historical_fills} historische DEX-Ausführungen.`,'',
  '**Fehlende historische Daten sind keine nachträgliche NO_TRADE-Entscheidung und kein Gewinn von 0.**',
  'R27 lässt absichtlich kein theoretisches Endguthaben entstehen, wenn',
  'der historische Recherche-/Ausführungsnachweis fehlt.',
  '');
 if(source_probe){
  lines.push('## Retrospektive Nachrichtensuche (nur Recherchehinweise)','',
   `Nachträglich gefundene GDELT-Metadaten-URLs: ${source_probe.metadata_urls??'nicht verfügbar'}.`,
   `Mit unabhängig nachgewiesenem damaligem Originaltext: ${source_probe.contemporaneous_verified}.`,
   'GDELT kann historische Veröffentlichungshinweise liefern, aber ihre heutige',
   'Abrufbarkeit beweist keine unveränderte damalige Textfassung.',
   'Ergebnisse werden deshalb NICHT als historische Handelsentscheidungen eingesetzt.','');
 }
 if(previous_price_only_reference){
  lines.push('## R26 – bisheriger Vergleich, nicht dieselbe KI','',
   '| Analysen pro Tag | Preis-/Volumen-Modell-Ergebnis (virtuell) |',
   '|---:|---:|');
  for(const x of previous_price_only_reference.frequencies){
   lines.push(`| ${x.per_day} | ${Number(x.price_only_virtual_net).toFixed(2)} TEST-USDC |`);
  }
  lines.push('','Diese Zahlen beruhen auf bereits bekannten Binance-Memecoin-Paaren,',
   'nicht auf einer neutralen historischen DEX-Neuentdeckungs-KI.','');
 }
 lines.push('## Was jetzt zuverlässig vorbereitet ist','',
  '- Eine gemeinsame Quelle/Zeit-Evidenz-Schranke für 15, 60, 180 und 360 Zeitpunkte.',
  '- Ein einziger optionaler historischer KI-Adapter ohne Live-Websuche und ohne Trading-API.',
  '- Neue Paper-BUYs im lokalen Bot können bei schwachem oder unbekanntem BTC/ETH-Regime blockiert werden.',
  '- Das lokale öffentliche Forschungsarchiv speichert fortan erste Beobachtungen von neuen Pools und Nachrichten append-only.',
  '- Künftige Quellen müssen unabhängig auf Verfügbarkeit zum jeweiligen Replay-Zeitpunkt geprüft werden.',
  '- Geplante Aktionen bleiben Paper-only, keine Dots, keine Echtgeld-Transfers.',
  '',
  '## Weiter offene wissenschaftliche und technische Aufgaben','',
  '- Unabhängig geprüfte vollständige historische Launch-Kandidaten je Chain.',
  '- Zeitgenau nachgewiesene Nachrichten- und Social-Media-Inhalte.',
  '- Historische Pool-Liquidität, Gebühren, Sicherheitszustand und verifizierte nächste ausführbare Quotes.',
  '- Blindtests mit getrennten Zeiträumen und robustem Kontrollportfolio NO_TRADE.',
  '- Prospektive Auswertung des Bot-Verhaltens einschließlich echter Paper-Order-Quittungen.',
  '',
  'Ein späterer erfolgreicher Regressionstest ist KEIN Nachweis historischer Handelsperformance.','');
 return lines.join('\n');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const target=process.argv[2]||'r27-output';
 const probeFile=process.argv[3]||null;
 const baselineFile=process.argv[4]||null;
 const probe=probeFile?JSON.parse(readFileSync(probeFile,'utf8')):null;
 const baseline=baselineFile?JSON.parse(readFileSync(baselineFile,'utf8')):null;
 const out=await buildR27Report({sourceProbe:probe,baseline});
 mkdirSync(target,{recursive:true});
 writeFileSync(path.join(target,'summary.json'),JSON.stringify({
  schema:'r27_report_summary.v1',window:out.report.window,
  source_probe:out.source_probe,baseline_reference:out.previous_price_only_reference,
  input:out.report.input,runs:out.report.runs.map(({journal,...rest})=>rest),
  conclusion:out.report.summary},null,2)+'\n');
 writeFileSync(path.join(target,'audit-details.json'),JSON.stringify(out.report,null,2)+'\n');
 writeFileSync(path.join(target,'REPORT_DE.md'),r27ReportMarkdown(out)+'\n');
 console.log(JSON.stringify({status:'R27_ARCHIVE_COVERAGE_AUDIT_COMPLETE',
  epochs:out.report.summary.total_scheduled_analyses,
  model_calls:out.report.summary.total_historical_model_calls,
  fills:out.report.summary.total_historical_fills,
  p_n_l:'UNDETERMINABLE_WITH_CURRENT_SOURCE_COVERAGE'}));
}
