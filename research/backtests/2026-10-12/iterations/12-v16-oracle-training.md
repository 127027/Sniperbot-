# R29 V1.6 – Oracle-Forschung und Backtest-Vergleich

**Testdatum:** 12. Oktober 2026 (02:00–02:00 MESZ), **GitHub Action:** [Oracle-Test](https://github.com/127027/Sniperbot-/actions/runs/44957005930). Keine echte historische Dot-Order und kein Windows-PAPER_FILLED-Beleg.

## Was die neue Nutzer-ZIP tatsächlich liefert
- **65** rückblickend ausgewählte historische Poolmeldungen, **16** eingetragene Pooladressen/-IDs, davon **15** formal gültig; **1 ungültige Base58-Solana-ID**: MarsX Nr. 22. **7** eingetragene Contract-Adressen, aber nicht unabhängig auf historische tatsächliche Sellability verifiziert.
- **6** davon haben bereits eingefrorene, nachträglich rekonstruierte 5-Minuten-Kursreihen. **10** weitere eingetragene Pool-IDs haben hier noch keine eingefrorene Kurvenbasis; **49** Meldungen besitzen keine Pool-ID. Die ZIP selbst enthält **keine tatsächlich ausgeführten historischen Oracle-Trade-Ergebnisse**. Das Originalskript wurde vor Integration geprüft; Symbolgleichheit ist kein Contract-Sicherheitsbeweis.

## Theoretischer Close-zu-Close-Oracle (MESZ)

| Coin | Günstigster früherer Close | Bester späterer Close | Maximale theoretische Veränderung | 5m-Kerzen im Tag |
|---|---|---|---:|---:|
| BNBCAT | 09:55 | 14:20 | +16607.3 % | 194 |
| Smoking Inu SI/WETH | 05:45 | 07:25 | +2330.9 % | 57 |
| Smoking Inu SI/NVDA | 05:35 | 09:15 | +1145.4 % | 249 |
| 파랭이 SKHYB | 08:55 | 13:50 | +1787.6 % | 206 |
| 파랭이 USDT | 16:55 | 01:35 | +2387.9 % | 110 |
| Marginalia MARG | 02:25 | 05:25 | +492.0 % | 205 |

**Unbedingt beachten:** Dies sind nachträglich ausgesuchte BESTE Schlusskurse, keine damals auffindbaren Kauf- und Verkaufssignale, keine ausführbaren Fillpreise. Candle-Wick-Extrema bleiben als gesonderte nicht ausführbare Grenzen. Der ungewöhnliche BNBCAT-Rolling-Prozentwert und der behauptete Coinranking-ATH sind verschiedene Metriken und werden nicht gemittelt.

## Vergleich auf identischer Datenbasis

| Kennzahl | V1.2 – guarded_reentry | V1.5 – Markt+belegbare News | V1.6 – Oracle-Audit |
|---|---:|---:|---:|
| Eingefrorene historische Pools | 6 | 6 | 6 |
| Modellkäufe | 6 | 6 | 6 |
| Modellverkäufe | 6 | 6 | 6 |
| Realisierter Modell-PnL, TEST-USDC | -5.30 | -5.30 | -5.30 |
| Echte Oktober Dot-4-Orders/Client-Fills | 0 | 0 | 0 |

**Kein PnL-Verbesserungsnachweis:** Die Forschungsstrategie wurde absichtlich nicht rückblickend auf die nachträglich bekannten besten Trades optimiert. V1.6 erweitert die Fehlerdiagnose und trennt kausale Prognose-Merkmale von Zukunfts-Labels.

## Prognosewissen und spätere Auswertung

- **144** Features-Datensätze: 24 historische Forschungs-Scans × 6 eingefrorene Pools, nur bereits abgeschlossene Kerzen.
- **432** spätere Zielwerte für 1, 3 und 6 Stunden: **170** anhand vorhandener Kurven auswertbar; **262** wegen fehlender Folgekurven UNBEKANNT. Fehlende Kurven werden nicht als negatives Label behandelt.
- Keine auf unbekannten Verlierer-/Seitwärtscoins kalibrierten `P(+20 %/+50 %/+100 %)`-Wahrscheinlichkeiten; Werte bleiben `null`, nicht erfunden.
- Der reale prospektive V1.6-Test [Action 44957431417](https://github.com/127027/Sniperbot-/actions/runs/44957431417) hat erstmals neue `research/forecasts/`-Schnappschüsse geschrieben. 100 Kandidaten wurden vorläufig geführt, **0 ausreichend mehrfach beobachtet und rankbar** – daher noch kein kalibrierter Forecast, keine Order.

## Rollenverteilung
**Dot 1:** GPT-Cadence nach tatsächlich beobachteter Markt-/Medienaktivität, nicht aus Oracle-Kurven.
**Dot 2:** Unbekannte neue, alte und reaktivierte Pools ohne Bekanntgabe der 65 Gewinnnamen finden.
**Dot 3:** Identität, Preis-/Liquiditätsquellen, BNBCAT-Konflikt, ungültige MarsX-Adresse, Tax/Honeypot/Sellability prüfen.
**Dot 4:** `FEATURES_PAST_ONLY` für 1/3/6h Prognosen; ohne ausreichende Kalibrierung Wahrscheinlichkeiten `null`; Paper-BUY nur nach echter Risikofreigabe.
**Dot 5:** Oracle als **erst nach dem Ergebnis** freigeschaltetes Kontrollwerkzeug nutzen, Fehlerdiagnose und Holdout-Auswertung führen.

## Grenzen und nächster belastbarer Meilenstein
Ein **unbekannter zukünftiger Zeitraum** mit allen tatsächlich gesehenen Pools einschließlich Nichtgewinnern, wenigstens zwei zeitlich getrennten Beobachtungen pro Kandidat und anschließend vollständigen 1/3/6h-Folgequoten. Erst dann richtige Präzision, Recall, Fehlalarme und Netto-PnL getrennt von Oracle messen. Kein Echtgeldhandel, keine Änderungen am bestehenden Paper-Konto.

Quellen: Original-ZIP `R29_Oracle_Training_2026-10-12(1).zip`; komprimierter abgeleiteter 65er-Identitätsindex `research/training/2026-10-12/oracle-source/manifest-65.min.gzip.base64`; 6 eingefrorene `research/training/2026-10-12/frozen-v11/oct12-candles-*.json`; Modul `src/oracle-training.mjs`; Replay `scripts/replay-v16-oracle.mjs`. Original-Manifest-SHA256 `e61a5cec7201a118c99df0a4988239776ae4685b358e576bcc57034cf3333760`.
