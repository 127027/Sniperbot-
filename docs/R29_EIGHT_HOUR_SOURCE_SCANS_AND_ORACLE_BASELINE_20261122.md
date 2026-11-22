# R29 – 8-Stunden-Auftrag: stündliche Research-Scans, Sicherheit, Oktober-Vergleich

**Freigabe:** Nutzer am 22.11.2026: zuerst D3-Sicherheit und originale 5-Dot-Belege verbessern, danach echten 29h-Backtest durchführen und ERST DANACH die Ergebnisse mit der 65er-Oktobergewinnerliste vergleichen; parallel für acht Stunden Source-Recherche mit bis zu acht stündlichen Scans und reproduzierbare Fehlerreparatur. PAPER ONLY, 5.000 TEST-USDC/50 TEST-USDC pro Coin, kein Echtgeld. **Branch:** `codex/r29-cleanroom-paper-20261121` in `127027/Sniperbot-`.

## 1. Grenze der tatsächlichen Freigabe

Der formale End-to-End-Backtest in `.github/workflows/cleanroom-v19-explicit-offline-request.yml` und `.github/workflows/cleanroom-v19-manual-backtest.yml` hat inzwischen ein zwingendes unabhängiges `--require-ready`-Gate. `src/v19-original-acceptance-release-gate.mjs` meldet aktuell **13/60** nicht-Backtest-Aufgaben PASS; 45 PARTIAL, 2 OPEN; Gesamtprojekt 13 PASS, 46 PARTIAL, 2 OPEN von 61.

Zusätzlich fehlen: unabhängige historische Oktober-Quellkohorte, vollständige alte Quote-/Available-Zeiten, echtes D3-04-Issuer-Vertrauen, echte D3-05-Sellability pro Pool/Chain, attestierte fünf GPT-Rollenereignisse, echte Windows-Paper-Client-Lot-/Fill-Quittungen und der erst **nach 25.11.2026 06:54 UTC** reife prospektive Holdout. Ein tatsächlich authentifizierter End-Backtest ist damit **vor Ende der kommenden acht Stunden nicht durchführbar**. Das Gate wird **nicht** gesenkt, nur um eine BUY-/Gewinnerliste zu erhalten. Kein neuer vollständiger QA-04-Test ausgeführt.

## 2. 8 stündliche LIVE-Research-Erfassungen ohne fünfte-Dot-Duplikate

Die fünf existierenden stündlichen Dot-Automationen bleiben **alle aktiviert und mit ihren bisherigen Zeitplänen**. Der Provider-Scan ist Dot 2, die Rolle Dot 5 führt forensische Code-/Source-/QA-Checks durch. Eine sechste Automation wurde versucht, aber die aktuelle Kontogrenze beträgt **fünf aktive Automationen**. Daher **keine bestehende Aufgabe pausiert oder überschrieben**, sondern die Prompts von Dot 2 und Dot 5 für genau diese acht Stunden ergänzt.

- Tatsächliches UTC-Stundenfenster: **22.11.2026 22:00 bis 23.11.2026 06:00 (Ende exklusiv)**.
- Acht geplante Dot-2-Wakes um ca. **xx:15 UTC**, die App darf leicht früher/später auslösen. Dot5 überwacht um ca. **xx:45 UTC** die dann vorliegenden echten Beweise.
- Keine zweite Scan-Automation, keine API-429-Umgehung, keine Erfindung historischer Oktober-GPT-Läufe.
- `src/v19-eight-hour-source-capture-audit.mjs` und `scripts/v19-eight-hour-source-capture-progress.mjs` prüfen **schreibgeschützt** jeden dieser acht Stunden-Buckets. Pro erfolgreichem Slot muss ein realer Dot2-Request vorliegen und der zugehörige Original-API-Capture eine positive geprüfte `capture-completion-verdict.json` sowie mindestens ein echtes Gecko HTTP200-Raw-Body mit SHA256 besitzen. Nur das zählt als **verifizierter begrenzter Source-Capture**. Nicht die ganze Welt, alle sechs Chains, ein echter GPT-Review oder ein lokaler Windows-Scan.
- Ergebnis lässt sich im tatsächlichen Node22-Cleanroom-Checkout mit `node scripts/v19-eight-hour-source-capture-progress.mjs` wiederholen. Der CLI schreibt **nichts** und führt keinen Backtest aus. Die echte Zahl wird nach jedem weiteren Dot2-Run fortgeschrieben; **nicht** vorab 8/8 behaupten.

