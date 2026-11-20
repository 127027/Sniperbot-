# R29 V5.9 – kontinuierlicher GPT-Forward-Paper-Betrieb (Stand 20.11.2026)

## Verbindliche Architektur
- Strategische Forschung, Kandidatenauswahl, BUY/WATCH/HOLD/SELL und adaptive GPT-Vollreview-Entscheidung ausschließlich in der bestehenden HOURLY-ChatGPT-Automation.
- GitHub-Entscheidungsarchiv/Pointer plus authentifizierter Windows-Kurier sind die einzige Strategie-Auftragskette.
- Windows-Sniperbot führt nur signierte, unabhängigen Safety-Gates unterliegende virtuelle Orders aus; lokal vorgegebener Einsatz / Coin; kein echter Wallet-Swap.
- Vorhandener 30s-Exitmonitor überwacht nur von GPT beim Kauf gebundene Exit-Policies. Das ist kein autonomer lokaler SELL-Strategieagent.
- Historische Februar-Memecoin-Gewinner sind ausschließlich Rückblick/Benchmarks und keine Zukunftsdaten im Forward-Betrieb.

## Wesentlicher behobener Zählfehler
Die existierende lokale adaptive Forschung (runner/dynamic-research-scheduler.mjs) erstellt technische Vorrecherchen und eine Heuristikfrequenz 1/4/12/24, aber **keine wirklichen GPT-Modell-Reviews**. Diese Zähler dürfen nie als GPT-Vollscans ausgegeben werden.

Neuer separater Kanal:
`research/r29/channel/gpt-forward-review-status.json`

- `schema: sniper_r29_gpt_forward_review_status.v1`
- `source: GPT_MODEL_AUTHORED_REVIEW_INDEX`
- `utc_day`, `target_per_day` (4–24), `model_chosen_activity_level`, `model_cadence_reason`, `next_due_at_utc`
- `reviews[]`, jedes mit eindeutiger `review_id`, UTC-Abschluss, tatsächlich beobachtetem Quellzeitpunkt, originalem Git-Blob-SHA, unveränderlichem Erfahrungsjournalpfad, beobachteten und vom Modell geprüften Kandidaten sowie Modellaktion.
- Strikte UTC-Tagesgrenzen und mindestens 60 Minuten Abstand zweier gezählter GPT-Vollreviews.
- Das lokale Windows-GitHub-Kuriersystem liest den öffentlichen Status **nur lesend**, validiert ihn und speichert ihn in `%LOCALAPPDATA%/MemeSniperPaper/r29-isolated-sandbox/gpt-forward-status.json`.
- Die bestehende /api/dashboard/paper liefert einen nicht handelbaren, lokal bereinigten Status. UI zeigt GPT-dokumentierte Reviewzahlen, GPT-gesteuertes Tagesziel, Gründe, jüngste Reviews und nächste Fälligkeit **getrennt** von SCOUT-Scans und echten signierten Paper-Fills.
- Repository-Zuordnung ist **keine kryptografische Modell-Identitätsattestierung**. Fehlende oder veraltete Daten zeigen 0 nachgewiesene aktuelle GPT-Reviews.

## Konkreter Stand beim Anlegen
Heute ist ein vollständiger GPT-Modellreview um 06:24 UTC mit Quellenarchiv und drei näher geprüften Kandidaten dokumentiert. Andere reine Source-Checks werden nicht mitgezählt. Statusindex heute daher zunächst **1/4**, NICHT vier. Kein aktueller GPT-BUY und kein lokaler persönlicher PAPER_FILLED-Beleg. Der öffentliche Watch-Receipt vom 19.11. war keine Order.

## Rollout und Abnahme
V5.9 erfordert das erneute Einspielen der aktuellen Dateien aus dem kanonischen R29-Entwicklungsbranch auf dem Windows-Laptop. Nur GitHub-Merge/CI sind kein Windows-Installationsbeweis. Schutz lokaler `.local`/AppData-Paper-Kontodaten bei Update.
Tests: `node --test runner/gpt-forward-review-status.test.mjs`, bestehende Ubuntu/Windows Offline-Suite und Dashboard-Syntax-Checks.

## Noch nicht automatisch belegt
Der Index dokumentiert GPT-Recherchen, aber führt selbst keine Modell-Requests aus. Vier wirklich vollständig ausgeführte Modellreviews täglich, adaptive Neubewertung jeder Marktlage, rechtzeitige verifizierte BUY-/SELL-Orders und persönliche Fills müssen weiterhin durch tatsächliche Automationsausführungen, GitHub-Entscheidungsarchive und lokale Windows-Quittungen belegt werden. Sicherheitssperren dürfen zur Aktivitätsanzeige nicht umgangen werden.
