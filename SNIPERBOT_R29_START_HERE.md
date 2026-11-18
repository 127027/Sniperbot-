# R29 V4.5 – Aktueller Einstieg für künftige ChatGPT-/Codex-Sitzungen

**Zuletzt inhaltlich verifiziert: 18.11.2026.** Zuerst [KANONISCHEN WISSENSSTAND V4.5](research/r29/operations/R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md), [AGENTS](AGENTS.md) und [aktuellen Checkpoint](research/r29/operations/R29_LATEST_CHECKPOINT.json) lesen. Alle unten erhaltenen V4.4/V4.3/V4.2/V4.1-Stände dokumentieren damalige Erkenntnisse und sind **keine selbständigen aktuellen Handlungsanweisungen**; ältere Aussagen zu lokalem OpenAI-Key, altem Windows-Starter, altem stale GitHub-Marktfeed oder fehlender GitHub-Verbindung sind durch V4.5 **überholt**.

**Verbindlicher Betrieb:** bestehender ChatGPT-R29-Forward-Task + separates historisches R29-Blindreplay (keine neuen Automationen) → vorhandener GitHub-Kurier → bestehender Windows-Paper-Executor. **PAPER_ONLY**, `Sniperbot_Starten.bat` ohne Parameter, **keine lokal bezahlte OpenAI-API**. `central_ai.enabled:false` ist erwarteter Altsystemstatus; `github_gpt_courier`/`/api/gpt/paper/status` ist ausschlaggebend.

**Belastbarer Laptop-/GitHub-Stand:** Windows 14:30:57 UTC 64 Pools, 16 Headlines, Publisher-Commit `5037000270707e53471e9a8eb32897231f7f6155`, kanonischer Feed mit 64 Pools und 24 Alerts bestätigt; nach zwischenzeitlich gestopptem Bot Windows 15:12:38 UTC wieder 47 Pools und 16 Headlines, signierter isolierter Paper-Test bestanden. GPT-GitHub-Status `local_gpt_bridge_ready:true`, `gpt_follow_enabled:true`, `paper_bot_enabled:true`, `received_decision_count:8`; letzte `gpt_e7c715480f009a0dd80040fa78c186a7` bestätigt als **NO_TRADE**, `origin_model_signature_verified:false`, kein nachgewiesener GPT-BUY/SELL, keine GPT-Position in letzter veröffentlichten Context-Datei. Ältere R28-Ausgaben ohne `github_gpt_courier` stammen möglicherweise noch aus dem Nutzerordner vor vollständiger V4.4-Aktualisierung.

