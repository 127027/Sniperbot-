# Erfahrung E – echte spätere Preisfolgen abgelehnter Memecoins prüfen

**Veröffentlicht:** 16.11.2026 · **Evidenztyp:** rückblickende Auswertung tatsächlicher historischer Solana-Transaktionen anderer Wallets, keine GPT-Order.

## Ausgangslage

Im chronologisch getrennten 15.10.2026-Research wurden sechs neutral gestartete Solana-Tokens mit nur zum damaligen Scan bekannten Transaktionszahlen bewertet: **2 WATCH, 4 NO_TRADE**. Keine unabhängigen Contract-/Pool-Sellability-/USDC-Kaufquotes; deshalb kein BUY.

Originale, unveränderliche Entscheidungen: `research/replay-120d-real/reviews/2026-10-15-six-neutral-real-frames-current-gpt.json`.

## Erst später bekannt gewordene Ergebnisse

Die vier vollständigen Swap-Dateien (zusammen **42.230.410** echte historische Transaktions- und Fehlerdatensätze) wurden über alle **48 neutral** ausgewählten Mints ausgewertet. Anschließend wurden die sechs **bereits festgehaltenen** Entscheidungen gegen spätere echte Trades **derselben Mint-, Pool-, Venue- und Quote-Identität** verglichen.

- Für **einen** zuvor mit WATCH bewerteten Mint (`DKqreigeHRrprvz7zduATdY3442dgVbsuhMSZ35Ppump`) liegt ein vergleichbarer späterer Transaktionspreis vor. Maximal beobachtetes Verhältnis zum damaligen Referenzpreis: **0,97830786×**, kein beobachteter Preisanstieg von +75 %.
- Für die übrigen **fünf** Coins war keine ausreichend vergleichbare spätere Marktquote vorhanden. **UNKNOWN**, weder „richtig abgelehnt“ noch „verpasster Gewinner“ beweisbar.
- Damit: **0 belegte verpasste +75-%-Preisrallys in dieser Sechsergruppe**, aber **nicht** „alle sechs Entscheidungen richtig“. Keine unabhängige Ausführbarkeit für eigene 50–5.000 TEST-USDC-Orders nachgewiesen.
- Original-Entscheidungen waren heutige, retrospektive GPT-Bewertungen eines historischen Frames, keine im Oktober archivierten tatsächlichen GPT-Calls.

**Quelle und Quittung:** `research/r29/operations/outcomes/2026-11-16/2026-10-15-six-real-coin-posthoc-summary.json`; [GitHub-Echtmarkt-Audit](https://github.com/127027/Sniperbot-/actions/runs/43924304306).

## Konkrete, nur künftig anzuwendende Lernregel

1. **Jeden** neuen WATCH/NO_TRADE mit eindeutiger Mint/Chain/Pool-ID und Evidenzhash auf eine Watch-/Outcome-Liste setzen; nicht nur später erfolgreiche Coins auswählen.
2. Zeitlich später dieselbe Pool-/Venue-/Quote-Identität und damalige Datumsgrenze überprüfen. Spätere ATH oder rückblickende Social-News niemals rückwirkend in frühere Entscheidung übernehmen.
3. Bei belegtem späterem Ausbruch erst prüfen, ob vor dem Scan belastbare organische Käufer, Sicherheits-, LP- und Exit-Signale verfügbar waren. Ein Preissprung ist **kein** Beleg, dass der frühere BUY sicher und ausführbar gewesen wäre.
4. Hypothese als `UNVALIDATED` schreiben, Gegenbeispiele und Data-Gaps erfassen, nur **neue Forward-Paper-Perioden** dürfen einen Strategieeffekt bestätigen.
5. KO-Sicherheitsregeln niemals lockern, nur um „verpasste Gewinner“ zu reduzieren.

**Ergebnisstatus:** `AUDIT_COMPLETE_SIX_WITH_FIVE_UNKNOWN` · `MODEL_IMPROVEMENT_NOT_YET_PROVEN` · `PAPER_ONLY`.
