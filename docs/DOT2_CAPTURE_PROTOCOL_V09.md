# R29 V0.9 – Echte Dot2-JSON-Erfassung und Übergabe an Dot3

## Arbeitsweise (nur Cleanroom, PAPER_RESEARCH_ONLY)

Die fünf bestehenden ChatGPT-Dots bleiben stündlich gestaffelt. Die zusätzliche GitHub-Action ist **kein neuer Trading-Bot**: Sie empfängt eine kleine Dateianforderung, ruft kostenlose öffentliche GeckoTerminal-/DEX-Screener-JSON-Daten ab und legt echte Rohantworten dauerhaft im isolierten Branch ab. Keine Wallets, keine Echtgeldorders, keine Tokens bei externen Bezahl-APIs.

**Dot2 bei jedem tatsächlichen stündlichen Lauf:**
1. Lies `research/feeds/latest.json` und, wenn vorhanden, dessen `handoff_path` und `evidence_path`. Nutze genau diesen Branch, niemals `main`. Alle Antworten haben tatsächliche Abrufzeiten.
2. Starte **genau einen** Erfassungswunsch durch Erstellen von `research/requests/YYYY-MM-DD/<UTC>-dot2-<runid>.json`, mit folgendem JSON-Schema:
```json
{"schema":1,"kind":"DOT2_DISCOVERY_CAPTURE_REQUEST","mode":"PAPER_RESEARCH_ONLY","requested_by":"dot-2-discovery","created_at_utc":"<echte ISO-UTC-Zeit>","networks":["solana","base","ethereum","bsc","robinhood","cronos"],"max_gecko_requests":1,"max_dex_pairs":6,"do_not_publish_orders":true}
```
3. Erstelle nur **diese eine Request-Datei** mit GitHub `create_tree` + `create_commit` + `update_ref(expected_sha=current_head)`; bei CAS-Konflikt HEAD neu lesen und EINMAL sicher wiederholen, niemals force-push. Das `push`-Ereignis startet `.github/workflows/cleanroom-dot2-capture.yml` auf **diesem** Branch.
4. Die Action speichert Rohantworten und `evidence.json` unter `research/feeds/YYYY-MM-DD/<GitHub-Run-ID>/`, dazu `dot2-to-dot3-handoff.json` sowie `research/feeds/latest.json`. Jede Rohquelle enthält URL, eigene HTTP-Start/Endzeit, HTTP-Status und SHA-256 ihrer ungeänderten Bytes. Git-Blob-SHA bitte erst durch GitHub `fetch_file` separat validieren.
5. Lies den frisch eingetroffenen `handoff_path`, sobald er tatsächlich vorliegt. Wenn die Aktion noch läuft, notiere `CAPTURE_PENDING` und lies den Feed beim nächsten Schritt erneut. Alte Feeds **nicht** als aktuelle Kaufquotes behandeln. Bewahre die übrige HTML-Discovery mit vollständiger, unveränderlter Pending-Queue weiter bei.
6. Schreibe Dot2-Journal und `research/latest/dot-2.json` mit Quellenpfaden, `source_run_id`, tatsächlich bekannten Vollcontracts und Fehlern. Das Erstellen des Feeds macht eine Dot2-Rollenanalyse nicht überflüssig.

**Dot3 bei jedem Wake um :25:**
- Lese `research/feeds/latest.json`, `handoff_path` und `evidence_path`, validiere den Pfad und bei Bedarf die Rohquelle/Git-SHA. Vor **jedem** aktuellen Risikoeinsatz prüfen: `captured_at_utc` darf nicht in Zukunft liegen und höchstens 10 Minuten alt sein; alte Treffer bleiben nur Beobachtungs-Queue.
- Unterschiedliche Status bleiben getrennt: `SINGLE_PROVIDER_CONTRACT_ONLY` (vollständige Adresse aus DEX-Screener für alten Dot2-Pool), `POOL_IDENTITY_ONLY_NEEDS_RISK_CHECK`, `PRICE_DISAGREEMENT`, `TWO_DOMAIN_PRICE_LIQUIDITY_PROVISIONAL`.
- Eine unabhängige Kursübereinstimmung beweist **keine** Token-Sellability oder Sicherheit. Keine Risk-ELIGIBLE oder Dot4-BUY, bevor Steuern, Token-Sellbarkeit, Liquidität und passende Chain+Pool+Contract unabhängig ausreichend geprüft wurden.

**Dot4 um :35:**
- Neue Kandidaten nur über tatsächlich von Dot3 akzeptierte Sicherheits- und aktuelle Quotenbelege kaufen; sonst WATCH/NO_TRADE mit präzisem Gate. Dot2-Feed von :15 ist um :35 bereits rund 20 Minuten alt: **niemals als frische Orderquote verwenden**. Frische selbst geprüfte Webquotes/Quellenbelege innerhalb des bestehenden 10-Minuten-Limits vor Orderpublikation erforderlich; 5-Minuten-Gültigkeit beachten.
- Offene bestätigte Positionen wie bisher stündlich auf SELL/HOLD prüfen. Experimente/BACKTEST-Orders bleiben strikt getrennt.

**Dot1 / Dot5:**
- Dot1 kann reale neue Pools pro beobachtetem Fenster zählen, sofern ≥2 tatsächlich datierte aufeinanderfolgende Stichproben vorliegen; eine einzelne Seite ist noch keine Stundenaktivität. Bei 429 ist Marktaktivität UNBEKANNT statt ruhig.
- Dot5 protokolliert `request → Action Success → raw snapshots & hashes → full contracts → matched independent quotes → Dot3 eligible → Dot4 published → client receipt` als getrennte Zähler je Stunde. Keine `PAPER_FILLED` ohne echten Client-Receipt.

## Nachweis des ersten manuellen Smoke-Tests

GitHub Action [44927958957](https://github.com/127027/Sniperbot-/actions/runs/44927958957) schrieb `research/feeds/latest.json` und 7 originale HTTP-Quellen in den Branch. Auf Base: 4 neue Pools mit 4 kompletten Contracts; weitere 4 frühere Dot2-Pools erhielten vollständige Verträge aus einem einzelnen DEX-Anbieter. Von 6 tatsächlich beantworteten DEX-Paarprüfungen waren **nur 2** ein Abgleich eines bereits vollständig in GeckoTerminal dokumentierten Base-Pools; einer hatte Preisabweichung ~1,37%, der andere ~4,91% (Ablehnung). Vier weitere waren reine einseitige Contract-Rekonstruktionen. Das System hat 0 autorisierte BUY-Orders erzeugt.

## Risiken und Abdeckung

Die kostenlose GeckoTerminal-API kann mehrfach HTTP 429 liefern, deshalb max. 1 Gecko-Page und max. 6 DEX-Detailaufrufe pro Request; die sechs Chains rotieren nach GitHub-Run-Nummer. Die Action arbeitet nur, wenn der **bestehende Dot2** einen Request auf dem Cleanroom-Branch erstellt. GitHub Actions `schedule` auf diesem Branch ist ohne Änderungen an default/main nicht möglich. Quoten und Ausführung können bei stündlichen Intervallen verpasst werden; die Pipeline ist kein Sekunden-Sniper und keine Vollmarktgarantie.