### Erster nachgewiesener API-Run der Nacht

[GitHub Actions #45076917554](https://github.com/127027/Sniperbot-/actions/runs/45076917554) – **SUCCESS**, Original-Capture `research/feeds/2026-11-22/45076917554/`, abgeschlossen **22:18:01.614 UTC**. Abschluss `BOUNDED_SAMPLE_COMPLETE_COVERAGE_INCOMPLETE`, 1 geplante Seite HTTP200 (Gecko Base Seite 3) plus 6 DEX-Abfragen HTTP200, **0 HTTP-Fehler**, **18 neue Pools**, Memory **626 → 644 Pools**, echte Erstentdeckungen **217 → 235**, **0 Orders, 0 Client-Fills**, Quellbelege im `inflight-capture.json` mit sieben jeweiligen SHA256. Für die übrigen Chains bleiben offene Abdeckungsstellen.

## 3. Echter Fehler FP-04 – Dot2 aktualisiert Lauf-ID, aber nicht den Source-Snapshot

Im letzten echten Dot2-Capture wurde `research/latest/dot-2.json` nachträglich auf die aktuelle Run-ID **45076917554** und das aktuelle `evidence_path` umgestellt, enthielt aber im selben Datensatz noch **alte** `market_memory_stats.total_discovered=626` / `first_dot2_detected_count=217`, den alten Checkpoint `45070668194` und `full_contract_candidates=2`. Der unveränderte originale neue Feed meldete dagegen **644 / 235**, Checkpoint **45076917554** und **18** Full-Contract-Kandidaten.

**Behebung:** Den vorhandenen aktuellen Latest-Pointer per Git-Blob-CAS an die EXAKT übereinstimmenden `request_path`/`evidence_path`/`captured_at`-Originale des neuen Feed gebunden und Stats/Checkpoint/Handoff-Zähler übernommen, alte Stats/Checkpoint explizit in `prior_capture_* ` aufbewahrt. Das originale GPT-/Research-Journal und alle HTTP-Raw-Bytes blieben unverändert; kein weiterer Review oder Trade erfunden. `src/v19-dot-journal-inventory.mjs` erzeugt nun auch die Regression-Codes `DOT2_LATEST_SOURCE_STATS_STALE`, `DOT2_LATEST_SOURCE_CHECKPOINT_STALE`, `DOT2_LATEST_HANDOFF_COUNT_STALE` bei Wiederholung dieser Inkonsistenz. `test/v19-dot-journal-inventory.test.mjs` simuliert alle drei und prüft auch die neue echte Feed-/Pointer-Paarung. Dot2- und Dot5-Promptzusätze zur nachhaltigen Prävention sind gesetzt.

## 4. Vorhandenes Oktober-Baseline-Resultat und post-event 65er-Tabelle

Bereits **vor diesem Auftrag** existierte `research/backtests/2026-10-12/report.json` als alter **EVIDENCE_ONLY_BLIND_SHADOW** ohne zeitgerecht authentifizierte Pool-Snapshots, ohne echte historische GPT-Entscheidungen, **0** bestätigte BUY/SELL/Client-Fills. Das ist **nicht der neu beantragte Backtest** und beweist weder eine 0-%-Recallquote noch einen Gewinn von 0 im real handelbaren Markt.

Die einzige aktuell hier verfüg- und inspizierbare Originaltabellen-Ableitung ist `research/evaluation/2026-10-12/v19-winner-reference-identity-status.json`, abgeleitet von `R29_Memecoin_Gewinner_2026-10-12.xlsx`. Sie enthält **65** nachträglich gemeldete Kursanstiege über 100 %: **57 Namensmeldungen ohne überprüfbaren Pool**, **8 eingetragene Pool-Links**, von diesen **7 syntaktisch gültige und 1 ungültiger Solana-Base58-Pool**. Ungültig: `Crawlerpad (CRAWLER)` (Rang 31), in der Pool-ID ist ein nicht zulässiges kleines `l` enthalten. **Nicht raten oder die Quelle still korrigieren.**

`src/v19-oct12-oracle-postrun-baseline-comparison.mjs` vergleicht die **bereits archivalisierte** Source-Gap-Baseline mit der **erst anschließend** geöffneten Oracle-Tabelle. Die vollständige, SHA-pin-gerechnete 65-Zeilen-Ausgabe liegt unter `research/evaluation/2026-10-12/v19-source-gap-baseline-vs-65-reference-20261122.json`. Jede Zeile benennt Chain, Pool-ID oder UNKNOWN, berichtete Prozentbewegung, Identitäts-/Zeit-/Risikolücken und strikt **UNKNOWN_NOT_A_VERIFIED_FALSE_NEGATIVE**. Zusätzlich der **rein arithmetische, in Realität nicht handelbare** 50-TEST-USDC-Full-Movement-Wert: z. B. BNBCAT +50.327 % → theoretisch 25.213,50 TEST-USDC, **kein Bot-Gewinn**. Keine kumulativen PnL-Summen, keine Gewinner-Oracle-Daten vor/in einem historischen Blindtest.

Der vorgefundene CRAWLER-Link wurde bei der ersten neuen Vergleichs-Regression vom Parser zu Recht **zurückgewiesen**; der Vergleich selbst wurde deshalb **repariert**, sodass genau diese eine Tabellenzeile als `POOL_LINK_SYNTAX_INVALID` und nicht der ganze 65er-Vergleich als defekt erscheint. Das ist ein zusätzlicher belegter Input-/Datenqualitätsfehler. Eigener Test schützt die Erkennung.

## 5. Prüfergebnisse und Nachfolge

- [Tests #45076744928](https://github.com/127027/Sniperbot-/actions/runs/45076744928) und [#45076744921](https://github.com/127027/Sniperbot-/actions/runs/45076744921): 723/723 nach CRAWLER-Datenkorrektur.
- [Tests #45076881444](https://github.com/127027/Sniperbot-/actions/runs/45076881444) und [#45076881387](https://github.com/127027/Sniperbot-/actions/runs/45076881387): 727/727 nach Acht-Stunden-Source-Scan-CLI/Tests, jeweils 0 FAIL.
- [Tests #45077078914](https://github.com/127027/Sniperbot-/actions/runs/45077078914): 729/729 nach Dot2-Same-Capture-Inventur-Regressionsfix, 0 FAIL; weiterer V1.9-Workflow noch zu prüfen.
- Selbst bei vollständig grünen 729 Node-Tests bleiben D3-04, D3-05 und die ursprüngliche End-to-End-Sicherheitsabnahme ungeklärt. Diese Unit-Testzahlen sind **kein** Original-60/60-PASS.
- Die fünf Dots starten keine echten BUY/SELL-Orders, es wurden keine TEST-USDC verändert und `main` blieb unverändert.
- Dot5 soll beim **achten eigenen Wake** eine tatsächliche, durch GitHub-Belege gestützte Acht-Stunden-Abschlussmeldung senden; dies ist eine **beauftragte zukünftige Automation**, keine Behauptung, dass die Sitzung selbst acht Stunden weiterläuft.

**Priorität nach dem achtstündigen Datensammeln:** unabhängig authentifizierte Onchain-Risk-/Issuer- und Sellability-Proofs, genuine historische as-of-Kohorte und unabhängig geprüfte Windows-Paper-Receipts. Erst nach dem **nachweisbar grünen Original-Gate** einen neuen 29h-Backtest starten und diese 65er-Oracle-Tabelle ausschließlich post-run zum Kandidatenvergleich heranziehen.
