# R29 V2.5 – Historische Minutenkerzen zeitlich korrigiert, Dot2-Provider-Defer ehrlich behandelt

**Stand der empirischen Prüfung:** 23.11.2026, 21:16 UTC. **Branch:** `codex/r29-cleanroom-paper-20261121` in `127027/Sniperbot-`.

## 1. ORIGINALER archivierter Quellenbefund und Korrektur des Forschungsetiketts

Der frühere **retrospektive** neutral ausgewählte Solana-2-Pool-Quellenlauf [#45132577450](https://github.com/127027/Sniperbot-/actions/runs/45132577450), Artefakt **#14798357350**, enthielt OHLCV-Kerzen von TANK und ARIANA, die erst im November abgerufen wurden. Der archivierte Bericht nannte jeweils die um genau 02:00 beziehungsweise 18:00 UTC **gerade schließende** Minutenkerze `latest_eligible_closed_minute_candle_posthoc`. Das Forschungslabel war für einen kausalen Erstsnapshot mit konservativer **60-Sekunden-Kerzenfinalisierungsfrist** zu großzügig. Es war **kein** durchlaufener echter Dot4-Kauf und kein Beweis eines GPT-Zukunftslecks.

**Neuer echter GitHub-Actions-Quellentest:** [**#45267880220, SUCCESS**](https://github.com/127027/Sniperbot-/actions/runs/45267880220), **880/880 Tests bestanden, null Orders**. Er entpackte die ursprünglichen unveränderten SHA-fixierten HTTP-Bytes und rekonstruierte den letzten zum virtuellen Scanzeitpunkt mit 60 Sekunden Endabstand abgeschlossenen 1-Minuten-Schlusskurs.

| Ursprünglich neutraler Mint/Pool | Virtuelle Scanzeit | Altes `latest_eligible...`-Kerzenende (ohne Finalisierung) | Neu: spätestes forensisches Kerzenende mit +60s | Original RETRO-Close-Preis USD |
|---|---|---|---|---|
| TANK, Mint `3nXL1jYC4rTL9hWnEYz1w4WkbbKceFmb5jxX7RL5pump`, Pool `CTemNiKyDcmqrYMB2EF6fp4LcRprYm7LeCBoM14228sT` | **02:00 UTC** | 02:00 UTC | **01:59 UTC** (Kerze 01:58–01:59) | **0.00000467269559132973** |
| ARIANA, Mint `28FFbG2j5d5XGvyuLSdDixAgQnmN4YDZqmSVbbzJpump`, Pool `8TgpUYKfnG2UM43rFQMV9v3XRiciAqqDSp8BgXSBcq7P` | **18:00 UTC** | 18:00 UTC | **17:59 UTC** (Kerze 17:58–17:59) | **0.000007112871271722167** |

Die beiden alten 1-Minuten-Roh-HTTP-Dateien und das alte Crosscheck-JSON wurden **vor jeder Auswertung** über exakte SHA-256 geprüft:
- `r29-retro-gecko-45132577450/gecko-crosscheck.json`: `f3971e80cbf63bdcac15ea80606b417f0039b072d563d32d4d5e539cf0a05bbd`
- `source-http-02.txt` (TANK): `ae2cd3521a074aff3f9e25572bcc49354b7a749dffbf2cf166ca2721465df34b`
- `source-http-04.txt` (ARIANA): `9df3fa3e9de90a8f48ccfb923a42718e93ba020d6148062fb91990ce7b5b1ce3`

**Neu im Repository:** `src/v25-retro-two-pool-candle-finality-audit.mjs`, `test/v25-retro-two-pool-candle-finality-audit.test.mjs`, `scripts/v25-audit-pinned-two-pool-candle-finality.mjs` und `.github/workflows/cleanroom-v25-explicit-pinned-two-pool-candle-audit.yml`. Quellenaudit-Artefakt `r29-v25-retro-candle-finality-45267880220` auf der Run-Seite.

**Verbindliche Wahrheit:** Beide Preise sind **nachträgliche OHLCV-Schlusskurse**, **nicht** original am 12. Oktober vom Dot2-GPT gelieferte Preiswerte, **nicht** unabhängige tatsächlich ausführbare 50-TEST-USDC-BUY/SELL-Quotes. Für beide exakt **0** historisch bestätigte Buy-/Sell-Ausführungen, **0** Sellability-/Issuer-PASS, **0** clientseitige Fills. Der Finalisierungsabstand allein authentifiziert keine Anbieterlieferung.

## 2. Echte zusätzliche CI-Inkonsistenz: Dot2 hat die neue Abfrage aus Shared-API-Gründen bewusst verschoben

Während der freigegebenen **176-Mint-Recherche** [#45266204458](https://github.com/127027/Sniperbot-/actions/runs/45266204458) hat Dot2 um **2026-11-23 21:10:42 UTC** eine saubere Research-Entscheidung `NO_NEW_CAPTURE_REQUEST` mit einem SHA-gepinnten Forensikbericht gespeichert:

- `research/latest/dot-2.json`: `status=RESEARCH_WAKE_CAPTURE_DEFERRED_CONCURRENT_PROVIDER_DATA_GAP`, `capture_request_path=null`, `orders_created=0`, `paper_fills_claimed=0`, `authentic_gpt_review_receipt=false`.
- `research/audits/dot-traces/2026-11-23/20261123T211042Z-dot2-research/dot-2-discovery.json`: selbstberichtete GPT-Forschung ohne externe GPT-Ausführungsbestätigung; `gpt_run_identity=UNVERIFIED`; Git-Blob `47a7ff0adccb0e006113fb39664b742f5c13f284`.
- Der letzte Provider-Feed `research/feeds/2026-11-23/45258147195/evidence.json` blieb **unverändert**. Bei fehlendem neuen Request muss das Audit den Wiederverweis auf diesen alten Feed akzeptieren und **darf niemals** behaupten, eine neuere API-Capture sei vollzogen worden.

Die ursprüngliche GitHub-Unit-CI meldete dadurch zwei nicht mehr passende **Dot2-Pointer-Tests**. Wir haben die Tests **nicht deaktiviert**: Stattdessen wurde `src/v19-dot-journal-inventory.mjs` um eine **strikte zulässige Defer-Semantik** erweitert (genau diese Rolle, geprüfter Forensikpfad und SHA, kein Journal als GPT-Rechnung, kein neuer Request, keine Orders/Fills). `src/v19-dot2-capture-view.mjs` weist getrennt `current_wake_new_provider_request_created=false` aus. Die realen Pointer-Tests wurden für diesen konkreten Zustand präzisiert und um ein Negativbeispiel (fingierte Orders => unzulässig) ergänzt.

**[CI #45267756167, 880/880 PASS, 0 FAIL, 0 veröffentlichte Orders](https://github.com/127027/Sniperbot-/actions/runs/45267756167).** Dots wurden weder deaktiviert noch umgestellt, und der bisherige Zustand der Paper-Signale blieb unangetastet.

## 3. 176er-Quellenlauf – von diesem Befund unabhängig

Der ursprünglich syntaktisch fehlerhafte 176er-GitHub-Run [#45265825475](https://github.com/127027/Sniperbot-/actions/runs/45265825475) hatte **0** tatsächliche Provider-Abfragen durchgeführt und wurde behoben. Der korrigierte Run [**#45266204458**](https://github.com/127027/Sniperbot-/actions/runs/45266204458) ist der maßgebliche laufende reine **November**-Gecko-Quellencheck über die übrigen **176 von 192** neutralen Solana-Mints. Bei Erstellung dieser Notiz noch **in progress**; keine nicht verifizierten Erkennungszahlen behaupten.

Das Workflow-Artefakt `r29-v25-neutral-remaining-176-45266204458` enthält (nach Abschluss oder kontrolliertem Stopp) stündliche `checkpoint.json`, `planned-176-mints.json`, individuelle originale Provider-HTTP-SHA-Bytes und `final-audit.json`. Bei Rate Limits dürfen unversuchte/fehlgeschlagene Mints nicht als inexistent gelten. Die bisherigen **16/192** heute gefundenen Mint-/Pool-Zuordnungen sind echte Quellenbelege, aber **keine** historische 16/65-Erkennungsquote.

**Gesamt-Release-Gate weiterhin: 13/60 Nicht-Backtest-Aufgaben als PASS = 21,67%, acht externe Beweisblocker.** Der vollständige historische Fünf-GPT-Dot-Blindbacktest bleibt unbestanden; kein Echtgeld und keine neuen Paper-Client-Fills.
