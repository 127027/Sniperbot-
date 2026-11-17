# R29 – Verlustreduktions-Hypothesen aus dem neuesten 60-Tage-Replay (17.11.2026)

**Status:** GPT-verfasste Forschungsannahmen im Bot-Repository, **NICHT** aktivierte Handelsregeln, keine Änderung am Laptop, Ledger oder Echtgeld-Gate.

## Quellen und Ablauf

- Unveränderter Evaluationszeitraum: **18.09.–16.11.2026**, 60 UTC-Kalendertage.
- Der historische 43-Tage-Feature-Satz wurde **wirklich** aus dem erfolgreichen GitHub-Actions-Artefakt 14265305978 / Run 43944372099 wiederhergestellt, geprüft und in einer neuen Fassung der von GPT festgelegten Entscheidungspolitik ausgewertet.
- Die archivierten, as-of eingeschränkten 43 × 24 = **1.032** Stundenframes enthalten 8.256 neutrale Kandidaten-Beobachtungen. Dies ist eine retrospektive, nachträglich veröffentlichte Stichprobe, keine damals vollständig zugängliche GPT-Datenbank.
- Aktuelle R29-Risikopolitik im **reinen Research-Proxy**, **niemals** vom Ausführungsbot selbst strategisch bestimmt:
  `research/replay-120d-real/gpt-authored-60d-policy-proxy.mjs` mit dediziertem Unit-Test und Workflow `.github/workflows/r29-gpt-60d-policy-proxy.yml`.
- Der lokale Python-Kontrolllauf auf den wiederhergestellten 43 Tagesarchiven ergab **513** dynamisch ausgewählte Vollanalysen (Forschungs-Proxy, keine GPT-Modelldurchläufe), **9** Scan-Zeitpunkte mit engeren WATCH-Kandidaten und **17** Tage mit nicht verfügbaren Minutenfeatures; die wiederhergestellten Inputs stimmten nach Source-SHA/Zeilenzahl mit dem archivierten Manifest überein. Diese Zahlen sind **keine Trade-Performance**. Die nach GitHub übertragene Node-Version muss denselben Datensatz unabhängig in CI replizieren.

## Warum die Strategie nicht einfach sofort BUY macht

Ohne unabhängige **historisch zeitgerechte** Prüfung von Contract/Authority, Pooltiefe, Wallet-Manipulation, beidseitigen ausführbaren Quotes und realistischen Gebühren kann eine frühe Kurs-/Buy-Dynamik ein Rugpull oder Fake-Volumen sein. In diesem Fall **WATCH**, keine fingierte Ausführung.

Frühe Warnfilter (nur vorläufige, auf dem beobachteten Zeitraum entwickelte Forschungs-Hypothesen):

1. **Sofortiger Research-Ausschluss** bei belegtem `flag_creator_sold`, `flag_bundle_dumped`, `flag_serial_rugger_creator`, `flag_pool_drained`, `flag_curve_closed_low` oder `flag_migrate_below_grad`.
2. **Konzentrationsfilter:** Kein positives WATCH bei Entwickleranteil ≥5 % oder Insideranteil ≥5 %. Werte über 15 % / 20 % sind zusätzlich ein harter Ausschluss in diesem Proxy. Diese Schranken sind **noch nicht empirisch als profitabel validiert**.
3. **Creator-Vergangenheit:** WATCH nur, wenn mindestens 5 relevante ältere Fälle erfasst sind und der beobachtete frühere Rug-Anteil höchstens 30 % beträgt. Unbekannte Historie = **UNKNOWN/RESEARCH**, niemals 0 % unterstellen.
4. **Mindestaktivität:** WATCH erst ab 20 frühen aufgezeichneten Käufen, aber Zählung ≠ unabhängige Käufer! Nur zusätzliche Validierung, kein Kaufauslöser.
5. **Keine Garantien mit Score:** Der Forschungs-Score ist 0–100 und **keine Wahrscheinlichkeit** für +1000 % oder die Sicherheit eines Coins. Hypothetische 50/250/500/1000 TEST-USDC-Stressbeträge sind **keine Orders**; echte 5000 TEST-USDC werden nicht durch dieses frühe Sample gerechtfertigt.
6. **Adaptive Analysen:** Nach der im letzten beobachteten Stundenfenster vorliegenden Feature-Aktivität zwischen 1/4/12/24 Forschungs-Scans pro Tag wechseln. Keine Rückdatierung von fehlenden Scans. Dies wurde im Proxy ausgeführt, nicht als historische GPT-Echtzeitüberwachung behauptet.

## Was diese Erkenntnisse noch NICHT bedeuten

- Es gab **keinen nachgewiesenen neuen BUY, HOLD oder SELL**, daher **keinen nachgewiesenen Gewinn und keine gemessene vermiedene Verlustsumme**; 60-Tage-PnL = **UNKNOWN**, nicht 0.
- Ein historischer Token kann 1000 % steigen und trotzdem durch einen der Filter blockiert werden, weil die damalige Rückverkaufbarkeit ungeklärt ist; dies wird als `UNVERIFIED_MISSED_OPPORTUNITY`, **nicht** als sicher verpasster Gewinn dokumentiert.
- Die Grenzwerte sind an der verfügbaren Stichprobe entwickelt worden. Verbesserung auf diesem selben Datensatz ist **kein** Out-of-sample-Nachweis und darf **nicht** automatisiert in die produktive Strategie übernommen werden.
- Um den eigentlichen GPT-BUY→HOLD→SELL-Kreislauf zu testen, fehlen für die meisten Tage historische DEX-Ausführungspreise, tatsächliche Poolreserve-Messungen und Sicherheit; die 60-Tage-Quellenmatrix darf niemals Datenlücken als erfolgreiche NO_TRADE-Tage darstellen.

**Nächste Prüfung:** erst vollständige historische bidirektionale DEX-Quotes und unabhängige Contract-Sicherheit für eine neutrale, vorher ausgewählte Kohorte beschaffen; dann den exakt eingefrorenen Forschungsansatz gegen neue, außerhalb der Entwicklung liegende Handelstage prüfen, mit Gebühren, Slippage und Exit-Liquidität. Bestehendes Paper-Ledger und Echtgeldsperre unverändert.
