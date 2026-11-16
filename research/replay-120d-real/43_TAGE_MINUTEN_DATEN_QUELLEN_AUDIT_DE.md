# SNIPERBOT R29 – 43 echte Minutensignal-Tage im 60-Tage-Holdout

**16.11.2026.** Ergänzung zum vorherigen 36-Tage-Audit. **Nur historische Quellenprüfung; kein tatsächlicher GPT- oder Paper-/Echtgeld-Handel.**

## Reale Messungen

| Kennzahl | Unverändert geprüfte Quelle |
|---|---:|
| Handelstestzeitraum | **18.09.–16.11.2026 (60 UTC-Kalendertage; letzter Tag nur anteilig)** |
| Tatsächlich archivierte Solana-Tokenstarts im Holdout | **49/60 Tage** |
| Tatsächlich archivierte minute-by-minute historische Forschungssnapshots | **43/60 Tage (24.09.–05.11.)** |
| Echtes Anbieter-Feature-Rohzeilenvolumen | **5.645.886** |
| Stündliche versiegelte Frame-Endpunkte mit Datengrundlage | **1.032** |
| Erste acht verschiedene Token-Feature-Zeilen je Stundenframe | **8.256 Kandidaten-Beobachtungen**, nicht unbedingt 8.256 verschiedene Token |
| Vollständige Tages-Swap-Historie mit konkreten Ausführungen anderer Marktteilnehmer | **1/60 Tage** (15.10.) |
| Durch diesen Replay wirklich historisch erzeugte GPT-Modellaufrufe | **0** |
| Independently belegte eigene historische Paper-/DEX-Käufe und Verkäufe | **0** |
| Beliebige berechenbare verifizierte historische GPT-Portfoliorendite | **Nein** |

**Datensicherheit:** Alle 43 Parquet-Tagesdateien wurden gegen die SHA-256-Hashwerte **derselben eingefrorenen Dataset-Revision** `9b9a04e7e3e85775d614d16105daad2e69ce8544` sowie Zeilenzahlen und Bytegrößen des dazugehörigen README-Metadatentabellenmanifests geprüft. Ausschließlich zeitlich zulässige, explizit aufgelistete Merkmale sind im Forschungs-Frame; die Endlabels zu Rug, Migration, späterer Graduation und ATH, berechnete spätere Ergebnisse sowie das retrospektiv ausgebesserte Warnfeld `flag_curve_drained` sind nicht im Modellinput. Der 1-Stunden-Frame darf Ereignisse erst nach deren aufgezeichnetem UTC-Zeitpunkt sehen.

**Bedeutende Einschränkung:** Der Anbieter weist selbst darauf hin, dass seine Minute-Feature-Stichprobe **nicht zufällig** ist und aktive Token bevorzugt erscheinen können. Diese Quelle ist daher **keine neutrale Vollerfassung aller entstehenden Coins**, selbst wenn innerhalb der aufgenommenen Stundenframes die ersten acht Kandidaten nach Zeit sortiert statt nach späterer Rendite ausgewählt wurden. Frühe Kaufzählungen vor dem Decoder-Fix am 27.09.2026 sind möglicherweise unvollständig. Eine spätere Veröffentlichung der echten archivierten Transaktionen beweist allein nicht, dass die Daten oder das spätere GPT-Modell zum historischen Zeitpunkt genau so verfügbar waren.

## Belege

- **Vollständige 60-Tage-Tagesmatrix** mit getrennten Start-/Minutensignal-/Dex- und GPT-Ausführungsstatus: `research/replay-120d-real/results/REAL_60_DAY_EVIDENCE_MATRIX_43D_2026-11-16.csv`.
- Auf Github eingecheckte Leser- und Sicherheitsprüfungen: `research/replay-120d-real/real-minute-feature-replay.py`, `test_real_minute_feature_replay.py`.
- **43-Tage-Quellen-Prüfung bestanden:** https://github.com/127027/Sniperbot-/actions/runs/43944372099 .
- **43 Tagesdateien der zeitlich abgegrenzten GPT-Eingabeframes als GitHub-Actions-Artefakt:** https://github.com/127027/Sniperbot-/actions/runs/43944372099/artifacts/14265305978 (zeitlich begrenzter Download).
- Primärquelle: https://huggingface.co/datasets/loopholetape/pumpfun-launches
- Quellenqualität und Probleme: https://huggingface.co/datasets/loopholetape/pumpfun-launches/blob/main/KNOWN_ISSUES.md

## Getrennt davon: bereits ausgewertete echte CEX-Kursmodelle

Für 60/60 Tage liegt zusätzlich eine **durch echte historische Binance-Kerzen bepreiste, aber nur modellierte** Handelstabelle vor. Vergleich A/B/C inklusive Staffel-Beträgen 250/100/50 USDC und sowohl Gewinn- als auch Verlust-Trades: `research/replay-120d-real/60_TAGE_HANDELSTABELLE_PREISMODELL_A_B_C_ERGEBNIS_DE.md`. Die Variante C endete modelliert bei **4.801,78 TEST-USDC**, also **−198,22 TEST-USDC**, nach 3 Gewinn- und 30 Verlust-Schließungen. **Das ist NICHT die 60-Tage-GPT-DEX-Trading-Performance.**

## Weiterer Nachweisbedarf vor 24/7 Paper-Live-Reife

- Für dieselben frühen DEX-Mints müssen damals gültige unabhängige Mint-/Freeze-/Creator- und Pool-/Reserve-Proofs sowie bi-direktional ausführbare Quotes mit Kosten und Slippage beschafft werden.
- GPT muss tatsächlich in einem vorab versiegelten Frame seine begründeten BUY/WATCH/HOLD/SELL/NO_TRADE-Entscheidungen erzeugen, mit Prompt-, Quellen- und Ergebnis-Hash sichern und erst später Outcomes aufdecken. Die mögliche spätere Kenntnis des heutigen Modells über damalige Coins ist zu dokumentieren.
- Die inzwischen programmierte **tagesintern dynamische 1/4/12/24-Analysefrequenz** ist nicht identisch mit den alten festgestellten CEX-Preis-Scan-Zeitplänen; ihr 60-Tage-Walkforward-Test anhand echter Signale ist als eigenständiger Arbeitsschritt zu verifizieren.
- Ein 24/7 Forward-Paper-Pfad auf dem echten Windows-Bot erfordert tatsächlich nachgewiesene signierte Signalannahmen, lokale PAPER_FILLED-Quittungen, Positionsüberwachung und unabhängige Notstopps. **Echtgeld bleibt aus.**
