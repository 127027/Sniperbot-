# R07: Zwei-Monats-Blindtest der fünf Forschungs-Dots

**Zeitfenster:** 2024-09-10T00:00:00Z bis einschließlich 2024-11-09T23:59:59Z (61 UTC-Tage).

**Zweck:** Unbekannte, damals neu entstandene Memecoins und öffentliche Meme-Ereignisse möglichst früh lokalisieren. Die fünf bisherigen Forschungsrollen erhalten **keinen Zielcoin, keine Gewinnerliste, keine heutige Preis-/ATH-Liste** und kein Zukunftswissen. Nur Forschung, kein Echtgeld, keine lokalen Trades, kein signierter Paper-Auftrag.

## Tag-für-Tag-Regel (striktes as-of)

Für jeden virtuellen UTC-Tag D von 10.09. bis 09.11.2024:
1. Suche und benenne öffentliche Originalereignisse, Posts, neue Pools, News, Launches und frühe Käufer aus **mehreren konkurrierenden Tokenkandidaten**. Ein Ereignis vor der Coinexistenz kann als `UNMATCHED_NARRATIVE` notiert werden.
2. Eine Quelle darf die Entscheidung von Tag D **nur** beeinflussen, wenn die damalige Text-/Datenfassung und tatsächliche Verfügbarkeit bis D überprüft ist. `published_at` allein reicht nicht: 2026 geänderte oder retrospektive Artikel sind nicht zulässig. Bevorzugt: Wayback-/WARC-Capture mit reproduzierbarer URL+UTC, belegter öffentlicher Originalpost mit gesicherter historischer Fassung oder on-chain unveränderliche vor D vorhandene Events mit Chain/Slot/Blockzeit und damals gültigen RPC-Fakten. Ein Screenshot aus 2026 eines alten Tweets reicht nicht.
3. In öffentlicher Recherche dürfen Suchergebnisse von heute als *Archiv-Finder* dienen, aber nie als damaliger Investitionsbeleg. Kein Artikel oder Post, dessen originale nachprüfbare Erfassung nach D liegt, in den Input von Tag D.
4. Die tatsächlich betrachtete Grundgesamtheit muss viele unterschiedliche Starts und negative Fälle enthalten, nicht nur spätere Gewinner. Auch Coins ohne klare Contract-/Pooladresse notieren, aber nicht als kaufbar markieren.
5. `DISCOVERED` erfordert mindestens eine eindeutige und zur damaligen Zeit verifizierbare `chain:token_address:pool_address`-Identität. `PAPER_BUY_ADVISORY` ist NUR forschungsmäßig erlaubt, wenn unabhängige Quellen, damalige Poolquote, Security-Check, damalige realistische Größen-/Verkaufsroute und Risikogrenzen belegbar sind. Ansonsten `WATCH`, `REJECT` oder `UNTESTABLE`. KEINE signierte Order, KEIN tatsächlicher Paper-Fill.
6. Halte pro Tag den bis dahin sichtbaren Forschungszustand fest; neu eintreffende Belege dürfen frühere Tage nicht rückwirkend ändern.
7. Bei fehlendem Historienmaterial `UNAVAILABLE_ASOF` verwenden. Niemals behaupten, zukünftige ChatGPT-Dots seien bereits im historischen Jahr gelaufen.

## Die fünf Rollen
- `news_discovery`: neue Meme-Auslöser, aktuelle damalige Quellen, Identitätshypothesen.
- `social_acceleration`: unabhängige originale Autoren, Cross-Platform-Reaktionen, organische Beschleunigung vs Werbung.
- `onchain_liquidity`: unabhängige damals existierende Mint-/Pool-Identität, Handelsvolumen/Liquidität, reales Handelsrouting, plausible kleine und große Kauf- und Verkaufsmengen.
- `contract_security`: zeitpunktbezogene Contract-Rechte, LP-/Holder-Konzentration, Sellability, Sicherheits-Veto.
- `opportunity_qa`: Gegenhypothesen, Quellenkorrelation, negative Kontrollfälle, getrennte `WATCH|PAPER_BUY_ADVISORY|REJECT|UNTESTABLE`-Urteile. Ohne kalibrierte repräsentative Holdout-Daten ist eine numerische Erfolgswahrscheinlichkeit `null`, nicht eine erfundene 95-%-Angabe.

## Separat auszugebender Rollenbericht (kein normales LIVE-Snapshot-Overwrite)
Jede Rolle soll als **einmaliges, klar mit R07 gekennzeichnetes Testergebnis** im Automationslauf berichten:
```json
{
  "schema": "research_historical_r07_role.v1",
  "role": "<role>",
  "period": {"start_utc": "2024-09-10T00:00:00Z", "end_utc": "2024-11-09T23:59:59Z", "days": 61},
  "state": "COMPLETED",
  "paper_only": true,
  "actionable": false,
  "original_result_created_at_utc": "UTC-Ausführungszeitpunkt",
  "historical_research_only": true,
  "actually_ran_five_dots_in_2024": false,
  "coverage": {"virtual_days_reviewed": 61, "independently_verified_asof_events": 0},
  "daily_findings": [
    {"virtual_day_utc": "YYYY-MM-DD", "candidates": [], "new_narratives": [],
     "source_urls_with_capture_timestamps": [], "unverified_or_later_sources": []}
  ],
  "first_discovers": [
    {"candidate_id": "<chain:token:pool or null>", "first_valid_day_utc": "YYYY-MM-DD",
     "sources": [], "decision": "WATCH|PAPER_BUY_ADVISORY|REJECT|UNTESTABLE",
     "proposed_notional_test_usdc": null,
     "reason": "...", "unknowns": []}
  ],
  "unknowns": [],
  "conclusion": "..."
}
```
Abweichungen oder fehlende vollständige Tageslisten ehrlich benennen; keine 61 Einträge erfinden, wenn nur wenige Tage belegbar sind. Bei fehlender Möglichkeit, tatsächlich fünf separat laufende Modellinstanzen zu starten, `RUN_BLOCKED` statt KI-Rollen vorgaukeln.

**Schema-Vertrag:** Die vorhandenen PENDING-Dateien unter research/historical/R07/{role}.json sind verbindliche Vorlage. Beim Update die bestehenden Feldnamen und den period-Objekttyp beibehalten; nur role-spezifische Forschungsinhalte ausfüllen. Vorhandene Prüfung runner/dot-r07-report-audit.mjs muss bestehen.\n\n## Score nach Abschluss
Die geheime Gewinner-/Verlierer-Wahrheit und historische Rendite-Daten werden erst NACH der Original-Recherche separat von einem unabhängigen Auswerter geladen. Diese R07-Datei **enthält bewusst keine Coinliste oder TARGET-/Winner-Marker**. Ein Zeitraum wird nachträglich nach Coinlisten gewählt (Selection Bias) und ist noch kein repräsentativer Live-Erfolgsnachweis. Wiedergabe dient der Diagnose, nicht einer rückwirkend garantierten Gewinnquote.

## Trennung zu LIVE
Die normalen fünf stündlichen Sniper-Dots werden nicht dauerhaft auf 2024 umgestellt. Eine einmalige Ad-hoc-Prüfung darf die öffentlichen aktuellen `research/roles/*/latest.json`-Snapshots, Watchlist, den Order-Kurier, die Mainbranch-Engine, Wallets, PayPal und Hixton nicht überschreiben. Echtgeld und Paper-Ausführung bleiben gesperrt, da dies nur ein Forschungstest ist.