**Nicht erneut bauen:** Paging-Fix (PR #56: 310.540/310.540, 5.054 Seiten), Canonical Relay, Windows-Collector, GitHub-Transport, Receiver, UI, neue Bots, API-/PayPal-Schnittstelle. **Offen:** tatsächliche prospektive GPT-Automationsentscheidung mit Herkunft → signierter Receiver-Receipt; sicherer kontinuierlicher signierter positionsgebundener Exit-Guard vor jedem neuen BUY; anschließend BUY→HOLD→SELL im privaten Paper-Konto belegen. Die 10 historischen Blindtests und Quellenlücken (241.649 Mints ohne Minutendaten) isoliert und ohne Gewinner-Leakage behandeln.

**Versionsregel:** Jede neue Behauptung mit GitHub-/Windows-Zeitstempel, SHA und CODE/CI/WINDOWS/GITHUB LIVE/CHATGPT TURN/OFFEN kennzeichnen. Ein Repo-Commit patcht keinen laufenden Laptop. Langfristige Entwicklung exakt am offenen Exit-/Model-Receipt-Blocker fortsetzen.

---

## Archivierte R29-Zwischenstände, chronologisch erhalten (nur datiert auswerten)

> **18.11.2026 – NEUE VERBINDLICHE R29 V4.4-ARCHITEKTUR: CHATGPT + GITHUB, KEINE ZWEITE OPENAI-API.** [R29 GitHub-only Betriebsbeschreibung](research/r29/operations/R29_V4_4_GITHUB_ONLY_NO_LOCAL_OPENAI_API_20261118_DE.md). Der lokale kostenpflichtige `-WithCentralAI`-Start samt API-Key-Abfrage und direkte Responses-API-Aktivierung werden aus dem **regulären Windows-/Serverpfad** entfernt. Einziger strategischer Kanal ist der vorhandene ChatGPT-GitHub-Kurier; bestehende Forschungsautomationen statt neuer Bots. **Erfolg tatsächlich belegt:** 18.11.2026 14:30:57 UTC, 64 frische Pools + 24 Forschungs-Alerts auf dem alten und kanonischen Research-Branch, Source-Health `CANONICAL_RESEARCH_FEED_RECENT`. `central_ai.enabled=false` ist in diesem GitHub-only-Modus normal und KEIN Defekt. **Noch nicht bewiesen:** tatsächlicher neuer autonomer ChatGPT-Entscheid → signierter und vom Laptop empfangener BUY/SELL mit echtem Paper-Fill. Kein zusätzlicher API-Key, kein Löschen vorhandener DPAPI-Dateien, keine neuen Käufe vor nachgewiesenem GPT-autorisierten dauerhaften Exit-Schutz. Historische V4.3-`-WithCentralAI`-Hinweise sind ab jetzt **überholt**.
> **R29 V4.3 – BESTÄTIGTE GPT-ONLY-ROLLEN / EREIGNISBRÜCKE, 18.11.2026:** [PR #58](https://github.com/127027/Sniperbot-/pull/58) mit Merge `d959b0f7695892e91f7d495d6a680cb7495b5e39` und [grünem Windows-/Linux-CI](https://github.com/127027/Sniperbot-/actions/runs/44317312613). Lokaler Legacy-Worker erzeugt keine eigenständigen neuen BUYs mehr; signierte GPT-SELLs funktionieren trotz pausierter neuer BUYs. `r27-early-bridge.mjs` reicht jetzt original **validierte event_id/event_type** bis zur vorgezogenen GPT-Prüfung durch (PR #57 allein hatte diese Signale noch nicht wirklich erhalten). ACHTUNG: `GPT_GUARD` war bisher nur globaler Legacy-Stop, keine GPT-signierte positionsgebundene Exit-Policy; ungefragte globale GPT-Exits sind gesperrt, **kontinuierlicher GPT-Positionsschutz fehlt noch**. **Echte GPT-Provider-Aufrufe, unbekannte Coin-BUY/SELL-Fills und frischer Laptop-Marktfeed weiterhin nicht belegt.** [Exakte Ursachen, Tests und Fortsetzung](research/r29/operations/R29_V4_3_GPT_ONLY_ROLES_AND_LIVE_EVIDENCE_20261118_DE.md). Nur PAPER_ONLY, historische Simulation isoliert, Echtgeld verboten. Dieses Dokument ist OPERATOR-/POSTHOC-KONTEXT, niemals Blindmodell-Input.

> **R29 V4.3 – ERSTER ZIELGERICHTETER SCHRITT, 18.11.2026:** [PR #57](https://github.com/127027/Sniperbot-/pull/57) mit Merge-Commit `d0215a0ea75c9a4504e650e66d3b6d16e280e97a` und [grünem Windows-/Linux-CI 44269024075](https://github.com/127027/Sniperbot-/actions/runs/44269024075) ergänzt den BESTEHENDEN lokalen GPT-Koordinator um einen 5-Minuten-Quellenpoll und ereignisgesteuerte, gegen Dubletten und Frische abgesicherte Modellaufrufe. Die Grenze von 24 GPT-Versuchen/UTC-Tag bleibt. **Dies ist KEIN nachgewiesener 5-Minuten-GPT-Trade und kein Laptop-Rollout.** Quellenqualität, 241.649 fehlende Minutenmerkmale, laufender Positionsschutz und echte GPT-BUY-/SELL-Receipts bleiben offen. **[V4.3-Teilstand und zwingende nächste Schritte](research/r29/operations/R29_V4_3_EVENT_GATED_MODEL_POLL_20261118_DE.md).** Historische Tests bleiben isoliert; Echtgeld gesperrt. Diese Datei ist OPERATOR-/POSTHOC-KONTEXT und darf nie einem historischen Blindmodell vorgelegt werden.

> **KANONISCHE FORTSETZUNG – R29 V4.2 (18.11.2026): PAGING-VERLUST NACHWEISLICH BEHOBEN.** [PR #56](https://github.com/127027/Sniperbot-/pull/56) gemergt, Merge-Commit `8ad1220cb789d95204aa79f9834c056344f23109`. **[Neuen vollständigen technischen und strategischen Befund unbedingt zuerst lesen](research/r29/operations/R29_V4_2_VOLLSTAENDIGER_KANDIDATENTRICHTER_20261118_DE.md).** Echt-Oktober-Replay: **310.540/310.540 technisch geeignete Kandidaten-Prüfzeitpunkt-Paare**, 5.054 vollständige Seiten statt nur Seite 0, 408 Stundenframes, **0 Paging-Verluste**, alle 2.296.466 Merkmalsereignisse mit technischer Begründung, [grüner Real-Source-CI](https://github.com/127027/Sniperbot-/actions/runs/44265274289). 241.649 historische Mints ohne zugeordnetes Minutenmerkmal bleiben DATENLÜCKE, nicht als technische GPT-Ablehnung ausgeben.
> **WICHTIGE HINDSIGHT-GRENZE:** Erst NACH Quellenfreeze bekannte Contracts geprüft: **FTR** 15.10. 01:59:28 UTC gestartet, 02:00:35 technisch geeignet, 03:00 auf Seite 7/Rang 460 und erstmals potenziell in neutraler GPT-Recherchequeue – das sind 60,526 Minuten, **kein** tatsächlicher damaliger GPT-Aufruf. Beide PIERRE-Contracts wegen Pool-/Bundle-Risikoflags, Dacity-/Trump-Contracts wegen fehlender Käufer-/SOL-Reserve-Signale nie technisch geeignet. Bei **allen sechs** historische GPT-BUY-/SELL und Fills weiterhin NULL/NICHT NACHGEWIESEN; keine Gewinnerlisten in historischen GPT-Prompts.
> **TATSÄCHLICHE HEUTIGE GPT-FORSCHUNGSBEWERTUNG:** [16 maskierte neutral ausgewählte Kandidaten](research/replay-120d-real/reviews/2026-11-18-v4-2-01h-masked-complete-page-actual-gpt-decision.json) aus dem 12.10. 01:00 UTC-Frame, davon **14 von zuvor nicht exportierten Seiten**; aktuelle GPT-6-Konversation: **6 WATCH, 10 NO_TRADE, kein BUY/SELL**. Im Commit `af9325ea668889f8fd0b97599313935d4400fed9` VOR Identitätsentsiegelung gesichert. **Keine unabhängige Blindtest-/Model-API- oder historische Handelsausführung behaupten.** Entsiegelte Contract-IDs nur im OPERATOR-/POSTHOC-Verzeichnis.
> **LIVE-DATEN NOCH NICHT ABGENOMMEN:** Öffentliches `research/market/latest.json` war vom 10.11.2026, obwohl Laptop-HTTP-Heartbeat vom 18.11. vorlag; die benötigten `forward-source-health.json` und `solana-forward-evidence.json` fehlten. Aktueller Windows-Supervisor-/Publisher-Build und zwei echte frische Laptop-Capture-Quittungen noch zu prüfen; nicht aus GitHub-Code auf bereits installierte Nutzer-Laptop-Version schließen. **Einzige nächste Prioritäten:** Datenabdeckung/Risikoflags überprüfen, Event→GPT-Latenz mit maximal 24 wirklichen Analysen/Tag verringern, bestehende Laptop-Paper-Kette mit frischen Original-Quittungen nachweisen. **PAPER_ONLY, kein Echtgeld, keine parallelen Bots.**

> **WICHTIGE INPUT-TRENNUNG FÜR DEN 120-TAGE-BLINDTEST (17.11.2026):** Dieses allgemeine Startdokument enthält nachträglich festgestellte Coin-Outcomes, spätere Strategiekorrekturen und die Erkenntnisse des aktuellen Chats. Es ist ausschließlich ein **technisches Operator-Dokument** und darf **NICHT** in den Prompt eines historischen GPT-Handelsentscheiders eingespeist werden. Der historische Entscheidungs-Actor bekommt nur den unabhängig isolierten, as-of-geprüften Datenblock aus `research/replay-120d-real/blind-neutral-market-gpt-input.mjs` sowie die separate Modellanleitung `research/replay-120d-real/BLIND_GPT_NEUTRAL_RESEARCH_AND_TRADING_CONTRACT_20261117_DE.md`. Frühere bekannte Gewinner sind keine Suchliste. Siehe GitHub-Proof-Runs 44059351263 (historische Stundenabdeckung), 44059964802 (Original-Onchain-Zeitstempel), 44060236356/44060864100 (historisches Reddit) und 44059746086 (Context-Gate). Keine tatsächlich bewiesenen historischen GPT-DEX-Fills, PnL UNKNOWN.

# SNIPERBOT R29 – HIER BEGINNEN (auch in jedem neuen Chat)
> **FORTSETZUNG V4.1 / ABSCHNITT 13 – ZUKÜNFTIGE UNBEKANNTE MEMECOINS (17.11.2026)**
> [PR #55](https://github.com/127027/Sniperbot-/pull/55) ist mit Merge-Commit `67a51e834d67ba1c1291fdec99fc85bf7a32db48` umgesetzt. **Nicht PR #54 neu bauen.** Auf [finalem PR-Head durchlaufene Windows- und Linux-Paper-Tests](https://github.com/127027/Sniperbot-/actions/runs/44189588702) sind grün. **ZUERST LESEN:** [Dauerhafte gesamte neue Erfahrung, Fehler, echte Belege und nächster Schritt](research/r29/operations/R29_V4_1_PR55_EARLY_UNKNOWN_GPT_CONTINUITY_20261117_DE.md).
> Die vorhandene Windows-Anwendung hat bereits eine **optionale** echte OpenAI Responses-API-Stratege-Komponente `runner/central-ai-coordinator.mjs`. Neu ist eine adaptive 1/6/12/24-Analysenplanung und lokale hart auf 24 Anfragen/UTC-Tag begrenzte, restartpersistente API-Zählung. Der optionale `Sniperbot_Starten.bat -WithCentralAI`-Modus benötigt eine **einmalig eigene lokal DPAPI-gespeicherte API-Berechtigung und kann separate API-Kosten verursachen**. GitHub-ChatGPT-Kurier ist dann Forschung, nicht zweite aktive Paper-Orderinstanz.
> **Hauptziel unbekannte zukünftige Memecoins VOR außergewöhnlichem Ausbruch erkennen:** Auch frühe Tokens unter bisherigen Liquiditäts-/Volumengrenzen gelangen als `research_candidates` zu GPT – **nur WATCH/NO_TRADE, niemals sicherheitsungeprüfter BUY**. Ein technischer Scannerfund ist kein GPT-Handelserfolg. Vorregistrierte Erfolgskriterien unter `research/r29/operations/R29_V4_1_PRE_REGISTERED_HOLDOUT_SUCCESS_POLICY.json` bleiben bestehen.
> **Streng getrenntes System 2:** [Post-Freeze-Audit für bereits gestiegenen Kurs bei GPT-Kauf, verbliebenes Potenzial, verpasste Ausbrüche und Exit-Evidence](research/replay-120d-real/r29-postfreeze-unknown-winner-audit.mjs). Bekannte Gewinnernamen niemals in historische GPT-Blindprompts einspeisen. [Maschinenlesbare validierte Strategie-Basis](research/r29/strategy/validated-knowledge.json) ist nachweislich **leer**, weil noch keine unabhängig bestätigten GPT-Handelserkenntnisse existieren. Es gibt bislang **keinen** authentisch belegten echten lokalen 24/7-GPT-API-Dienst, keinen realistisch ausgeführten unbekannten Coin Roundtrip und keine zehn unabhängigen historischen GPT-Gewinntests.


> **V4.1 – VERBINDLICHER WIEDEREINSTIEG FÜR NEUEN CHAT (17.11.2026)**
> Nutzer hat V4 und V4.1 ausdrücklich mit **GO** freigegeben. Es geht um vollständige GPT-strategische PAPER_ONLY-Memecoin-Handelstests, nicht nur Marktlisten. **ZUERST LESEN:** [Gesamte technische Erfahrung, CI-Ursachen, Fehlversuche, Wiederaktivierung, tatsächlicher Datenstand, ehrliche Grenzen und nächste Schritte](research/r29/operations/R29_V4_1_GITHUB_ERFAHRUNGEN_NAECHSTER_CHAT_20261117_DE.md). Diese Operator-Datei mit POSTHOC-Namen ist **nie** ein Blindtest-Modellprompt.
> [Dauerhafte verifizierte Oktober-Ergebnisdaten](research/r29/operations/R29_V4_1_OCT_REAL_SOURCE_408_FRAMES_VERIFIED_20261117.json): echte **821.849/821.849** erfasste Solana-Quellstarts, **2.296.466** historische Minutenzeilen, davon **2.295.579** zeitpunktgerecht verknüpft, **408** Stundenframes, vier Referenzfallgruppen nur **nach** dem neutralen Quellenfreeze. [Vollständig grüner Minuten-CI-Run 44178191760](https://github.com/127027/Sniperbot-/actions/runs/44178191760).
> Alter Lauf [44168485811](https://github.com/127027/Sniperbot-/actions/runs/44168485811) war **cancelled nach 30 Min** wegen 408 immer größerer DB-JOINs; V4.1 behob dies durch einen schnellen inkrementellen AS-OF-Research-Index. [PR #54](https://github.com/127027/Sniperbot-/pull/54) enthält V4-Code plus Wiederaktivierung abgelaufener Coins, Strikte GPT-Authentizitätsregeln und vorregistrierte [7+3-Holdout-Erfolgskriterien](research/r29/operations/R29_V4_1_PRE_REGISTERED_HOLDOUT_SUCCESS_POLICY.json). **PR #54 wurde nach grünem aktuellem PR-HEAD erfolgreich gemergt:** Merge-Commit `b32bf8e3e3c9953fa7c9737a2e4189b93edefe06`, [echter vollständiger V4.1-Quellen-CI-Lauf 44180592801](https://github.com/127027/Sniperbot-/actions/runs/44180592801), [Windows-/Linux-CI 44180592858](https://github.com/127027/Sniperbot-/actions/runs/44180592858) – beide SUCCESS. Das nächste Vorhaben sind **echte isolierte GPT-Signal-/Handelstests** und zusätzliche unabhängige historische Daten, nicht nochmaliges Bauen desselben neutralen Oktober-Collectors.
> Nach 48h nicht endgültig vergessen: neue belegte Kaufaktivität kann technisch reaktivieren, nachträglich durch Zeitstempel abgesperrt. In den Oktober-Originaldaten wurden **0** reaktivierte Fälle gemessen; isolierte Funktionstests zeigen das Verhalten. Dies ist kein echter Buy-/Sell-Nachweis.
> **Offen:** 10 unabhängige Testperioden mit realen historischen Buy-/Sell-Quotes und tatsächlich von GPT unter isolierten, zeitlich gültigen Inputdaten getroffenen Entscheidungen. Aktuelle gepinnte Quellen decken im Zehnfensterplan nur **5** vollständige 7+10-Tage-Startfenster und **3** 17-Tage-Minutenfenster. Null authentische historische GPT-BUY-/SELL-Fills, Gewinn **UNBEKANNT**. Sicherheitsveto des lokalen Bots, einziges Windows-Startskript und Echtgeld-Sperre bleiben bestehen.

> **17.11.2026 – ENTDECKUNGSLÜCKE VOR GPT BEWIESEN:**
> Blind eingefrorener GPT-Review: **320** neutrale Solana-Mints, **2 WATCH**, **318 technisch abgelehnt**, **0 BUY**. Erst NACH Freeze wurde das Originalarchiv der 17 Tage (821.849 aufgezeichnete Tokenstarts) anhand SHA-256 geöffnet und mit konkreten Mints der vier gewünschten Referenzfälle PIERRE/FTR/Dacity/Trump $1 Coin verglichen.
> **4 von 4 Gruppen existierten im vollständigen historischen Datenkorpus; 0 von 4 wurden in der bisherigen 320er-GPT-Stichprobe vorgelegt.** Das ist ein PRESELECTION-MISS, keine GPT-Ablehnung.
> Hauptursache: nur 4 feste Checkpunkte täglich × 8 letzte Coins aus einem maximal 5-Minuten-Fenster; keine langlebige Watchlist. Das nächste Ziel ist vollständige neutrale Entdeckung + kontinuierliche Beobachtung über mindestens 24–48h mit zeitpunktgenauer GPT-Auswahl – NICHT neue Infrastruktur ohne Entdeckungsnachweis.
> [Vollvergleich, Beleg-Adressen, UTC-Zeiten und Korrektur](research/r29/operations/blind-october-2026/R29_OCT_POSTHOC_FULL_SOURCE_RECALL_AND_ROOT_CAUSE_DE.md).
> [Vor Vergleich versiegelte GPT-Auswahl](research/r29/operations/blind-october-2026/R29_OCT_320_MINT_GPT_BLIND_REVIEW_SEALED.json).
> **Anti-Hindsight:** Der Bericht enthält POSTHOC-Namen und Resultate, darf nie dem historischen GPT-Blindmodell als Input zugespielt werden. Oktober 12.–21. ist für neue unabhängige Trefferquotentests nach dieser Auswertung kontaminiert; ungesehene weitere Tage verwenden. Historische BUY-/SELL-Fills und Gewinn bleiben UNBELEGT.

> **NEUER HISTORISCHER BLINDTEST 05.–21.10.2026 (PR #53, 17.11.2026)**
> [Zeitlich versiegelter Oktober-Quellenreplay mit Tagesergebnissen](research/replay-120d-real/results/R29_OCT05_21_BLINDTEST_READINESS_REPORT_20261117_DE.md) – 7 Vorbereitungstage, 10 Handelstage, 5.000 TEST-USDC als isoliertes Referenzkapital, 470.123 historisch aufgezeichnete Starts in der Handelsphase, 240 technische UTC-Stundenframes, 40 geplante Forschungsfenster, 320 unterschiedliche neutral gewählte Mint-Adressen. Der reproduzierbare GitHub-Actions-Lauf bestand und enthält alle Mint-/As-of-Nachweise. **Kein einziger authentischer Oktober-GPT-Handelsaufruf oder historische BUY-/SELL-Fill nachgewiesen; PnL UNBEKANNT, NICHT 0 oder Gewinn!**
> Historische Quellen wurden in der festgelegten Fassung **nach** dem Untersuchungszeitraum veröffentlicht. Die 40 im Nutzerchat genannten Gewinner blieben ausgeschlossen. Das Dokument ist ein OPERATIONS-/POSTHOC-QUELLENAUDIT, NICHT als Quelle für historische modellseitige Blind-Input-Prompts verwenden.

> **17.11.2026 – NEUE PROSPEKTIVE SOLANA-FORSCHUNG UND ECHTE LATENZMESSUNG**
> Aus einem zukünftigen unabhängig beobachteten neuen Solana-Pool kann R29 jetzt read-only den finalisierten SPL-Mint-Header sowie eine indikative Jupiter-Hin-/Rückroute als Forschungsdossier zusammenstellen, ohne einen Trade auszulösen. Eine fehlende Pool-/Contract-/Quote-Prüfung bleibt unverändert ein BUY-BLOCKER.
> [R29-Prospektiv-Ausführungsabnahme](research/r29/operations/R29_PROSPECTIVE_MEMECOIN_EXECUTION_ACCEPTANCE_20261117_DE.md) dokumentiert die benötigten unabhängigen Prüfungen und den tatsächlichen GPT→Laptop-NO_TRADE-Rundweg mit **32,741 Sekunden Zustellzeit** (keine nachgewiesene BUY-Ausführung).
> Neue optional nur lokal konfigurierbare Jupiter-API-Key-Unterstützung für schreibgeschützte Quotes; niemals Secrets/Wallet/Budget öffentlich hochladen. Der neue Research-Bericht wird erst nach **aktualisierter Windows-Installation** unter `research/r29/channel/solana-forward-evidence.json` sichtbar.

> **AKTUELLER MARKTFEED-FIX 17.11.2026 – ZUERST HIER PRÜFEN**
> Der bisherige öffentliche Poolfeed `research/market/latest.json` auf `codex/research-gateway-v04` war beim heutigen Test seit 11.11.2026 veraltet, obwohl der Windows-Paper-Bot über GitHub erreichbar ist.
> Das neue [R29-Runbook zum kanonischen Marktfeed](research/r29/operations/R29_CANONICAL_MARKET_RELAY_RUNBOOK_20261117_DE.md) erläutert den Root Cause, die datenschutzgeprüfte lokale Marktfeed-Übertragung direkt auf den GPT-R29-Branch sowie die notwendigen Schritte zur Aktualisierung des tatsächlich laufenden Windows-Bots.
> Es gelten weiter ausschließlich PAPER_ONLY, keine frei erfundenen GPT-Modellaufrufe, keine unvalidierten BUYs und keine realen Gelder.


> **NEUE KANONISCHE FORTSETZUNG – echter GPT→GitHub→Windows-Rundweg am 17.11.2026**
> Ein aktuellen Chat-Entscheid ist um 17:58:12.581 UTC per unveraenderlichem
> Hash-/Owner-Archiv nach GitHub geschrieben worden. Der laufende Laptop-Bot
> bestaetigte um 17:58:45.322 UTC denselben Entscheidungs-Identifier
> gpt_e7c715480f009a0dd80040fa78c186a7 mit **NO_TRADE**.
> Das belegt den realen nicht-handelnden Befehlskanal, noch keinen Paper-BUY,
> keine kryptografische Modellidentitaet und kein autonomes 24/7-Forward-GPT.
> **Alle naechsten Chats beginnen mit** [R29-FORWARD-LIVE-FORTSETZUNG](research/r29/operations/R29_FORWARD_LIVE_RESUME_20261117_DE.md)
> und [R29-LATEST-CHECKPOINT](research/r29/operations/R29_LATEST_CHECKPOINT.json).
> Dort stehen die aktuelle Live-Evidenz, die getrennte 40-Gewinner-POSTHOC-Liste,
> Zeitstempel, Quittungen, unbehobene Publikationsluecken und der konkrete naechste
> Code-/Testschritt. Der oeffentliche Research-Marktfeed auf
> codex/research-gateway-v04 war noch am 17.11. laut letzter
> GitHub-Datei vom **11.11.2026** und damit veraltet.
> Neue Module fuer fruehe Migrationserkennung und die sichere
> Marktquellen-Diagnose sind in Entwicklung; **das neue Laptop-Update
> ist noch nicht nachgewiesen**. Bei ungepruefter Contract-Sicherheit
> oder nicht ausfuehrbarer Buy/Sell-Quote NIE einen BUY behaupten.
>


> **NEUE ENTWICKLUNGSERGÄNZUNG 17.11.2026 (nach historischem Holdout):**
> 40 weitere vom Nutzer gelieferte historische Gewinnerbeispiele wurden als
> **USER_SUPPLIED_UNVERIFIED** in eine *strikt posthoc* Referenzdatei übernommen:
> [40 Memecoin-Fälle](research/r29/gpt-strategy/references/USER_SUPPLIED_40_MEMECOIN_WINNERS_20261117.json).
> Ein neuer Quellen-Validator ist direkt in den historischen neutralen GPT-Input-Filter
> eingebunden. Dacity Coin/AudaCity könnte eine Dublette sein. Noch keine 40
> verifizierten Onchain-Wallet-Trades oder realistisch erzielten Renditen.
>
> Die **private lokale GPT-Bot-Einsatzverhandlung** ist als geschützter
> SIZE_REQUEST → SIZE_OFFER → SIZE_CHOICE-Prototyp implementiert; die
> bestehende Paper-Risk-Engine prüft vor GPT-BUY die verfügbare Kapazität erneut.
> Lokales Dashboard zeigt Kennzeichnung GPT-geführter Positionen und letzte
> bestätigte GPT-Receipt. **Noch kein echter autonomer GitHub-Zweiwegkanal
> für die private Betragshöhe:** Das öffentliche Repository veröffentlicht
> keine numerischen privaten Paper-Kontostände. Die vorhandene stündliche
> Automation arbeitet weiterhin nur am historischen Backtest, nicht am
> angeblich schon produktiven Forward-Paper-Betrieb. Daher keine Behauptung
> über 24 aktive GPT-Scans/Tag oder real ausgeführte Solana-GPT-Fills.
> Vollständige technische Übergabe:
> [R29-FORWARD-GPT-STRATEGIE](research/r29/operations/R29_FORWARD_GPT_STRATEGY_AND_SIZE_CONTRACT_20261117_DE.md).
>


> **NEUER ENTWICKLUNGSSTAND – Solana-Echtzeitstream Phase 1 (17.11.2026):**
> R29 ergänzt den bestehenden einzigen Windows-Starter um einen kostenlosen,
> lokal append-only archivierten PumpPortal-WebSocket für **neue Tokens und
> Migrationen** (read-only). Die Daten fließen als ausdrücklich **nicht
> handelbare** Hinweise in die bestehende Marktforschung und – bei erfolgreicher
> GitHub-Veröffentlichung – an den Research-GitHub-Feed der fünf Dots.
> Keine kostenpflichtigen Trade-/Wallet-WebSocket-Methoden, keine Wallet-/PayPal-
> oder Echtgeldtransaktion, keine autonome GPT-Kaufentscheidung durch den
> WebSocket, keine rückwirkende Änderung des 60-Tage-Blindtests.
> **Zuerst lesen:** [Phase-1-Handbuch, Dateiänderungen, Tests, Start und Restlücken](docs/R29_SOLANA_REALTIME_PHASE1_20261117.md).
> **Aktueller maschinenlesbarer Fortschritt:** [R29_LATEST_CHECKPOINT.json](research/r29/operations/R29_LATEST_CHECKPOINT.json) mit PR, verifizierten CI-Runs, Restlücken und nächsten Schritten.
> `README`, GitHub-Commit und Offline-CI beweisen **nicht**, dass der
> Benutzerlaptop bereits diese Version installiert oder echte Stream-Events empfängt.
>


**Projekt:** `127027/Sniperbot-` · Branch `codex/r29-chatgpt-github-paper-cycle-20261115`  
**Dokumentstand:** 16.11.2026 · **Nur PAPER_ONLY**, kein Echtgeld, kein kostenpflichtiger API-Zwang.

> **Neue GPT-Unterhaltung:** Vor Aussagen über Live-Guthaben, Kauf-/Verkaufsfähigkeit oder Forschungsfortschritt **die aktuellen GitHub-Dateien erneut lesen**. Dieses Dokument ist der dauerhafte Einstieg, keine automatische Verbindung zwischen beliebigen neuen ChatGPT-Chats. Falls GitHub nicht verbunden ist, diesen Dateilink bzw. das Projekt-Repository in den neuen Chat übernehmen. Nicht behaupten, einen späteren Commit zu kennen, ohne ihn zu lesen.

## NEUE KLARSTELLUNG – GPT IST ALLEINIGER TRADING-ENTSCHEIDER (16.11.2026, neuer Chat)

**GPT entscheidet selbst** über Coin-Auswahl, vollständige 1/4/12/24 Scans pro Tag, BUY/WATCH/HOLD/SELL/NO_TRADE und virtuellen Einsatz von 50 bis maximal 5.000 TEST-USDC (niemals mehr als freies Testkapital). **Der lokale Windows-Bot entscheidet keine Trading-Strategie**, sondern prüft ausschließlich die technische Zulässigkeit, Authentizität, Sicherheit und Ausführbarkeit bereits von GPT signierter Paper-Intents, simuliert ggf. Quote-Asset-Umwandlung und Order, protokolliert PAPER_FILLED/Ablehnung und speichert unveränderliche Erfahrungs-/Outcome-Daten für spätere GPT-Reviews. Technische Risiko-Vetos dürfen nicht vom GPT umgangen werden; die lokalen Paper-Risikolimiten bleiben bis gesondert getestet unverändert.

**Zuerst 60-Tage-Backtest belegen, danach 24/7-Paper-Orders.** Die neue historische Excel-Hype-Liste ist ausschließlich Lernreferenz, keine frühere Kauf-Evidenz. Weitere Belege: `research/r29/operations/GPT_SOLE_AUTHORITY_PAPER_EXECUTOR_DE.md`, `research/r29/gpt-strategy/references/HISTORISCHE_MEMECOIN_HYPE_REFERENZ_20261109_DE.md`, `research/replay-120d-real/results/60_TAGE_BLINDTEST_READINESS_20261116.json`, `research/replay-120d-real/strict-60day-backtest-gate.mjs` und der zugehörige GitHub-Actions-CI-Lauf.

## VERBINDLICHE NUTZERKLARSTELLUNG – MEMECOIN-ONLY SNIPER (16.11.2026)

**DIESES GILT VOR ALLEN FRÜHEREN ALLGEMEINEN KRYPTO- ODER CEX-HANDELSPLÄNEN:** Der Nutzer will *keine* BTC-, ETH-, SOL- oder andere großen Kryptowährungen handeln, auch keine großen etablierten Meme-Bluechips als Standarduniversum. **Ziel sind ausschließlich neu entstehende oder durch Medien/Social Media gerade viral werdende kleine Memecoins mit potenziell +1.000 % oder mehr innerhalb von etwa 1–7 Wochen und rechtzeitigem Ausstieg vor dem Rückgang.** Der Hype kann schon früher abklingen; keine künstliche Mindesthaltefrist. Die 10×-Bewegung ist ein Suchziel, keine Gewinngarantie. BTC/ETH/SOL sind allenfalls optionaler Makro-Hintergrund; die tatsächliche Candidate-Discovery, Validierung, Score-/Buy-/Sell-Logik muss primär meme-spezifisch sein. Alle vorherigen Binance-DOGE/SHIB/PEPE-Shadow-Ergebnisse sind *reine Kontrollmodelle*, **keine Sniper-Strategieperformance**. Keine rückblickend bekannten Gewinner selektieren. Für historische PAPER-Stresstests sind nach Nutzerfreigabe variable 50–5.000 TEST-USDC zulässig, aber **keine Lockerung bestehender Laptop-Live-Paper-Sicherheitsgates ohne gesonderte kontrollierte Änderung**. Kein Echtgeld, Ledger unverändert.

**Vor jeder neuen Recherche unbedingt lesen:** `research/r29/gpt-strategy/MEMECOIN_ONLY_10X_SNIPER_MANDAT_DE.md`.
**Aktuelles 41×-Beispiel des Nutzers:** Tokenpreis **0,0000001 → 0,0000041** in **vier Wochen** (+4.000 %, 41×) mit **5.000 TEST-USDC** Einsatz = **205.000 TEST-USDC** theoretischer Verkaufserlös ohne Gebühren/Price Impact. **Kein nachgewiesener Gewinn oder Auftrag!** Sehr kleine Pools können einen Verkauf dieser Größe unmöglich oder erheblich schlechter machen. Dokumentation `research/r29/gpt-strategy/MEMECOIN_41X_HYPOTHETISCHES_4_WOCHEN_BEISPIEL_DE.md`, reine hypothetische AMM-Prüfung `research/r29/operations/memecoin-moonshot-execution-check.mjs`. Vor der Freigabe zwingend unabhängige historische/frische Buy- UND Sell-Quote, Pooltiefe, Contract-/Sellability-Sicherheitsbelege sowie Risikogates prüfen.


## 1. Eigentliches Ziel

Ein **einziger strategischer GPT-Entscheider** scannt die Kryptowährungsmärkte dauerhaft, findet neue Memecoins, prüft Sicherheitsrisiken, übermittelt virtuelle BUY-Entscheidungen an den lokalen Windows-Bot und entscheidet bei bestätigten GPT-Paper-Positionen später über HOLD/SELL. Der lokale Bot validiert jede Order und führt nur Paper-Orders aus. Notfallstopps dürfen unabhängig und schneller als stündlich erfolgen. 

**DYNAMISCHE Tagessteuerung – wichtigster Nutzerwunsch (16.11.2026):** Der Morgen-Check um ungefähr **08:32 Europe/Berlin** entscheidet zunächst vorläufig über **1, 4, 12 oder höchstens 24** vollständige GPT-Analysen. **JEDER weitere stündliche Wecklauf darf die Tagesstufe sofort erneut wählen und erhöhen oder senken.** Ein morgens gewählter Wert 4 darf etwa beim zweiten Scan auf 24 steigen, wenn sich authentisch neue Markt-/Positionssignale zeigen; dann ist die nächste fällige Analyse bereits eine Stunde nach dem letzten tatsächlichen Scan möglich. Ebenso 1→24 und 24→4→1→24 am selben Tag. Vergangene Scans bleiben unverändert; höchstens ein abgeschlossener GPT-Vollscan je UTC-Stunde und 24 je Betriebstag. Dazwischen leichte stündliche Statusprüfungen; nicht jeder Wake-up = neuer GPT-Vollscan. Bei offener Position vorläufig mindestens 12 Analysen täglich, bei bestätigtem akutem Risiko bis 24. Alle ausgefallenen Ausführungen als solche protokollieren, nicht rückwirkend als erfolgt zählen.

Die technische, **nicht** selbst startende Planungslogik ist in `research/r29/operations/adaptive-daily-cadence.mjs` (`reconsiderDailyPlan()` bei jedem Stunden-Wecklauf, `scanDue()` nach tatsächlich abgeschlossenem letzten GPT-Scan); Tests: `research/r29/operations/operations.test.mjs`. Die stündliche ChatGPT-Automation muss diese Revisionen tatsächlich ausführen und append-only protokollieren; bloßer GitHub-Code belegt keinen produktiven Betrieb. Der lokale Bot und eine ChatGPT-Automation sind verschieden. Keine Behauptung garantierter 24/7-Kontrolle, falls Windows-PC, Netz, GitHub oder Automation ausfallen.

## 2. Aktueller tatsächlich belegter Stand (16.11.2026)

- Bestehende Automation: **Sniperbot R29 GPT-Paper-Diagnoseführer**, ID `6af9cdf5ba548191a1c2304988e4d3ab`, Wiederholung stündlich etwa Minute 32, `Europe/Berlin`. **Nicht duplizieren**.
- Letzter überprüfter Research-Status: `research/r29/channel/dynamic-research-status.json` meldete 15 Forschungsreviews und für den Tag eine Forschungshäufigkeit von 12; **nur Snapshot, nicht als Live-Wahrheit behandeln**.
- `research/r29/channel/gpt-paper-security.json` meldete **0 unabhängig geprüfte EVM-Kandidaten**, historische Solana-Sellability nicht belegt.
- `research/r29/channel/gpt-paper-context.json` meldete PAPER_ONLY, `gpt_follow_enabled:true`, `paper_bot_enabled:true`, `positions:[]`. **Frische ist vor einer Order erneut zu prüfen**, aus dem öffentlichen Kontext kein Papier-Guthaben erraten.
- Ein erfolgreicher `NO_TRADE`-Empfang auf dem Laptop ist belegt, **aber kein tatsächlich marktbasierter GPT-Paper-BUY und SELL über den ganzen Pfad nachgewiesen**. Nur `PAPER_FILLED` ist ein echter virtueller Fill.
- **Echtgeldhandel bleibt aus**, bis ein separater Nutzerauftrag und technische Sicherheitsfreigaben vorliegen.

## 3. Pflichtlektüre vor jeder neuen Entscheidung

1. **Diese Datei** `SNIPERBOT_R29_START_HERE.md`.
2. `research/r29/operations/DAILY_RESEARCH_AND_LEARNING_PROTOCOL_DE.md`.
3. `research/r29/gpt-strategy/MARKTFORSCHUNG_WISSENSBASIS_DE.md`.
4. `research/r29/gpt-strategy/ERFAHRUNGSJOURNAL_DE.md` sowie neue, unveränderliche `research/r29/gpt-strategy/experiences/YYYY-MM-DD/*.md`.
5. **Neue Outcome-/Lernberichte** unter `research/r29/operations/outcomes/` bzw. `research/replay-120d-real/results/`. Zukünftige Resultate erst NACH damaligem Entscheidungstermin interpretieren.
6. `research/r29/channel/dynamic-research-status.json`, `dynamic-research-review.json`, `gpt-paper-security.json`, `gpt-paper-context.json`, `gpt-paper-receipt.json`.
7. `runner/gpt-paper-protocol.mjs` und `research/r30/DIAGNOSEFUEHRER_PROTOCOL.md` für signierte Paper-Bot-Verträge.
8. Bisherige Echtforschung `research/replay-120d-real/REPORT_VOLLSTAENDIGER_ECHTER_HANDELSTAG_2026-10-15_DE.md` und `research/replay-120d-real/REPORT_DE.md`.

Wenn auch nur eine wesentliche Sicherheits-/Sellability-/Pool-Quote-Quelle fehlt: **WATCH/NO_TRADE oder BLOCKED**, keine fingierte Order.

## 4. Echtdaten-Backtest – Belege und Grenzen

- **120 Kalendertage:** 20.07.–17.09.2026 Beobachtung, 18.09.–16.11.2026 Handelstest (letzter Tag ursprünglich nur bis verfügbarer UTC-Zeit).
- **2.713.057** historisch erfasste echte Solana-Tokenstarts über 67 Tage, 53 Tage fehlende Launch-Quelle; keine vollständige historische Quote-/Sicherheits-Historie.
- 15.10.2026: kompletter öffentlich abrufbarer Tag **42.230.410 echte historische Swap-/Fehlversuchsereignisse**, davon **20.428.528 fehlgeschlagen**. **48** neutral gewählte Mint-Adressen (erste zwei Starts pro UTC-Stunde), **28.112** zugehörige tatsächliche Handelsereignisse, **41** Mints mit beobachteten Käufen und Verkäufen. Source-Commit/Quellenprüfungen: `research/replay-120d-real/full-day-neutral-swaps.py`.
- Sechs echte, historisch zeitlich gefilterte Forschungsframes wurden **HEUTE rückblickend** von GPT bewertet: **2 WATCH, 4 NO_TRADE, keine BUY-Freigabe**. Original: `research/replay-120d-real/reviews/2026-10-15-six-neutral-real-frames-current-gpt.json`.
- 60-Tage-Preisvergleich auf **echt archivierten Binance-Kursen, rückblickend fest gewählten Paaren und modellierten Ausführungen**, **kein GPT-Handel**: konservative Variante A indikativer Endwert **4.895,38 TEST-USDC**, dynamische B **2.497,62 TEST-USDC**, Start jeweils 5.000. Die aggressive Variante verlor indikativ rund 50 %. Niemals als echtes Modell-GPT-Ergebnis ausgeben.
- **Aktueller Quellenstand vom 16.11.2026 – 43 statt zuvor 36 Handelstesttage:** **5.645.886** echte, per SHA-256 gegen dieselbe Source-Revision geprüfte Solana-Minuten-Feature-Zeilen vom **24.09. bis 05.11.2026**, daraus **1.032** historische UTC-Stunden-Prüffenster und **8.256 neutrale Coin-Beobachtungen** (bis zu acht pro Stunde). Keine späteren Rug-/ATH-/Graduation-Labels und keine nachträglich reparierte `flag_curve_drained` in GPT-Entscheidungs-Frames; dennoch keine unabhängige, damals ausgeführte GPT-Order oder beweisbare DEX-Fills. GitHub CI: https://github.com/127027/Sniperbot-/actions/runs/43944372099 ; Belegarchiv: https://github.com/127027/Sniperbot-/actions/runs/43944372099/artifacts/14265305978 . Die ältere 36-Tage-Auswertung bleibt als vorheriger historischer Zwischenstand erhalten.
- **Aktuelle 60-Tage-Tagesmatrix:** `research/replay-120d-real/results/REAL_60_DAY_EVIDENCE_MATRIX_43D_2026-11-16.csv`. **49/60 Tage echte Launch-Identitäten, 43/60 Tage Minute-Features, 1/60 Tag vollständige Swap-Transaktionen anderer Wallets**, **0 Tage vollständig mit echten historischen GPT-DEX-Handelstrades nachgewiesen**. Fehlende 17 Minuten-Feature-Tage sind nicht als sichere NO_TRADE-Tage zu verbuchen.
- **Zusätzlich echte historische Binance-Kurssensitivität – NICHT der eigentliche GPT-Memecoin-DEX-Backtest:** `research/replay-120d-real/60_TAGE_HANDELSTABELLE_PREISMODELL_A_B_C_ERGEBNIS_DE.md` und `research/replay-120d-real/results/60_TAGE_STAFFELEINSATZ_50_100_250_CEX_KURSMODELL.csv`. 60 Tageszeilen und 69 modellierte CEX-BUY-/SELL-Ereignisse mit wirklich verzeichneten Binance-Kurspreisen, aber nur **modellierten** Ausführungen. Var. A (immer 50): **4.895,38 TEST-USDC**, Var. B (dynamisch 50–5.000): **2.497,62 TEST-USDC**, Var. C (250/100/50 nach damals belegtem offenem Slot): **4.801,78 TEST-USDC** aus jeweils 5.000. C: **36 BUYs / 33 SELLs, 3 Gewinne / 30 Verluste, 3 offene Modellpositionen**. **Alle Varianten im Minus. Kein erfolgreicher historischer GPT-DEX-Backtest oder reale Wallet-/Laptop-Paper-Order!** Stündliche Intraday-Anpassung ist im Live-Planungscode getestet, im historischen CEX-Kursmodell noch NICHT als ausgeführte Full-GPT-Laufserie verifiziert; alte Tagesfrequenzen sind kein echter dynamischer Intraday-GPT-Beweis.
- **Neu: belastbare Verlustursachen-Auswertung, aber nur als vorläufige Forschung:** `research/replay-120d-real/60_TAGE_VERLUSTANALYSE_VERBESSERUNGSPLAN_DE.md` und `research/replay-120d-real/results/60_TAGE_VORHERIGE_VERLUSTE_COOLDOWN_NUR_DIAGNOSE.json`. Ursprüngliche 60d-CEX-Staffel A/C: 33 geschlossene Trades 3 Gewinner/30 Verlierer, Endwert C 4.801,78. Rein **hypothetischer** Filter „2 bereits abgeschlossene negative Trades desselben CEX-Symbols binnen 14 Tagen“ ergibt auf **demselben bereits bekannten** Holdout 4.848,20 statt 4.801,78 (−151,80 statt −198,22), also **immer noch negativ**. 7d-Filter 4.824,02. Das ist eine nach Sichtung des Testzeitraums formulierte Hypothese und **keine unabhängige Verbesserung**, darf ausdrücklich **nicht** ohne neues Forward-Paper-Experiment in die laufende lokale Trading-Policy übernommen werden. Lernakte: `research/r29/gpt-strategy/experiences/2026-11-16/60d-analyse-verlust-und-cooldown-forschungsfrage.md`. Isolierte CI: https://github.com/127027/Sniperbot-/actions/runs/43947405737 .
- **Noch NICHT erwiesen:** neutraler 120-Tage-DEX-Launch-/Swap-/LP-/Security-Katalog auf allen Chains, echte historische GPT-Signalreihe, füllbare USDC-Bid/Ask-Quotes und ein tatsächliches 60-Tage-GPT-Paper-P&L. **Keinen Gewinn schätzen oder erfinden.**

## 5. Fehler erkennen, auch bei abgelehnten später steigenden Coins

Jede strategische Entscheidung speichert: `decision_id`, Chain, eindeutige Token- und Pool-Adresse, virtuelle bzw. tatsächliche UTC-Zeit, SOURCE-HASH und damalige Quelle, Score mit dokumentierten UNKNOWNs, BUY/WATCH/HOLD/SELL/NO_TRADE, Begründung, Risikobudget, Quittung/Fill oder Ablehnung.

**Danach separat:** Nach Ablauf des Beobachtungshorizonts echte Outcomes mit derselben Token-/Pool-/Quote-Identität prüfen. Bei späterem deutlichen Kursanstieg (für Forschung vorregistrierter Schwellenwert **+75 %**) Ergebnis als `POSTHOC_PRICE_RALLY_NOT_PROVEN_EXECUTABLE` kennzeichnen. Kein späteres ATH als früheres Wissen einsetzen. Preis-Anstieg ≠ sicherer ausführbarer verpasster Gewinn. Auch Coin ohne späteren Kurs bzw. ohne vergleichbares Referenz-Quote als **UNKNOWN** berichten.

Das **append-only** Lernsystem `research/r29/operations/decision-outcome-learning.mjs` erzeugt nur **künftige Hypothesen**. Es darf einen eingefrorenen 60-Tage-Blindtest niemals im Nachhinein ändern. Neue Strategieversionen bekommen Veröffentlichungszeit und unabhängige Forward-Paper-Prüfung. **Mandatory KO-Regeln bleiben bestehen**, selbst wenn ein abgelehnter Coin später gestiegen ist.

## 5a. Neues Kandidaten-Gedächtnis (kein automatischer Kauf)

- **JEDER** im aktuellen öffentlichen Forschungsreview beobachtete Coin wird mit Chain + eindeutiger Token- **und Pooladresse**, Research-SHA und beobachtetem Zeitstempel unter `research/r29/operations/candidate-watch/snapshots/YYYY-MM-DD/` festgehalten. Dazu gehören auch einander widersprechende oder wegen Sicherheit abgelehnte Coins. Die vorhandenen `DETERMINISTIC_CONTROL`-Fälle werden archiviert, aber **aus der Handelsperformance ausgeschlossen**.
- **Neuste Null-Kandidaten-Sicherheitsdiagnose:** `research/r29/operations/SECURITY_ZERO_CANDIDATES_DIAGNOSTIC_2026-11-16_DE.md`; die lokale nächste Sicherheitsveröffentlichung erhält `selection_diagnostic` und `local_market_read_status` für gezielte Fehleranalyse. GitHub-Code ist kein Beleg für eine Installation auf Windows.
- **Aktuell erstes echtes Archiv:** `research/r29/operations/candidate-watch/snapshots/2026-11-16/20261116T165647536Z-69938eedf12bd93b.json`: 10 echte Forschungsproben + 2 Kontrollfälle, sämtlich keine verifizierte Sellability.
- **Getesteter Vergleich:** `research/r29/operations/market-research-watchlist.mjs`. Ein späterer öffentlicher Review darf zum ursprünglichen Scan erst verglichen werden, wenn sein späterer Zeitstempel erreicht und die **identische Chain:Token:Pool-Kombination** nachgewiesen ist. Fehlende später beobachtete Coins sind `UNKNOWN`, nicht ein Gewinn und nicht eine korrekte Ablehnung.
- **Schwelle:** +75 % im selben Kandidaten anhand späterer *indikativ* angezeigter Preise = `INDICATIVE_SAME_POOL_LATER_PRICE_RALLY_NOT_EXECUTABLE`. Das ist NICHT ein persönlicher möglicher Gewinn und kein DEX-Fill. Eine Risikofreigabe benötigt unabhängig damalige Contract-, LP-, Sellability- und Ausführungskriterien. Hohes Volumen ohne Liquidität bleibt verdächtig.
- **Wichtig:** Eine gewöhnliche Forschungsbeobachtung `INDEPENDENT_REVIEW_REQUIRED_NOT_BUY` ist keine tatsächlich vom GPT getroffene und archivierte `NO_TRADE`-Entscheidung. Für echte Lernqualität immer zwischen **Gesehen / GPT bewertet / gehandelt / quittiert** unterscheiden.
- **Dauerhafte Überprüfung:** Beim nächsten unabhängigen Marktstand (und zusätzlich nach Möglichkeit nach 24 Stunden und sieben Tagen) separate Outcome-Datei unter `research/r29/operations/outcomes/YYYY-MM-DD/` anlegen; keine historischen Archive ändern. Neue Hypothesen nach Prüfung unter `research/r29/gpt-strategy/experiences/YYYY-MM-DD/` veröffentlichen und nur vor zukünftigen Paper-Entscheidungen lesen.

## 6. Schreiborte und Grenzen

- Ursprüngliche GPT-Paper-Entscheidungen: `research/r29/gpt-decisions/YYYY-MM-DD/` (write once, Hash).
- Aktuelle Paper-Quittung: `research/r29/channel/gpt-paper-receipt.json` (nur tatsächlichen lokalen Status lesen).
- Append-only Tagesdiagnosen: `research/r29/daily-diagnoses/`.
- Neue Lernerfahrungen: `research/r29/gpt-strategy/experiences/YYYY-MM-DD/`.
- Geprüfte historische Outcome-Berichte: `research/r29/operations/outcomes/`.
- Historische Forschung: `research/replay-120d-real/` und Repo-artifact GitHub Actions.
- **Keine** Datums-/Gewinnrückdatierung, keine doppelten offenen Papierkonten, keine privaten Wallet- oder PayPal-Daten in GitHub, keine Echtgeld-Orders.
- Bestehende stündliche Automation verwenden, keinen zweiten strategischen Dot oder lokalen Autopiloten starten.

## 7. Neue Unterhaltung: schneller Arbeitsauftrag

> Öffne den GitHub-Branch `127027/Sniperbot-`, lies zuerst `SNIPERBOT_R29_START_HERE.md` sowie das tägliche Forschungs-/Lernprotokoll und die aktuellsten GitHub-Research-, Security-, Positions- und Receipt-Dateien. Prüfe den wirklichen Fortschritt der stündlichen GPT-Paper-Forschung, setze nur nach belegten Daten den nächsten Arbeitsschritt um. Berücksichtige das append-only Erfahrungs- und False-Negative-Outcome-Journal, ohne historische Entscheidungen umzuschreiben. Kein Echtgeld, keine erfundenen GPT-Trades. Gib UTC-Zeit, Dateipfade, Commits und tatsächliche PAPER_FILLED-Nachweise an.

Dieses Dokument macht den Projektstand **auffindbar und prüfbar**. Eine beliebige neue ChatGPT-Unterhaltung liest GitHub nicht automatisch; dafür muss der Repo-Link verfügbar sein bzw. das Projekt die Quelle einbinden.

## Forschungsergänzung vom 16.11.2026 – nach neuem Chat / Excel (keine Order)

Die historische Beispieldatenbank `meme_coins_2013_2026_historische_datenbank(10).xlsx` wurde anhand ihres SHA-256 in der Forschung dokumentiert. Das **Referenzarchiv** mit 14 nachträglich bekannten Hype-Fällen liegt unter `research/replay-120d-real/results/HISTORICAL_MEME_HYPE_REFERENCE_POSTHOC_20261109.json` und darf **niemals als zeitgenössischer GPT-BUY-Input** oder blindes Coin-Auswahluniversum verwendet werden.

Neue **60-Tage-Arbeitsliste**: `research/replay-120d-real/results/R29_60_DAY_SOURCE_GAP_TRIAGE_20261116.csv`; detaillierter Stand und Quellenentscheidungen: `research/replay-120d-real/60_TAGE_GPT_REPLAY_FORTSETZUNG_2026-11-16_DE.md`. Status nach Originalquellen: 49/60 Launch-, 43/60 Minutensignal-, 1/60 voll gespeicherter neutraler Swap-Tag, **0/60 vollständig nachgewiesene historische GPT-DEX-Paper-PnL-Tage**. Alle fehlenden Tage bleiben DATA_GAP.

Neuer as-of-Scan-Validator: `research/replay-120d-real/strict-asof-gpt-scan.mjs` mit eigenem Regressionstest. Er akzeptiert nur explizit GPT-verfasste retrospektive Forschungsentscheidungen und sperrt spätere Ereignisse, bekannte Gewinner, ungültige Transkripte und historische BUYs ohne sechs Proof-Klassen. **Kein** Original-GPT-Scan von damals, kein PAPER_FILLED, keine Live-Order, keine Änderung am Paper-Guthaben. Der GitHub-Preflight-Workflow prüft zusätzlich diesen Code; erfolgreiche Unit-Tests sind keine vollständige Handelsstrategie.

### Automatische Fortsetzung ab 17.11.2026 (von Nutzer freigegeben)

Der Nutzer hat ausdrücklich festgelegt, dass der 60-Tage-Memecoin-GPT-DEX-Blindtest **ohne wiederholte "weiter"-Nachrichten** möglichst vollständig fortgeführt werden soll. Die **bestehende** stündliche Automation `6af9cdf5ba548191a1c2304988e4d3ab` wurde in ihrem Auftrag erweitert, ohne ihren Stundentakt zu verändern oder neue Automationen anzulegen. Jede Durchführung soll bei verfügbarem Zugriff eine **nachprüfbare neue Backtest-Arbeitseinheit** bearbeiten und nach einem Quellenblocker nicht endlos dieselbe reine Statusmeldung wiederholen. Ein zwingender Datenkauf/Zugriffsfreigabe ist separat beim Nutzer zu erfragen, niemals stillschweigend auszuführen. Bei unlösbaren Datenlücken gilt ein ehrlicher begrenzter Audit als Ergebnis, kein fingierter 60/60-Gewinn.

Neu: `research/replay-120d-real/source-manifest-audit.mjs` und `source-manifest-audit.test.mjs`. Die `.github/workflows/r29-free-source-coverage.yml` prüft bei passenden Branch-Pushes und manueller Workflow-Auslösung den **aktuellen kostenlosen HuggingFace-Minutenfeature-Dateimanifeststand** gegen die unveränderte 60-Tage-GitHub-Quellenmatrix (49 Launch-/43 Feature-/1 vollständiger Swap-Tag). Erst neu im Upstream gelistete Dateien sind ausschließlich `NEWLY_LISTED_UNVERIFIED_RAW_FILE`; ohne erneute Bytegrößen-/SHA-256- und As-of-Feldvalidierung **nicht** als geprüfte 60/60-Abdeckung zählen. Kein GitHub Actions Erfolg allein ist ein nachgewiesener GPT-Kauf, DEX-Fill oder PnL. Der Quellenabruf benötigt keine bezahlten API-Keys und greift nicht auf Wallet oder Paper-Konto zu.

## Latest verified historical backtest restart – 17 November 2026

The only authorized strategic decider remains GPT. **The historical policy proxy is NOT 513 individual GPT model calls.** GitHub Actions successfully independently reran the frozen GPT-authored research policy from the original time-sealed 43-day archive: https://github.com/127027/Sniperbot-/actions/runs/44040656066, artifact https://github.com/127027/Sniperbot-/actions/runs/44040656066/artifacts/14308549593 .

**60 rows / 60 UTC days** for 18 Sep–16 Nov 2026 are retained at `research/replay-120d-real/results/R29_60D_GPT_POLICY_PROXY_DAILY_CI_20261117.csv`. Of these 60 days, **43** have historical minute inputs and **17** have genuine source gaps. The **1,032** sourced hourly frames produced **513** adaptively selected *policy-proxy* scan calculations, **9** WATCH scan signals and **3,575** as-of warning-flag research vetoes in the evaluated sample. These are **not** proven executed trades or proven avoided losses. Original historical GPT model BUY/HOLD/SELL fills: **0 documented**. Executable historical GPT DEX 60-day PnL: **UNKNOWN**, not zero. CI success demonstrates replay reproducibility and anti-lookahead gates, not strategy profitability.

Read `research/replay-120d-real/REPORT_NEUESTE_60_TAGE_GPT_POLICY_PROXY_20261117_DE.md` for limitations and next evidence requirements, and `research/r29/gpt-strategy/experiences/2026-11-17/60d-gpt-policy-loss-filter-hypotheses-v1.md` for in-sample, **not production-active** risk hypotheses. The only hourly GPT automation has been updated to **BACKTEST-ONLY** by explicit user instruction; do not send fresh market BUY orders. Existing paper ledger remains unchanged; real trading disabled.

## 17.11.2026 – vom Nutzer präzisierter 120-Tage-GPT-Walkforward (aktueller Auftrag)

**Präzise Chronologie:** Tag 120=20.07.2026, Tag 61=17.09.2026 (LERNEN); Tag 60=18.09.2026, Tag 1=16.11.2026 (60-Tage-BLINDTEST mit persistentem 5.000-TEST-USDC-Versuchskonto). Erst **danach** künftiger Echtzeit-Paper-Betrieb. GPT entscheidet *alle* Strategieaktionen BUY/HOLD/SELL/WATCH/NO_TRADE und Stundenstufe 1↔4↔12↔24; Bot nur authentifizierte technische Validierung, Paper-Umwandlung/Execution und Journal. Auch Nichtkäufe, zu frühe/späte Verkäufe und verpasste Chancen gehören ins spätere Outcome-Journal. Historische Zukunftsinformationen und vorzeitig gelesene Lessons sind verboten.

**Verbindlicher neuer Einstiegsbericht:** `research/replay-120d-real/R29_CHRONOLOGISCHER_120D_BACKTEST_STATUS_20261117_DE.md`. **Dauerhaftes 120-Tage-Quellenjournal:** `research/replay-120d-real/results/R29_120D_GPT_WALKFORWARD_SOURCE_READINESS_20261117.csv`. Tatsächliche Quellenabdeckung: **18/60** Trainingstage historische Launchidentitäten (42 fehlend); **49/60** Holdout Launchidentitäten; **43/60** Holdout-Minutenframes; **1/60** vollständiger Drittwallet-Swap-Tag im Holdout. **Keine** vollständig geprüfte 60-Tage-GPT-BUY/HOLD/SELL-DEX-PnL-Serie, PnL **UNKNOWN**.

**Neue geprüfte Komponenten:** `research/replay-120d-real/chronological-120d-controller.mjs` und Test; `runner/gpt-paper-capacity-report.mjs` und Test; CI https://github.com/127027/Sniperbot-/actions/runs/44044451031 (**11/11 bestanden**, Check für Zeitachse, später veröffentlichte Quellen, 4→24 Scan-Upgrade, Gedächtnis-Zukunftsfilter, historische Fill-Proofs, 50–4999 private Kapazitätsantwort, Euro/USDC-Gleichsetzungsstopp). Das ist **Infrastruktur-Test, keine nachgewiesene profitable Strategie.** Die private Kapazitätsrücktransportstrecke zum GPT ist konzipiert, **noch nicht live verbunden**; keine Guthaben im öffentlichen GitHub veröffentlichen.

**Dauerhafte Lerndokumentation:** `research/r29/gpt-strategy/experiences/2026-11-17/120d-chronologisches-gedaechtnis-und-executor-vertrag-v2.md`.

Die bestehende stündliche R29-Automation bleibt **BACKTEST-ONLY** und wurde mit dieser chronologischen 60+60-Regel aktualisiert; sie darf ohne wiederholtes GO die nächsten Forschungsdaten validieren und Erfahrungen archivieren. Echtgeld inkl. künftig gewünschtem PayPal-Onramp **weiter gesperrt**, erst nach gesonderter Nutzerfreigabe und zahlungs-/wallettechnischen Sicherheitsprüfungen.

## Neuer historischer 60-Tage-Erkennungstest mit gegengeprüften Falschsiganlen (17.11.2026)

**Neue verbindliche Dokumente:**
- Alle 60 Tage, mit countdown Tag60→Tag1 und tagesgenauer V1-/V2-Scanfrequenz: `research/replay-120d-real/results/R29_60D_V1_V2_FRESH5_INSAMPLE_DAY_BY_DAY_20261117.csv`.
- Maschinenlesbare gesicherte V1-/V2-Posthoc-Prüfung: `research/replay-120d-real/results/R29_60D_V1_V2_OUTCOME_AUDIT_20261117.json`.
- **Erinnerungs-/Lernakte:** `research/r29/gpt-strategy/experiences/2026-11-17/60d-v1-v2-fehler-rug-nach-133-sekunden-v3-lernregeln.md`.

V1 alter Erkennungsproxy aus **frühesten acht Mints der VORstunde**: 43/60 Daten-Tage, **513** dynamische Forschungs-Proxy-Scans und **9 WATCH-Fälle**. Von neun nachträglich GPT-geprüften Forschungskandidaten wurden **8/9** im SHA-geprüften Launcharchiv gefunden, **1/9** war Identitätslücke; drei der acht wurden später mit einem Provider-Rug-Regellabel **VOR dem stündlichen Scan** markiert, **0/8** als Graduierung. V1 Modelscore 99,05 konnte also einen in der Quelle bereits als Rug eingeordneten Kandidaten hoch bewerten.

V2 **nach Blick auf V1-Fehler** konstruiert: frische letzte fünf Minuten/Tokenalter bei Scan ≤300 s, kein Mayhem-/Agentenmodus, bekannte SOL-Quote. Rekonstruktion derselben 43 Historientage vollständig erneut auf GitHub bestanden, **8.248** frische neutrale Kandidaten-Beobachtungen an **1.032** Stundenendpunkten. V2 gibt bei denselben **513** Proxy-Scans nur **1 WATCH**. Dazu wurde am 17.11. explizit vor späterem Labelabruf eine GPT-Nachbewertung für Mint `3cpr9EaPmQSf7daf37d7xNRZwbpL3LZRtARkYE3cp6jw` bei virtuellem Check **03.10.2026, 03:00 UTC** eingefroren. Die unabhängige spätere SHA-geprüfte Quelle meldet **DRAIN 133,423 Sekunden später**, keine Graduation. Auch der V2-Score 98,15 war somit ein Risiko-*WATCH* und **KEIN Kaufsignal**; tatsächlich gekauft wurde **nicht**. V2 ist **in-sample** und kein Beweis für bessere realisierte Erträge!

Erfolgreiche GitHub-Tests: V1 https://github.com/127027/Sniperbot-/actions/runs/44040656066 ; V1-Posthoc https://github.com/127027/Sniperbot-/actions/runs/44047869968 ; neue 5m-Frames https://github.com/127027/Sniperbot-/actions/runs/44048309420 ; V2 60d https://github.com/127027/Sniperbot-/actions/runs/44048643351 ; einziger V2-WATCH-Posthoc https://github.com/127027/Sniperbot-/actions/runs/44049113793 .

**Keine** historische DEX-Paper-BUY/HOLD/SELL-Liquidität, Quote, Fill oder verwertbare PnL nachgewiesen. 17/60 Quellen-Tage fehlen; die Lernphase hat 42/60 Launch-Tage ohne diesen Provider. Ein Score oder f_rs (= Bonding-Curve-SOL-Reserve, **kein Preis**) ist kein realisierbarer Gewinn. Der Bot bleibt ohne Handelsentscheidungsrecht, Echtgeld und PayPal bleiben AUS. Nächste Arbeit muss neue, **zeitgerecht verfügbare** historische Ausführungs-/Sicherheitsquellen prüfen; erst anschließend GPT-BUY→HOLD→SELL chronologisch mit nachgewiesenen Gebühren/Slippage simulieren. Vergangenes V1/V2 nicht als profitable 60 Tage ausgeben.

