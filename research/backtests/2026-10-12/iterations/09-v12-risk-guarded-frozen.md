# R29 V1.2 – Dot3-Risikotrichter und Dot4-Wiedereinstiegsschutz (12.10.2026)

**GitHub Actions:** [V1.2-Vergleich 44935405562](https://github.com/127027/Sniperbot-/actions/runs/44935405562) erfolgreich, **115/115 Tests**. Benutzt sechs **bytegleich eingefrorene** historische Pools unter `research/training/2026-10-12/frozen-v11`. Kein Live-Order-Publisher und kein Wallet-Zugriff.

## Ergebnis für identisches historisches Universum

| Metrik | Exploratory V1.1 | Guarded Reentry V1.2 |
|---|---:|---:|
| Modell BUY | 18 | 6 |
| Modell SELL | 17 | 6 |
| Gewinne bei geschlossenen Modelltrades | 7 | 4 |
| Verluste bei geschlossenen Modelltrades | 10 | 2 |
| Offene Positionen (unbewertet) | 1 (50 TEST-USDC eingesetzt) | 0 |
| Nur realisierte Modell-PnL, TEST-USDC | −109,08 | **−5,30** |
| Unterschied realisierte PnL | – | **+103,78 TEST-USDC** |
| Tatsächliche Dot4-Orders / Client-Fills | 0 / 0 | 0 / 0 |

Erklärung: `guarded_reentry` beschränkt wiederholte Einstiege in denselben Coin (max. zwei BUYs pro Tag, sechs Stunden Cooldown), benötigt mindestens drei bereits abgeschlossene Kurskerzen, min. 500 USD 5-min-Volumen und jüngste Preisspanne max. 3x. Es verwendet die **gleichen** aus den historischen Kerzen verfügbaren Informationen, keine nachträglich eingesehenen Gewinner-/Verlustlabels. Es ist dennoch auf diesem entblindeten Trainingstag in-sample und daher **kein prospektiv bestätigter Vorteil**. Der alte offene Trade hat einen unbekannten Marktwert, sodass die reine realisierte PnL-Differenz nicht der Totalrendite entspricht.

## Guarded-Reentry Modelltrades nach Coin

| Coin | BUY | SELL | Nur realisierte PnL TEST-USDC |
|---|---:|---:|---:|
| Marginalia MARG | 1 | 1 | 13.86 |
| Smoking Inu SI/NVDA | 2 | 2 | 26.48 |
| 파랭이 SKHYB | 2 | 2 | -54.03 |
| 파랭이 USDT | 1 | 1 | 8.39 |

## Vollständige 24 stündliche Forschungs-Scans (MESZ)

| # | MESZ | Modellbekannte Pools | Guarded BUY | Guarded SELL |
|---:|---|---:|---:|---:|
| 1 | 02:35 | 1 | 0 | 0 |
| 2 | 03:35 | 1 | 1 | 0 |
| 3 | 04:35 | 1 | 0 | 1 |
| 4 | 05:35 | 1 | 0 | 0 |
| 5 | 06:35 | 3 | 0 | 0 |
| 6 | 07:35 | 3 | 0 | 0 |
| 7 | 08:35 | 3 | 1 | 0 |
| 8 | 09:35 | 4 | 0 | 1 |
| 9 | 10:35 | 5 | 0 | 0 |
| 10 | 11:35 | 5 | 1 | 0 |
| 11 | 12:35 | 5 | 0 | 1 |
| 12 | 13:35 | 5 | 0 | 0 |
| 13 | 14:35 | 5 | 0 | 0 |
| 14 | 15:35 | 5 | 1 | 0 |
| 15 | 16:35 | 5 | 0 | 0 |
| 16 | 17:35 | 6 | 0 | 0 |
| 17 | 18:35 | 6 | 1 | 0 |
| 18 | 19:35 | 6 | 1 | 1 |
| 19 | 20:35 | 6 | 0 | 0 |
| 20 | 21:35 | 6 | 0 | 0 |
| 21 | 22:35 | 6 | 0 | 0 |
| 22 | 23:35 | 6 | 0 | 0 |
| 23 | 00:35 | 6 | 0 | 1 |
| 24 | 01:35 | 6 | 0 | 1 |

## Tatsächliche Dot3-Risk-Pipeline – nächste technische Arbeit

Dot3-Livejournal von 2026-11-21T18:22:01Z: 20 Kandidaten, davon 0 ELIGIBLE; 3 WATCH, 2 REJECTED, 15 DATA_GAP. Die neue **diagnostische** Worklist `src/risk-recheck-queue.mjs` zeigt in diesem Bericht: 19 ohne bestätigte zwei unabhängige Detailpreisquellen, 1 mit Kursabweichung >3%, 19 mit fehlender/zu geringer Liquidität auf mindestens einer Seite, 20 ohne nachweisbaren Anbieterquote-As-of-Zeitpunkt und 20 ohne unabhängige Sellability-/Honeypot-/Tax-Prüfung. 18 Captures waren zur Laufzeit bereits zu alt für aktuelle BUY-Quoten. **Kein Feed darf deswegen automatisch ELIGIBLE werden.**

Die fünf Dots bleiben die eigentliche Cloud-Automation, nicht dieses offline laufende Modell. Dot3 soll jetzt die fehlenden Evidenzen priorisiert nacherheben und mit Git-Blob-SHAs belegen; Dot4 darf nur frische, unabhängig bestätigte Fälle Paper-kaufen und dann GitHub Order und Client-Receipt nachweisen.

**Schluss:** Größerer *in-sample* Verlustschutz belegt, 0 echte Paper-Trades unverändert. Der folgende unabhängige Prospektiv- oder vorab festgelegte Holdout-Tag muss diese Strategie ohne Nachoptimierung validieren.
