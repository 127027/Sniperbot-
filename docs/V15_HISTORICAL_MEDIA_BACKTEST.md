# R29 V1.5 – 12.10.2026: Markt A gegen Markt+Medien B (24-Scan-Forschungsreplay)

## Experiment und Reproduzierbarkeit
- GitHub \`127027/Sniperbot-\`, Branch \`codex/r29-cleanroom-paper-20261121\`, kein \`main\`, kein alter Bot.
- Zeitraum 2026-10-12T00:00Z bis 2026-10-13T00:00Z, MESZ 02:00 bis Folgetag 02:00. 24 **historische Modellscans** jeweils :35 UTC.
- Auf beiden Seiten exakt dieselben **sechs nachträglich identifizierten** eingefrorenen GeckoTerminal-Poolverläufe unter \`research/training/2026-10-12/frozen-v11\`, identischer 5.000-TEST-USDC-Start und 50 TEST-USDC pro Modell-Kauf, dieselbe hypothetische Gebühren-/Spread-/Slippage-Regel.
- A = V1.2 \`guarded_reentry\` ausschließlich Marktdaten. B = derselbe Algorithmus, der zusätzlich NUR im Scan bereits **publizierte UND zuvor tatsächlich erfasste** Medien mit voller Chain+Contract+Pool-Identität und mindestens zwei unabhängig überprüften Ursprüngen berücksichtigen kann.
- Unter B darf bei erfolgreichem Mediennachweis ausschließlich die **im Forschungsmodell** benötigte Mindestmomentum-Schwelle um einen Prozentpunkt fallen (nicht unter 3%). Kein Eingriff in Take-Profit, Stop-Loss, 6h Reentry-Cooldown, max zwei Käufe je Coin, Liquiditäts-/Sicherheitsfreigabe für reale Paper-Orders. Nicht als reale Bot-Verbesserung bewerben.
- \`src/research-paper-lab.mjs\` hat optional \`mediaEvidence\`, Standardwert \`[]\`; die bestehenden Presets bleiben unverändert. \`test/research-paper-news.test.mjs\` testet echte Cross-Quellen, identische Pools, falsche/alte Posts, doppelt genannte Artikel und Zukunftslecks.

## Gefundene öffentliche Oktober-Archive sind nicht ursprünglich erfasste Scans
- \`https://memefee.com/articles/meme-coin-weekly-news-review-oct-5-11-2026.html\` (rückblickend gefundener Wochenbericht, Datumsangabe 11.10.)
- \`https://memecoin.guru/news/memecoin-tools-weekly-2026-10-12\` (rückblickend gefundener Artikel mit Datumsangabe 12.10.)
- \`https://cryptoticker.io/en/crypto-news/archiv/2026/10/\` (heutiges Monatsarchiv mit 12.10.-Einträgen; nicht alle UTC-Zeitpunkte verifiziert)
- \`https://www.presidency.ucsb.edu/documents/truth-social-posts-october-12-2026\` (nachträglich kompilierte Posts vom 12.10.; kein damaliger R29-Capture)
- Dies sind **publikationszeitbezogene Hinweise**, keine unabhängig im Oktober erfassten Medien-Snapshots, keine verifizierten tatsächlichen Hinweise zu den sechs Pool-Contracts. Quellen können später verändert worden sein. Belege ohne genaue Originalzeit und originales Fetch-Protokoll dürfen historische Entscheidungszeitpunkte **nicht** künstlich beschleunigen.

## Warum V1.5 einen ehrlichen Null-Delta-Test liefern kann
Die R29-Medien-Capture-Infrastruktur wurde erst am 21.11.2026 aufgebaut; \`research/media/state/memory.json\` enthält keine Belege aus ursprünglichen Oktober-Scans. Die sechs eingefrorenen Marktpreis-Tapes sind zudem retrospektiv ausgewählt und führen keinen für B unabhängig bestätigten historischen Token-Contract-Social-Nachweis. Ohne exakte unabhängige, zum Scan erfasste Medien darf B **nicht** mehr Trades erfinden oder als besser gelten.

Das Ergebnis eines gleichen A/B-Modellverlaufs bei fehlenden Medien ist **kein Beweis, dass Medien keinen Vorhersagewert besitzen**. Es bedeutet: Der historische Nutzen ist mit den verfügbaren Daten aktuell nicht messbar.

## Fünf Dot-Rollen im historischen Test und künftig
1. **Dot1 Tempo:** Prüft Belege von Media+Market-Deltas, trennt historische erzwungene 24 Modell-Ticks von 4/8/12/24 echten GPT-Vollreviews. Oktober-Tempo nicht rückwirkend behaupten.
2. **Dot2 Entdeckung:** Vergleicht neue/alte Pools mit damals tatsächlich zugänglichen Post-/News-Snapshots; nachträglich gefundene Gewinner, Artikel und Trend-Behauptungen niemals zum Seed des alten Scans umdeklarieren. Bei jedem zukünftigen tatsächlichen Wake weiterhin öffentliche Media-Capture und Markterfassung.
3. **Dot3 Risiko:** Gegenüber viralen Coins normale unabhängige zeitgerechte Kurse, Liquidität, Contract+Pool, Steuern/Honeypot/Sellability prüfen. Kein historisches ELIGIBLE bei fehlenden Originaldaten; bei Social-/Coin-Namensgleichheit kein Vertrauensvorschuss.
4. **Dot4 Strategie:** A und B zeitgleich mit identischen Gebühren, Positionen, Limits; B berücksichtigt nur vorab erfasste konkrete Quellen, nie ein späteres Erfolgslabel. \`BUY_EXPERIMENT\` im Oktober ist **nicht** \`signals/orders/<id>.json\` oder CLIENT \`PAPER_FILLED\`.
5. **Dot5 Kontrolle:** Quelle/Artikel-ID, Originalpublikation UND erste damalige tatsächliche Erfassung, unabhängiger Ursprung, Pool-/Contract-Bindung, Zukunftsverbot, 24 Scanzeilen, Differenz und fehlende Kontrollgruppe nachweisen. Aktuelle Dots sind informiert, aber es wurden dadurch keine Original-GPT-Dot-Sitzungen im Oktober erzeugt.

## Dateien und Akzeptanz
- \`scripts/replay-v15-historical-media.mjs\`: wiederholbarer Modelltest, JSON+CSV in \`probe-artifacts/r29-v15-oct12-market-vs-media.*\`.
- \`.github/workflows/cleanroom-tests.yml\`: bei Änderungen Test und V1.5-Replay inkl. Artefaktupload.
- \`research/backtests/2026-10-12/iterations/11-v15-media-news-ab.md\` und \`.json\`: zusammengefasster versionierter Endbericht; alle 24 Modellscans.
- \`docs/MEDIA_TREND_V14.md\`: laufende künftige öffentliche Medienerfassung, unabhängig vom historischen, nachträglich recherchierten Archiv.

**Kein Echtgeld, keine Order-Veröffentlichung, keine Änderung am echten virtuellen Kontostand, keine Behauptung garantierter Profitabilität.**

## Künftiger sauberer News-A/B-Test
Erst mit wirklich vor einem neuen, unbekannten Scantag gesicherten Medien- und Marktdaten, vollständiger Identität, gleichen Kandidaten für A/B und einer nachfolgenden 24h-Label-Kohorte aus Gewinnern UND Nichtgewinnern lässt sich ermitteln, ob News die Trefferquote, Reaktionszeit oder Handelsleistung verbessern. Eine vollständige Twitter/X-Abdeckung ohne API-Zugang darf nicht behauptet werden.
