// Render only already validated, supplied forensic traces.
// No GPT invocations, API access, historical replay or paper-account writes.
import {R29_TRACE_ROLES} from './v19-five-dot-forensic-trace.mjs';

const esc=x=>String(x??'—').replace(/\|/g,'\\|').replace(/[\r\n]+/g,' ').trim();
const line=(...cells)=>'| '+cells.map(esc).join(' | ')+' |';
const table=(head,rows)=>[line(...head),line(...head.map(()=>'---')),
 ...rows.map(row=>line(...row))].join('\n');
const count=x=>Number.isInteger(x)?x:0;
const safeList=x=>Array.isArray(x)&&x.length?x.map(v=>esc(v)).join('; '):'—';
const noSource='Keine unabhängig authentifizierte Originalquelle im übergebenen Trace belegt';

export function renderR29FiveDotForensicMarkdown(report){
 if(report?.kind!=='R29_V19_FIVE_DOT_FORENSIC_DIAGNOSTIC'
  ||report.schema!==1||!Array.isArray(report.per_role)
  ||!Array.isArray(report.hourly)||!Array.isArray(report.per_pool)
  ||!Array.isArray(report.causal_problems)
  ||report.per_role.length!==R29_TRACE_ROLES.length
  ||report.genuine_gpt_reviews_independently_verified!==0
  ||report.client_fills_independently_verified!==0)
  throw Error('INVALID_R29_FORENSIC_DIAGNOSTIC_REPORT');
 const out=[
 '# R29 – Forensischer Fünf-Dot-Diagnosebericht',
 '',
 '**Status: Forschungs-/Modellprotokoll, KEIN ausgeführter Oktober-Backtest.**',
 '',
 '- Run-ID: '+esc(report.run_id),
 '- Aufwärmen ab: '+esc(report.begin_utc),
 '- Blindfenster: '+esc(report.start_utc)+' bis '+esc(report.end_utc)+' (Ende exklusiv)',
 '- Aus der Eingabe belegte forensische Ereignisse: '+count(report.recorded_event_count),
 '- GPT-Selbstberichte über Reviews: '+count(report.claimed_gpt_reviews),
 '- Unabhängig bestätigte historische GPT-Reviews: 0',
 '- Unabhängig bestätigte Paper-Client-Fills: 0',
 '- Exakte Pools mit mindestens einem Logeintrag: '+count(report.tracked_exact_pools),
 '- Marktabdeckung: unbekannt – Traceumfang ist kein neutraler Markt-Nenner',
 '',
 '## 1. Rollen und tatsächlich berichtete Arbeitsnachweise',
 '',
 table(['Rolle','Ereignisse','GPT-Review-Claims','Verifizierte GPT-Reviews',
   'Einträge mit Datenlücken'],report.per_role.map(r=>[
   r.role,r.recorded_events,r.claimed_gpt_reviews,
   r.verified_gpt_reviews,r.recorded_data_gaps])),
 '',
 '**Achtung:** Kein Logeintrag bedeutet „kein verifizierbarer Eintrag“, NICHT zwingend, dass der Dot nichts getan hat. Ein Modellschritt oder GPT-Eigenclaim beweist keine historische echte GPT-Aktivität.',
 '',
 '## 2. Stündliche 29h-Zeitleiste (5h Warmup + 24h Blindfenster)',
 '',
 table(['Stunde UTC','Phase','Dot1','Dot2','Dot3','Dot4','Dot5',
  'Ereignisse','Nicht dokumentierte Rollen'],report.hourly.map(h=>[
  h.hour_start_utc,h.phase,...R29_TRACE_ROLES.map(r=>h.role_event_counts?.[r]??0),
  h.event_count,safeList(h.role_without_any_trace)])),
 '',
 '**Wichtig:** 4/8/12/24 GPT-Vollreviews pro Tag sind ein adaptives Ziel. Eine Stunde ohne Vollreview ist nicht automatisch ein Fehler. Jeder tatsächliche Wake, API-Request, Entscheidung und Positionscheck benötigt aber eine nachvollziehbare eigene Quittung.',
 '',
 '## 3. Vollständige Lebensläufe der tatsächlich protokollierten Pools',
 ''
 ];
 if(!report.per_pool.length)out.push('**Keine verifizierten Pool-Lebensläufe vorgelegt.** Keine Schlussfolgerung über die 65 rückblickenden Gewinner.');
 for(const [i,p] of report.per_pool.entries()){
  out.push('### Pool '+(i+1)+' – '+esc(p.market_key),'',
   '- Chain: '+esc(p.chain),
   '- Contract: '+esc(p.contract),
   '- Pool: '+esc(p.pool),'',
   table(['Zeit UTC','Dot','Aktion','Was genau?','Warum?','Alternativen',
    'Quellpfade','Fehlende Belege','Vorgänger-IDs'],
    p.events.map(e=>[e.at_utc,e.role,e.action,e.what,e.why,
      safeList(e.alternatives_considered),
      safeList(e.source_paths),safeList(e.data_gaps),safeList(e.linked_event_ids)])),
   '');
 }
 out.push('## 4. Kausalketten- und Nachweislücken','');
 if(!report.causal_problems.length)out.push(
  'Keine formalen Kausalkettenkonflikte in den *gelieferten* IDs erkannt. Das ist kein Nachweis vollständiger Quellen, richtig arbeitender Dots oder vollständiger Marktabdeckung.');
 else out.push(table(['Ereignis-ID','Fehlercode','Bezugsereignis'],
   report.causal_problems.map(p=>[p.event_id,p.code,p.linked_event_id])));
 out.push('', '### Rollen ohne irgendeinen übergebenen Eintrag','',
  safeList(report.missing_roles),'',
  '### Noch nicht belegte externe Voraussetzungen','',
  '- '+noSource,
  '- Echte API-Veröffentlichungszeiten, Originalcaptures und neutrale Vollständigkeit: unabhängig nachzuweisen',
  '- Unabhängige Dot3-Quotezeit, Issuer und on-chain Verkaufbarkeit: nicht aus JSON-Claims ableitbar',
  '- Reale GPT-Ausführungskette sowie GitHub→Windows-Paper-Lot-/Receipt-Kette: nicht aus einem Modellbericht ableitbar',
  '- 65 rückblickende Coin-/Pool-Meldungen: **erst nach dem Ende des Blindlaufs** als separates Oracle-Evaluationsmanifest einspielen',
  '- Gewinner und Nichtgewinner brauchen einen vorab eingefrorenen neutralen Nenner; fehlende Werte werden als UNKNOWN statt 0 geführt',
  '',
  '## 5. Ableitbare Korrekturaufträge – KEINE erfundene Root-Cause',
  '',
  table(['Priorität','Blocker','Zu prüfender Verantwortungsbereich','Abnahme'],[
   ['P0','Unabhängig bestätigte GPT-Reviews fehlen','Dot1–Dot5/Automation/GitHub-Provenienz',
    'Originaler GPT-Run + Zeit + Input-SHA + ausgeleitete Entscheidung pro wirklich ausgeführtem Wake'],
   ['P0','Risk-/Sellability-Beleg nicht extern validiert','Dot3/Quellen/Chain',
    'Vertrauensanker, Originalquelle und nachweisbarer Pool-Sell-Pfad zeitgerecht'],
   ['P0','Kein vollständig belegter historischer Paper-Fill','Dot4/Client',
    'Exakter erster Quote nach Signal, Kosten/Slippage und isoliert reconciliertes Lot-Receipt'],
   ['P0','Neutrale historische Marktgrundgesamtheit fehlt oder ist nicht belegt','Dot2/Quellen',
    'Positive und negative Poolpopulation mit Verfügbarkeitszeiten, Full IDs und Coverage-Lücken'],
   ['P1','Nachträgliche Oracle-Labels können Optimierungsleck erzeugen','Dot5/Evaluation',
    'Blinde Hash-Freigabe, getrennte Post-Run-Auswertung, neuer unabhängiger Holdout']
  ]),
  '',
  '## 6. Urteil und nächste Schritte','',
  '**Keine Freigabe für die finale QA-04-Abnahme aus diesem Bericht.** Die Original-60/60-Freigabekriterien gelten unverändert. Nach jedem behobenen Defekt denselben fixierten neutralen Datenstand prüfen, erst danach unbekanntes Holdout; ohne unabhängige Quellen und echte Rollen-/Clientquittungen keinen 100%-PASS vergeben.',
  '',
  'Dieser Bericht dokumentiert ausschließlich die übergebenen Ereignisse; er hat keine APIs aufgerufen, keine historischen GPT-Dots gestartet, keine Orders oder Paper-Fills erzeugt und die Gewinner-Referenzliste nicht geöffnet.',
  '');
 return out.join('\n');
}
