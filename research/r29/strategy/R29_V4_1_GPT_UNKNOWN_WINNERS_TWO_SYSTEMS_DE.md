# R29 V4.1 – unbekannte Memecoins frühzeitig mit einem echten GPT-Modell untersuchen

**Stand:** 17.11.2026. **PAPER_ONLY** – die Implementierung ist keine nachgewiesene profitable Strategie.

## System 1 – vorhandener Windows-Laptop-Bot (kein Backtest)

- Einziger Einstieg bleibt `Sniperbot_Starten.bat` und `runner/windows-supervisor.ps1`.
- Der bestehende technische Collector überwacht neue Pools, Solana-Starts und -Migrationen, Onchain-Risiken, News und Narrative mit seinen eigenen vorhandenen Quellabdeckungsgrenzen.
- `runner/central-ai-coordinator.mjs` ist bereits der originale **opt-in** local Responses API GPT-Strategieprozess. V4.1 erweitert ihn um adaptive Prüfintervalle und **maximal 24 reservierte Modellaufrufe pro UTC-Tag**, die auch durch einen Prozessneustart nicht zurückgesetzt werden.
- Planfrequenz je nach Echtzeit-Ereignisanzahl und gehaltenen Positionen: 1/6/12/24 Modellprüfungen täglich; ausfallende API-/Datenquellen können die Zahl tatsächlicher Modellantworten verringern und zählen niemals als erfolgreiche Analyse. Ein Modell-Aufruf, dessen Response-ID fehlt, schlägt fehl statt als GPT-Entscheidung zu gelten.
- Strategische Aktionen darf ausschließlich das über den authentifizierten Provider erreichte GPT-Modell empfehlen: BUY, HOLD, SELL, WATCH, NO_TRADE. Ein Python-/JS-Technikscore und Quellen-Alerts bleiben **nicht ausführbare Beobachtungen**.
- Die vorhandene Bot-Risikoengine und Ed25519-signierte lokale Agenten-/Paperorder-Schnittstelle bleiben zwingende technische Schutzgrenzen.
- **Wichtig:** Bei ausdrücklich ausgewähltem lokalem API-GPT-Modus wird der GitHub-GPT-Orderkanal über die vorhandenen Prozessvariablen deaktiviert, damit keine zwei strategischen Herausgeber parallel dasselbe Paper-Konto steuern. Der R29-GitHub-Kurier bleibt für Marktberichte und Status erhalten.
- Echtgeld-Swaps, PayPal, echte Wallets, User-API-Keys oder Konto-Details werden **nicht** an öffentliche GitHub-Dateien übertragen. Keine realen Trades.
- Der Laptop muss eingeschaltet sein, der Supervisor weiterlaufen und ein lokal DPAPI-geschützter OpenAI-API-Key einmalig eingerichtet sein. Modell-API-Aufrufe können **separate nutzungsabhängige Kosten** verursachen; ChatGPT-Plus ist kein API-Guthaben. In dieser Entwicklung wurde **kein** kostenpflichtiger echter API-Aufruf ausgeführt.

## System 2 – vollständig getrennte historische GPT-Forschung

- Bestehende historischen Oktober-Originaldaten: 821.849 originale beobachtete Solana-Tokenstarts und 2.296.466 historische Minutenmerkmale über 17 Tage; 408 as-of Researchframes. Dies ist **technische Historik**, nicht 408 GPT-Aufrufe.
- Neu: `research/replay-120d-real/r29-postfreeze-unknown-winner-audit.mjs`. Es betrachtet nach der Freeze-Grenze: Quellzeitpunkt, Zeitpunkt erster **nur behaupteter** GPT-Entscheidung, bereits erfolgter Kursanstieg bei BUY, später beobachtetes weiteres Potenzial, Exit-Entscheidung und fehlende bidirektionale Quotes. Es erkennt zeitlich ungültige Entscheidungen und rechnet deklarierte Beträge **nie** automatisch zu bestätigtem realisierten PnL hoch.
- Der Audit ist **nur POSTHOC**. Referenzfälle wie MAX, AMD, MAMESUKE, FTR und PIERRE dürfen weder in historische Modellinputs noch als feste Suchliste in das Live-Modell gelangen.
- Zehn historische Studien bleiben Ziel: je sieben Vorlauf- plus zehn Handelstage, davon sieben Entwicklung und drei vorab unangetastete Holdouts; jede isoliert mit 5.000 TEST-USDC. Fehlen unabhängige Quell-Latenz-, historische echte GPT-Model-Call- und ausführbare Swap-Nachweise, sind Erträge/Erkennung unbekannt, nicht erfolgreich.

