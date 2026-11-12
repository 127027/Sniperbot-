# R09 – Vier Rollenberichte und vorläufige QA-Auswertung

**Stand:** 12.11.2026. **Keine finale unabhängige 5-Agenten-Bewertung.**

## Status
- News/Scout: COMPLETED im Github-R09-Role-File, 10/10 Quell-Stichprobenbeiträge, 12 vorläufige narrative/symbol/mint-Beobachtungen, 5 eigenständig dokumentierte Suchen, 0 strenge originale historische as-of-Belege, 0 Kaufadvisories.
- Onchain: COMPLETED im Github-R09-Role-File, 10/10 Quell-Stichprobenbeiträge, 5 Befundgruppen, 5 weitere Such-/Quellprüfungen; keine damalige Mint-/Pool-/Slot-Rekonstruktion oder ausführbare Kaufen-/Verkaufen-Quote, 0 Kaufadvisories.
- Social: Im aktuellen Chat nach einem Automations-`run_now` als `inline_run` erledigt, 10/10 Quell-Stichprobenbeiträge, 6 Befundgruppen, darunter 7 vorläufige Coinsymbol-Namen und originale Social-Themen ohne Mint. **Nicht** als unabhängiger Cloud-Dot-Lauf zählen.
- Security: Im aktuellen Chat nach einem Automations-`run_now` als `inline_run` erledigt, 10/10 Beiträge, 2 vorläufige angegebene Mints überprüft, beide mangels archivierter 2024-Chain-/Accountdaten `UNKNOWN` ohne Sicherheits-PASS. **Nicht** als unabhängiger Cloud-Dot-Lauf zählen.
- Opportunity QA: R09-Rollendatei bleibt **PENDING**, da die zwei in diesem Chat ausgeführten Berichte nicht als unabhängige Cloud-Dot-Attestierungen gelten dürfen. Eine finale fünf-Rollen-Leistungsmessung darf erst aus wirklich separaten, nachvollziehbar datierten Ausführungen erfolgen.

## Was R09 jetzt überprüfbar besser kann als R07
R07: Der strikte Eingang war 0/61 historische belegte Eingaben. Alle fünf Rollen meldeten BLOCKED, ohne nachweisbar unabhängige Tokenstart-Erkennung.
R09: **Entdeckung und Handelbarkeit getrennt.** Der Scout und Onchain identifizieren in einer bewusst kleinen Datumsstichprobe 2024 veröffentlichter, aber heute eingesammelter Reddit-Beiträge beispielsweise HORSEMEAT, POPCAT, RETARDIO am 09.10.2024, KENDU/SLOTH/BRETT am 13.10.2024 und MAU am 05.11.2024. Reddit-Kontraktbehauptungen zu HORSEMEAT und MAU bleiben nur provisorisch. Gleiches Symbol ist nicht gleicher Contract; ohne Pooladresse keine technische handelbare Identität. Negative Fälle und Werbung werden ebenfalls ausdrücklich beobachtet.

## Wieso das noch keine nachgewiesene Früherkennung ist
- Die 10 Reddit-Beiträge wurden **2026** ausgewählt und sind weder eine 61-Tage-Vollerhebung noch ein neutrales blindes Internet-Suchresultat. Es gibt kein bekanntes vollständiges Positiv-/Negativ-Denominator.
- Die Originaltexte könnten später verändert worden sein. Ohne alte verifizierte gespeicherte Textbytes ist ein damaliges `first_seen` nur die Plattform-Datumsbehauptung.
- Keine der Rollen konnte Original-TX-/Slot-basierte historische Pool-/Preis-/Sellability-Daten für 2024 nachweisen.
- Es gibt keine verifizierte ursprüngliche Story → Token → damaliger BUY-Quote → Preisanstieg → damals ausführbarer Exit-Pipeline. Deshalb 0 belastbare historische Paper-Kaufempfehlungen, 0 simulierte Trades, keine Profit-, Erfolgsquote oder kalibrierte Wahrscheinlichkeit.
- `run_now` lieferte für Social und Security `inline_run`, nicht die getrennte Ausführung der bisherigen stündlich aktiven Cloud-Dots. Das wurde in den zwei Ergebnisdateien explizit als `execution_provenance` dokumentiert. `runner/dot-r09-quality-gate.mjs` sperrt die unzulässige Behauptung eines vollendeten unabhängigen Fünf-Dot-Tests.

## Wie wir die echten Dots künftig prüfen
1. Mit der unabhängigen, regulär geplanten Ausführung zunächst nur die **tatsächlich aufgetretene** Quelle+Capturezeit der Social-/Onchain-Funde archivieren. Bereits im Chat erledigte R09-Dateien nicht einfach nachträglich als eigenen Agentenerfolg umetikettieren.
2. Jede Rolle braucht ein echtes eigenständiges Ergebnis mit `execution_provenance=INDEPENDENT_SCHEDULED_DOT_RUN`, nachvollziehbarer Laufidentität und eigenen unabhängigen Rechercheschritten. Solange das fehlt, bleibt QA-Attestierung offen.
3. 2024-Ledger historisch durch archivierte Originaltransaktionen mit Slot/Blockzeit nachbilden; tatsächliche 2024-Quote/Risk-/Sellability-Gegebenheiten belegen. Archivdatenkosten/-abdeckung genau prüfen.
4. Für belastbare frühzeitige Erkennung echte historische Full-Cohort-Daten mit Fehlstarts und zeitlich gesperrten originalen Social-Messages brauchen. Ein paar vorab vorgewählte Funde sind kein fairer Zufalls-/Holdout-Test.
5. Im Normalbetrieb die Live-Funde ab sofort mit UTC-Erstbeobachtung konservieren – dann sind echte zukünftige Prospektivtests möglich.

**Sicherheitsgrenzen:** Keine Trading-Engine, keine Wallet, keine PayPal-Verbindung, keine Paper- oder Echtgeld-Order geändert.
