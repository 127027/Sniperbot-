# R29 V4.1 – Entwickler-Erfahrungen, Fehlversuche und Wiedereinstieg für einen neuen Chat
> **NEUER ABSCHNITT 13 – PR #55 GEMERGT (17.11.2026):** Der nächste Entwicklungsschritt mit tatsächlichem lokalem GPT-Responses-API-Koordinator, einer **maximal 24/UTC-Tag** aufrufenden und marktabhängig 1/6/12/24 Analysen planenden GPT-Komponente, zeitlich unabhängig validierter Strategie-Wissensbasis und einem Postfreeze-Audit unbekannter Gewinner ist [in PR #55](https://github.com/127027/Sniperbot-/pull/55) umgesetzt. Merge-Commit `67a51e834d67ba1c1291fdec99fc85bf7a32db48`; [Win/Linux-Test auf finalem PR-Head](https://github.com/127027/Sniperbot-/actions/runs/44189588702) **erfolgreich**.
> **UNBEDINGT NÄCHSTES DOKUMENT LESEN:** [vollständige verbindliche Fortsetzung für System 1 / System 2 und frühe unbekannte Gewinner](R29_V4_1_PR55_EARLY_UNKNOWN_GPT_CONTINUITY_20261117_DE.md). Das Dokument dokumentiert Testergebnisse, Zwischenfehler, alle Codepfade, fehlende echte Anbieter-/Handelsnachweise und den nächsten sinnvollen Schritt. Es ist OPERATOR-INFORMATION und **darf nicht als historische GPT-Blindtest-Eingabe verwendet werden**.
> Die bestehende Windows-Anwendung hat zwei mögliche GPT-Zulieferer; bei bewusst optiertem lokalem, potenziell kostenpflichtigem `-WithCentralAI` ist GitHub nur Forschungs- und Statuskanal (keine zweite Paper-Orderquelle). Beim lokalen Modellmodus werden insbesondere **junge noch illiquide Pools** separat als GPT-WATCH-/NO_TRADE-Kandidaten bereitgestellt, ausdrücklich **nicht** als autonome Kaufberechtigung. **Keine** tatsächliche private Laptop-24/7-API-Kommunikation, **keine** echten GPT-BUY-/SELL-Trades, **keine** unabhängige 7+3-Backtest-Rendite wurden bisher nachgewiesen.
> Maschine-lesbare allgemein unabhängige Strategie-Erkenntnisse: `research/r29/strategy/validated-knowledge.json` – aktuell `entries=[]` (bewusst leer). Regel-Ladeprüfung: `runner/r29-strategy-knowledge.mjs`. Kein tatsächlicher unabhängiger Gewinnerbeweis wurde erfunden.

