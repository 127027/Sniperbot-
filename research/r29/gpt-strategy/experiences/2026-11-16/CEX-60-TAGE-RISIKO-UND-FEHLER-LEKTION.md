# Erfahrung · 60 historische Tage · Drei CEX-Kursmodelle verloren

**Am 16. November 2026 dokumentiert.** Ursprung: echte historische Binance-1h-Kerzen, zwölf **rückblickend ausgewählte** bekannte Memecoin-Paare, Zeitfenster 18.09.–16.11.2026, die Signale sind **deterministische as-of-Preisindikatoren**, keine tatsächlichen historischen GPT-Entscheidungen und **keine ausführbaren DEX-Orders**.

**Gefrorene Ausgangsbedingungen:** 5.000 TEST-USDC, Ein-/Ausstiegs-Modell mit jeweils 1 % Kosten, nächster verfügbarer historischer 1h-Eröffnungskurs, 60 Kalendertage einschließlich unvollständigem Endtag.

| Test | Risikoeinsatz | Geschlossene Gewinner/Verlierer | Indikative Endequity | Veränderung |
|---|---|---:|---:|---:|
| A | 50 TEST-USDC je Position, bis drei Slots | 3 / 30 | 4.895,38 | −104,62 |
| B | dynamisch 50–5.000, bis fünf Slots | 4 / 22 | 2.497,62 | −2.502,38 |
| C | 250/100/50 je nach damals offener Slotanzahl, bis drei Slots; exakt dieselben Kauf- und Ausstiegssignale wie A | 3 / 30 | 4.801,78 | −198,22 |

**Positive Ereignisse im C-Schattenmodell:** Gewinne am 21.09. (NEIRO +7,75), 22.09. (PNUT +41,91) und 23.10. (PEPE net +44,04, bestehend aus einem Gewinn und einem Verlust am selben Tag). Insgesamt **19 negative Tages-Abschlüsse**, 3 positive und die übrigen ohne realisierten PnL. Einzelne negative Ereignisse: BOME am 24.09. −35,09 und PNUT am 04.11. −28,65. **Modell** bedeutet, dass der Bot diese Trades nicht tatsächlich abgesetzt hat.

**Zentrale Lernerfahrung – vorläufig, nicht ergebnisoptimiert:** Eine reine Kursmomentum-/Volumenstrategie ohne neutral entdeckte neue Token, unabhängige Marktquellen, Contract-/LP-/Wallet-Sicherheitsnachweise und früh beurteilbare Social-Trends ist **nicht als profitable Memecoin-Strategie nachgewiesen**. Das Hochskalieren der Einsätze hat diese 60 Tage nicht verbessert. Diese Erkenntnis rechtfertigt, weitere sichere historische und Forward-Paper-Beweise zu fordern; sie rechtfertigt NICHT, den früheren eingefrorenen Test nachträglich zu verbessern oder zu behaupten, GPT hätte historische Gewinne erzielt.

**Risikoregel:** Der isolierte historische Sensitivitätstest mit 250 USDC ist KEINE Freigabe für einen produktiven 250-USDC-Kauf im vorhandenen Laptop-Paper-Bot. Bis zu einer ausdrücklich genehmigten Änderung gelten die bisherigen vorsichtigen lokalen Limits, Contract- und Sellability-KO-Regeln. Der Nutzer entscheidet über eine spätere Echtgeldfreigabe gesondert.

**Forschungsstatus:** `LOSS_PATTERN_REAL_CEX_PRICE_SHADOW_VALIDATED`, `GPT_MEMECOIN_STRATEGY_OUTCOME_UNKNOWN`, `LESSON_UNVALIDATED_FOR_FUTURE_DEX_TRADING`.

**Tatsächliche Quellen und Nachweise:**
- `research/replay-120d-real/results/60_TAGE_HANDELSTABELLE_ECHTE_CEX_PREISE_MODELLIERTE_TRADES.csv`
- `research/replay-120d-real/results/60_TAGE_STAFFELEINSATZ_50_100_250_CEX_KURSMODELL.csv`
- `research/replay-120d-real/results/60_TAGE_STAFFELEINSATZ_CEX_69_TRANSAKTIONSEREIGNISSE.json`
- `research/replay-120d-real/60_TAGE_HANDELSTABELLE_PREISMODELL_A_B_C_ERGEBNIS_DE.md`
- Validierter CI: https://github.com/127027/Sniperbot-/actions/runs/43943034647

**Nur künftig wirksam:** Neue GPT-Entscheidungen lesen diese Erkenntnis, vergleichen sie mit weiteren **unbekannten** Kandidaten und unabhängigem Forward-Paper-Test; ursprüngliche historische Signale und die 60-Tage-Ergebnisse bleiben eingefroren.