## Dauerhafte Erkenntnisse / Strategie

`research/r29/strategy/validated-knowledge.json` ist **absichtlich leer**, weil bisher KEINE allgemeinen Regeln anhand echter unabhängiger GPT-Strategie-Holdouts erfolgreich bestätigt wurden.

`runner/r29-strategy-knowledge.mjs` lädt nur verallgemeinerte Regeln mit:

1. Status `INDEPENDENTLY_VALIDATED`.
2. Mindestens zwei unterschiedliche unabhängige Holdouts.
3. Mindestens zwei authentisch belegte Evidence-Digests.
4. Trainingszeitraum und Validierungsdatum **nicht später als die virtuelle Entscheidung**.
5. Keinen direkten bekannten Coin-Namen, keine Contract-Adresse, keinen nachträglichen Gewinner-URL im Regeltext.

Hypothesen, Fehlentscheidungen und inkonklusive Ergebnisse werden in Operator-/Research-Berichten dokumentiert; sie werden **nicht** als automatisch erfolgreiche Handelsregeln ins Modell kopiert. Dies ist kein Model-Finetuning und schützt nicht gegen manipulierte GitHub-Commits: Nachweise müssen unabhängig geprüft werden.

## Noch fehlende echte Beweise

1. Kein per GitHub aus der Ferne überprüfter **laufender** lokaler kostenpflichtiger GPT-Service auf dem persönlichen Laptop.
2. Kein durch diese Änderung belegter echter providerbestätigter GPT-BUY-/SELL-Auftrag zu einem **noch unbekannten** Coin.
3. Keine 10 unabhängigen vollständig durchgeführten historischen GPT-Handelstests, keine belastbaren historischen Markt-Exit-Quotes.
4. Kein Prospektivtest, der nachträglich einen tatsächlich vor dem Durchbruch erkannten Gewinner unter verifizierten Risiken beweist.
5. Kein Beleg für organische Social-Adoption über die vorhandenen, zeitlich schwankenden Nachrichten-/Onchain-Quellen hinaus.
6. Kein Echtgeldhandel oder eigenständige lokale Auszahlung aktiviert.

## Reproduzierbare Sicherheits- und Integritätstests

- `node --test runner/central-ai-coordinator.test.mjs runner/r29-strategy-knowledge.test.mjs runner/r29-gpt-strategist-mode.test.mjs`
- `node --test research/replay-120d-real/r29-postfreeze-unknown-winner-audit.test.mjs`
- Bestehende `.github/workflows/tests.yml` Windows- und Linux-Paper-Tests bleiben verbindlich.

## Fortschrittsübergabe

In einem neuen Chat zuerst `SNIPERBOT_R29_START_HERE.md`, `research/r29/operations/R29_LATEST_CHECKPOINT.json` und `research/r29/operations/R29_V4_1_GITHUB_ERFAHRUNGEN_NAECHSTER_CHAT_20261117_DE.md` lesen. Die heute entwickelte GPT-Stratege-/Early-Winner-Ergänzung ist dort nach ihrem tatsächlichen CI-/Merge-Stand zu dokumentieren.

**Nächster echter Abnahmeschritt:** Windows-Supervisor lokal mit bewusst aktiviertem GPT-API-Modus, API-Key und realem frischem Marktfeed starten, tatsächliche Provider-Request-ID und lokal signierte Paper-Auftragsquittung prüfen, ohne Paper-Strategieerfolg oder Gewinn zu unterstellen. Anschließend unabhängige historische Entscheidungsläufe und echte Paper-Forward-Outcomes untersuchen.