> **ABSCHLUSS-NACHTRAG – V4.1 PR #54 MERGED**
> [PR #54](https://github.com/127027/Sniperbot-/pull/54) ist erfolgreich nach Auflösung eines Git-Merge-Konflikts in START_HERE in den kanonischen Zweig übernommen. Merge-Commit `b32bf8e3e3c9953fa7c9737a2e4189b93edefe06`, final geprüfter PR-Head `50b13b962fe6b792b686cabafba2c41eb72646ae`.
> [Vollständige 17-Tage-Echtdaten-CI auf dem endgültigen PR-Commit](https://github.com/127027/Sniperbot-/actions/runs/44180592801): **SUCCESS**, beide Jobs (821.849 Tokenstarts, 2.296.466 Minutenmerkmale, 408 AS-OF-Frames, 4/4 POSTHOC-Gruppen). [Windows+Linux Paper-Gesamttests](https://github.com/127027/Sniperbot-/actions/runs/44180592858): **SUCCESS**. Der Merge hat alle 12 neuen V4.1-Dateien erhalten, und die zwischenzeitlich im kanonischen Zweig aktualisierte START_HERE sowie die laufenden Telemetrie-Channel-Dateien sind nicht überschrieben worden.
> [Jetzt maßgeblicher finaler Checkpoint](R29_LATEST_CHECKPOINT.json) und [unveränderlicher V4.1-Merge-Checkpoint](checkpoints/2026-11-17/R29_V4_1_PR54_MERGED_VALIDATED_CONTINUITY.json). Alte Angaben in diesem Bericht zu offenem PR/zu prüfendem CI sind durch den Nachtrag ersetzt. **Die 10 unabhängigen autonomen historischen GPT-Handelstests samt realistischen Fills bleiben NICHT abgeschlossen; keine Echtgeldfreigabe!**


**Erstellt 17.11.2026, 22-Uhr-Mitteleuropa-Zeit im laufenden Auftrag.** Dies ist der **kanonische, chatübergreifende Wissenstransfer** für den Sniperbot R29. Dieser Bericht ist ein OPERATIONS-Dokument mit historischen POSTHOC-Referenzen und **darf niemals als isolierter historischer GPT-Blindtest-Modellinput** verwendet werden. Keine privaten Kontonummern, Tokens, API-Keys oder Wallet-Daten in öffentliches GitHub aufnehmen.

## AUFGABE FÜR DEN NÄCHSTEN CHAT (zuerst lesen)

**Nicht von vorn beginnen.** Nutzerfreigabe für **V4 plus V4.1 ist GO**. Ziel ist **vollständige GPT-strategische End-to-End-Autonomie im Paper-Modus**: unvorher bekannte Memecoins aus allen verfügbaren Quellevents erfassen, technische Früherkennung und GPT-BUY/HOLD/SELL/NO_TRADE, Kaufbetrag und dynamische Exits bestimmen, 7 Entwicklungs- und 3 unabhängige Holdout-Backtests à 10 Handelstagen mit 7 Tagen Vorlauf und je 5.000 TEST-USDC sowie anschließend prospektiver Paper-Forward-Test. **Echtgeld bis zur separaten ausdrücklichen Freigabe verboten.**

- Repository: `127027/Sniperbot-`
- **KANONISCHER Zielbranch**: `codex/r29-chatgpt-github-paper-cycle-20261115`
- **OFFENER Implementierungs-PR**: [PR #54 – V4 Complete 48h Source + As-of Queue](https://github.com/127027/Sniperbot-/pull/54), Arbeitsbranch `codex/r29-v4-full-launch-48h-scope-20261117`.
- Bestehender EINZIGER Windows-Launcher `Sniperbot_Starten.bat` muss erhalten bleiben. **Keine parallelen Konten, Bots, Wallets oder Startdateien.** Lokale `.local`, `%LOCALAPPDATA%`, DPAPI-Credentials und Guthaben bleiben privat. Kein Echtgeld und keine lokalen echten User-Paper-Ledger-Änderungen durch historische Forschung.
- Aktueller zentraler Status: `research/r29/operations/R29_LATEST_CHECKPOINT.json`. Der Inhalt wird für jeden wesentlichen neuen Schritt nach GitHub aktualisiert. **Nach PR-Merge** neue Commit-ID und CI-Ergebnisse eintragen.

## 1. Was vor V4.1 wirklich bewiesen wurde

### Ursprüngliche Fehlersuche (nicht erneut als unabhängigen Blindtest zählen)

- Im Oktober 05.–11.10. Vorlauf, 12.–21.10. Handel wurden in Originalarchiven **821.849 Solana-Launch-Identitäten** registriert (davon 351.726 Vorlauf und 470.123 Handel). Historische Minutenzeilen für dieselben 17 Tage: **2.296.466**. Dies sind **aufgezeichnete Quell-Tokens**, kein Beweis von 821.849 echten handelbaren Memecoins oder vollständiger Erfassung aller Blockchains/DEXs.
- Alte Kandidatenlogik: vier feste stündliche Prüfungen (UTC ca. 06/12/18/00), jeweils maximal acht unter fünf Minuten alte Tokens. So erreichten **320 Mint-Adressen = ca. 0,068 %** der 470.123 Handelsstarts die damalige GPT-Recherche. **Nicht** alle wurden einzeln mit GPT bewertet; der alte Replay hatte null echte historische GPT-Calls.
- Eine vor dem späteren Namensvergleich eingefrorene **heutige** GPT-Review fand 2 WATCH, 318 technische Ablehnungen; keine nachgewiesenen historischen BUY-Fills oder PnL. Vorab-Freeze-Datei: `research/r29/operations/blind-october-2026/R29_OCT_320_MINT_GPT_BLIND_REVIEW_SEALED.json`, Commit `525446cc631b10cd40c80780a9d8dfca86a11060`.
- Erst **POSTHOC nach dieser Review** wurde das vollständige 17-Tage-Originalarchiv geprüft: PIERRE, FTR, Dacity und Trump $1 Coin (4 Gruppen, 6 konkrete recherchierte Contracts) existierten im Korpus, **0/4 Gruppen waren in der alten 320er-Stichprobe**. Hauptversagen war **VOR** GPT: zu seltene 5-Minuten-Scans und fehlende Tagesgrenzen-Watchlist. Sie waren daher **keine GPT-REJECTS**.
- Posthoc-Ursachenbericht: `research/r29/operations/blind-october-2026/R29_OCT_POSTHOC_FULL_SOURCE_RECALL_AND_ROOT_CAUSE_DE.md`. Er enthält nachträgliche Gewinnernamen und **muss strikt vom echten unvoreingenommenen GPT-Input ferngehalten werden**.

### Tatsächlich bestandener V4-Originaldaten-Test

- Bestehender [GitHub-Run 44164625844](https://github.com/127027/Sniperbot-/actions/runs/44164625844) hatte **grüne Gesamt-Abnahme** für die originale vollständige *Tokenstart*-Erfassung plus **erst anschließend** ausgeführten Referenzvergleich: **821.849/821.849 gültige Originalstarts**, 48h Quellenbeobachtung über Tagesgrenzen, **4/4 Gruppen und 6/6 exakte Contracts im neutralen Strom**.
- `research/replay-120d-real/r29-v4-complete-48h-source.py` liest nur originale `mint`, `creator`, `t0`, `launched_at` und prüft je Tages-Parquet SHA-256 (Revision `9b9a04e7e3e85775d614d16105daad2e69ce8544`, `loopholetape/pumpfun-launches`, ursprünglich nachträglich am 12.11. veröffentlicht). Datenbank-Ledger: `launches` (SQLite); per Tag alle gültigen Mints in `all-launches/*.jsonl.gz`. Es wird **nie nur eine 8er-Stichprobe** erfasst.
- `research/replay-120d-real/r29-v4-oct-posthoc-regression.py` hält die bekannten PIERRE/FTR/Dacity/Trump-Adressen nur in einem **separaten, nach Freigabe des neutralen Datensatz-Artefakts laufenden CI-Job**. Nie diese Namen in Collector-/Priority-Code hinzufügen.

## 2. V4.1: konkreter Ursache des ABBRUCHS von PR-54-CI

**[Run 44168485811](https://github.com/127027/Sniperbot-/actions/runs/44168485811) war `cancelled`, NICHT bestanden.** CI-Job `unbiased-complete-source-ingest` hatte `timeout-minutes: 30`. Er bereitete alle 821.849 neutralen Launches in etwa einer Minute erfolgreich auf. Anschließend verarbeitete `r29-v4-asof-feature-priority.py` alle archivierten Minutenzeilen, mit stetig zunehmender Laufzeit pro Tag. Im echten Log:

| Tag | Minutenzeilen | Join-Output (soweit fertig) | Log-Zeit / Auffälligkeit |
|---|---:|---:|---|
| 05.10. | 128.497 | 128.052 | in ca. 12 Sekunden |
| 06.10. | 142.057 | 142.009 | ca. 26 Sekunden |
| 09.10. | 135.539 | 135.508 | ca. 75 Sekunden |
| 10.10. | 128.279 | 128.245 | ca. 189 Sekunden |
| 11.10. | 121.882 | 121.855 | ca. 263 Sekunden |
| 12.10. | 137.969 | 137.938 | ca. 328 Sekunden |
| 13.10. | 134.864 | 134.851 | ca. 386 Sekunden |
| 14.–21.10. | — | — | nicht erreicht, Timeout 20:52 UTC |

**Ursache:** `review_at(conn,cutoff)` führte an **jedem** der 408 Stundencheckpunkte eine wachsende **SQLite-`JOIN launches × asof_feature_state`, `COUNT`, `ORDER BY score`, `LIMIT`** aus, obwohl pro Stunde nur relativ wenige Coins technisch qualifiziert waren. Die gesamte Quellmenge wächst über 17 Tage auf 821.849 Tokens. Das war ein Skalierungsfehler, kein Quell- oder Sicherheitsfehler. **Das Limit nur hochzusetzen wäre keine Lösung.**

**Implementierter Fix in PR #54:** Die unveränderlichen `launch_times`, beobachteten `expiry_cache`-Werte, neuesten `feature_cache`-Werte und eine nur aktuell qualifizierte `eligible_cache` werden inkrementell gepflegt. Die neue `review_at_cached(...)` prüft nur die qualifizierten aktiven Mints, sortiert deterministisch und liefert wie zuvor 64er-**Seiten mit Gesamtzählung**, nicht ein willkürliches Maximum von 64 Coins. SQLite bleibt der persistente as-of-Forschungskandidatenbestand, aber ein Volluniversum-JOIN bei jedem Stundencheck entfällt. Ein dedizierter Unit-Test vergleicht **alle Seiten exakt mit der langsameren ursprünglichen SQL-Ausgabe**, weitere Tests prüfen Future-Hour-Leakage. **Vor Echtlauf nicht als erfolgreich deklarieren:** Für den *finalen* PR-Commit echten 17-Tage-Quellendatendurchlauf, 408 as-of Stundenframes, 2.296.466 Minutenzeilen, Quell-SHA und beide CI-OS durchlaufen lassen; erst dann PR #54 mergen.

**WICHTIG ZU NEUEN RUNS:** GitHub `pull_request` und `push` haben in der bisherigen Workflow-YAML teils denselben schweren Test mehrfach parallel gestartet. CI-`cancelled` oder altes grünes CI auf anderem Commit zählt nicht für den aktuellen PR-Head. Optional CI auf einmaligen PR-Run und Concurrency standardisieren; nur erfolgreichen **aktuellen HEAD-SHA** übernehmen.

## 3. V4.1: Nach 48h bei ECHTER neuer Aktivität reaktivieren

- Das neutrale Launch-Ledger löscht ausgelaufene Mints **nicht**. `source-only-48h.sqlite` hält die originale Chain/Mint/Creator/T0 für jederzeitige Wiedererkennung.
- Bei einem späteren *ersten neuen, zeitlich echten as-of Feature-Update* mit **mindestens fünf zusätzlichen aufgezeichneten Käufen gegenüber der letzten bekannten Vergleichsbeobachtung** und einem aktuellen technischen Positiv-/Risiko-Gate darf eine abgelaufene Beobachtung wieder `MONITORING_SOURCE_ONLY` werden. Ein Rug-/Bundle-Dump-Flag oder fehlendes Signal blockiert. Der lokale Collector trifft **keine** BUY-/SELL-Strategie!
- Verlängerungen mit neuer Aktivität sind mit Beobachtungszeit, vorherigem/neuem Ablauf und Grund in `research_retention_events` protokolliert; nach dem Ablauf explizite `research_reactivations`. Die Spätaktivität kann auch früher abgelehnte Coins wieder in **mögliche GPT-Recherche** bringen; das ist kein vom Modell erzeugter Kauf. Die Quellen liefern teils nur `f_n_buys`, keine nachgewiesene globale Käuferdiversität oder volle Wallet-Flow-Qualität.
- Historische `candidate_asof`-Abfragen berücksichtigen **nur Retentionsereignisse, deren Beobachtungszeit <= der simulierte Abfragezeitpunkt ist**. Ein späteres Wiederaufleben darf nicht die Vergangenheit verändern. Tests: vor 48h, nach Ablauf, nach erneuter Kaufaktivität, riskantes Spätereignis und historische Zeitreise-Abfrage.

## 4. V4.1: GPT als strategischer Verantwortlicher, ohne unechte Entscheidungen

- GPT hat ALLEIN strategische Autorität über `BUY/HOLD/SELL/WATCH/NO_TRADE`, Coins, Entscheidungsfrequenz (1–24 echte Vollanalysen pro Tag), Einsatz 50–5.000 TEST-USDC im verfügbaren isolierten Paper-Budget, Exits. Collector priorisiert nur technisch und darf bei belegten Gefahren Orders vetoen.
- Alte V4-Archivframes enthalten bei den Oktober-Tests `gpt_model_calls=0`, `paper_buy_fills=0`, `paper_sell_fills=0`, `realized_pnl_test_usdc=null`. **Genau so lassen.** Technische Score-/SQL-/Offline-Test-Outputs dürfen niemals zu angeblich echten Modellentscheidungen hochgezählt werden.
- Für reale GPT-Entscheidungen wird ein **isolierter Modellaufruf** mit extern überprüfbarer Provider-Request-/Response-Identität, Zeit, as-of Input-Hash, Modell-ID, signierter autorisierter Ordernachricht und unveränderlichem Receipt benötigt. Ein bloßes JSON `GPT=true` oder ein lokaler deterministischer Python-Proxy reicht NICHT. Die Nutzerbenannten Gewinner und diese Kontextdatei dürfen nicht in einen historischen Blindmodell-Prompt gelangen.
- `research/replay-120d-real/r29-v4-holdout-evidence-gate.py` verifiziert strukturelle Pflichtnachweise und verweigert `PASS` ohne extern **tatsächlich** geprüfte Model/Order/Quotes-Reconciliation. Das Skript selbst authentifiziert nicht automatisch den externen Provider; diese Prüfung muss separat erfolgen. Tests mit klar gekennzeichneten synthetischen Fixtures beweisen nur die Fail-Closed-Regeln.

## 5. Vorab fixierte Erfolgskriterien für drei unberührte Holdouts

Nach 7 Entwicklungsfenstern erfolgen 3 unabhängig gewählte **10 Handelstage + 7 Vorlauf**, je 5.000 TEST-USDC isoliert, ohne Parameteränderung im Holdout. Die quantitative Policy ist als [JSON](R29_V4_1_PRE_REGISTERED_HOLDOUT_SUCCESS_POLICY.json) vorab registriert. Für `PASS` unter anderem erforderlich:

- Captured valid source IDs **>=99,99 %**, keine verwechselten Mints und keine verdeckten Quelldatenlücken.
- Technische Erkennungslatenz P95 **<=5 Minuten** ab **nachweisbarer damaliger Datenverfügbarkeit**, GPT-Prüfung relevanter Kandidaten P95 **<=60 Minuten**; historische Eventzeiten allein beweisen das nicht.
- Unabhängig und erst nach eingefrorenen Entscheidungen definierter `2× netto innerhalb 24h`-Ausbruchs-Benchmark, unabhängig belegter Preisverlauf und tatsächlich handelbare bidirektionale Quotes: mindestens **30 objektiv verifizierte Ausbrüche**, **Recall >=60 %**, **Precision >=20 %** für die GPT-Research-Signale. Fehlalarme entsprechend ausweisen, vollständiger nichtselektierter Universums-Nenner ist Pflicht.
- Drei Holdouts zusammen **positiver realisierbar simulierter Netto-PnL** nach Gebühren und Slippage; mindestens **2/3 Einzeltests positiv**; maximaler Drawdown pro Test **<=20 %**, maximale Tagesverlustgrenze **<=5 %**.
- **Fehlende Datennachweise oder unzureichende Ereignisanzahl -> `INCONCLUSIVE`, nicht Gewinn/Verlust oder bestandener Backtest.** Die Werte sind vorregistrierte Abnahmekriterien, nicht nachgewiesene Ist-Werte. Sie dürfen nicht nach Ansicht der Holdout-Resultate angepasst werden.

## 6. Ehrliche Datenlage der zehn gewünschten Backtests

- Original Solana-Startdatensatz `2026-08-31` bis `2026-11-05`: **67 Kalendertage** einschließlich eines teilweise erfassten ersten Tages. Minutenmerkmale nur für **43** Daten-Tage `2026-09-24..2026-11-05`. Für **10 nichtüberlappende Handelstests à 10 Tage plus mindestens eine 7-Tage-Vorlaufperiode braucht man insgesamt mindestens 107 fortlaufende Kalendertage**, selbst wenn frühere Handelsperioden als nächste Vorbereitungsphase erneut mitgenutzt werden.
- Das **echte** `r29-v4-test-window-planner.py`-Output des 17.11.-Runs **44168485811** meldete **5** vollständig pin-belegte 17-Tage-Quellenfenster und **3** davon mit sämtlichen historischen Minutentagen. Frühere theoretische Berichte sprachen von sechs 17-Tage-Fenstern; der Unterschied liegt in tatsächlicher Source-Coverage und dem nur teilweise belegten ersten Kalendertag. **Echte aktuelle Prüfmatrix geht vor vereinfachten Schätzungen**.
- Die Herbstwochen wurden schon mehrfach von GPT und den Nutzern analysiert; sie sind nicht erneut als 'unberührte' autonome Gewinn-Holdouts verwendbar. Für zehn echte historische Tests zusätzliche unverbrauchte, originale as-of zeitlich vertrauenswürdige **Multichain-**Marktdaten + realistische ausführbare Kauf-/Verkaufsquotes beschaffen. Falls unmöglich: unabhängigen künftigen Forward-Paper-Plan vorregistrieren, keine Gewinnerlisten rückwärts fitten.
- Kein unabhängiger 10×10-Tages-GPT-Trade-Fill-/PnL-Nachweis. Bestehende Solana-/Jupiter-Read-only-Previews zeigen keine historisch ausführbaren 50–5000 USDC Roundtrips.

## 7. Reihenfolge ohne unnötige neue Systeme

1. **PR #54** am aktuellen Commit prüfen, bisherigen `cancelled`-Status nicht schönreden. Neu optimierten echten 17-Tage-Minuten-Join auf frischem erfolgreichen GitHub-Actions-Run prüfen; gleichzeitig PR-Head und Windows/Linux Paper-CI. Erst dann mergen.
2. Post-48h-Reaktivierung technisch gegen die vollständige unverfälschte Quelle mit unveränderten Regeln testen, ohne die vier bekannten Sieger zu bevorzugen; as-of-Integrität und 64er Seiten ohne Verluste belegen.
3. Für jede tatsächliche GPT-Entscheidung echten extern nachgewiesenen Model-Call mit Prompt-Digest und signierter autorisierter Paper-Order erfassen; zunächst Research/NO_TRADE und dann BUY/SELL mit korrekt belegbaren historischen Quotes, **kein** Echtgeld.
4. Quellendaten für zusätzliche sieben Entwickluns-/drei nie gesehene Holdouts erwerben oder aus frei zugänglichen Originalarchiven belegen; Quelle, event-time, available-at-time, SHA-256 und 2-way Ausführungssimulation getrennt prüfen.
5. Die quantitative Policy strikt vor Holdout 8 committen und unangetastet lassen; alle False Positives, Misses, Drawdowns und Stop-Events berichten.
6. Erst nach glaubwürdiger unabhängiger positiver historischer Handelsbilanz mit der **unveränderten** Strategie prospektiven Paper-Forward-Test ausführen. Echtgeld bleibt bis zur neuen ausdrücklichen Freigabe gesperrt.

## 8. Relevante Pfade / Beweiskette

| Bedeutung | Pfad / Link |
|---|---|
| Start und chatübergreifender Einstieg | `SNIPERBOT_R29_START_HERE.md` |
| Aktuellster Status / PR-SHA / nächste Aufgabe | `research/r29/operations/R29_LATEST_CHECKPOINT.json` |
| PR V4/V4.1 mit Python und CI | https://github.com/127027/Sniperbot-/pull/54 |
| Erstes grünes Oktober Originaldaten-CI | https://github.com/127027/Sniperbot-/actions/runs/44164625844 |
| Echtdaten-CI Abbruch nach 30 min | https://github.com/127027/Sniperbot-/actions/runs/44168485811 |
| Full neutral all-launch source | `research/replay-120d-real/r29-v4-complete-48h-source.py` |
| Fast as-of feature ranking / revival | `research/replay-120d-real/r29-v4-asof-feature-priority.py` |
| 10 Fenstersource-Plan | `research/replay-120d-real/r29-v4-test-window-planner.py` |
| Separate Oktober-Namensdiagnose POSTHOC | `research/replay-120d-real/r29-v4-oct-posthoc-regression.py` |
| Honest holdout-assertions und Tests | `research/replay-120d-real/r29-v4-holdout-evidence-gate.py` |
| Vorregistrierte Erfolgsschwellen (V4.1) | `research/r29/operations/R29_V4_1_PRE_REGISTERED_HOLDOUT_SUCCESS_POLICY.json` |
| Hauptbericht laufender V4-Implementierung | `research/r29/operations/R29_V4_NEUTRAL_48H_DISCOVERY_EXECUTION_GAP_20261117_DE.md` |
| Technische Testaktion | `.github/workflows/r29-v4-complete-capture-oct.yml` |
| Testbibliothek | `research/replay-120d-real/test_r29_v4_*` |
| Älterer Oktober-Quellenaudit | `research/replay-120d-real/results/R29_OCT05_21_BLINDTEST_READINESS_REPORT_20261117_DE.md` |
| Nachträglicher bekannter Gewinner-Verwechslungsnachweis | `research/r29/operations/blind-october-2026/R29_OCT_POSTHOC_FULL_SOURCE_RECALL_AND_ROOT_CAUSE_DE.md` |

### Abschlusszustand dieser Erfahrungsdatei

**V4.1 ist eine laufende Entwicklung, nicht abgeschlossen.** Die oben als *grün* gekennzeichneten Teile sind durch konkrete frühere CI-Runs belegbar; neu optimierte Vollmarkt-Minutenanalyse, tatsächliche GPT-Strategieentscheidungen, zehn unabhängige Backtests, PnL und spätere Paper-Forward-Orders gelten erst nach ihrem eigenen ausdrücklichen evidenzbasierten Beweis als erledigt. **Keine automatische Echtgeldfreigabe.**
