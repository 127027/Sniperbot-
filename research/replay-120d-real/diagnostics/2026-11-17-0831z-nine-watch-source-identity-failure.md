# R29: Posthoc-Quellenidentität nicht bestätigt (2026-11-17)

**Modus:** HISTORICAL_RESEARCH_ONLY; keine Order, keine PnL-Aussage. **Geprüfter Branch-HEAD:** `c748fff1ba4ae014b548cb92140173d8dd15338b` (2026-11-17T08:31:34Z).

## Reproduzierbarer CI-Befund

GitHub Actions Run [44047483785](https://github.com/127027/Sniperbot-/actions/runs/44047483785), Job 133916685788: 6 Unit-Tests erfolgreich, `posthoc-nine-watch-label-audit.py` scheitert beim SHA-geprüften Quellabgleich mit `ValueError FROZEN_CANDIDATES_NOT_IN_NEUTRAL_LAUNCH_FILE_2026-09-26`. Kein gültiges Outcome-Artefakt erstellt. Dies ist ein **Datenidentitäts-Gap**, kein Beweis für einen falschen Trade, Rug, Rally oder einen Gewinn.

Der eingefrorene erste GPT-Retro-Review nennt Mint `4TUxTbpfKTu6iDJCxQDoBTtoVVRiNMFpQNwAjpqupump`, virtueller Scan `2026-09-26T01:00:00Z`, Forschungsentscheidung WATCH. Das Skript lädt `loopholetape/pumpfun-launches` bei Revision `9b9a04e7e3e85775d614d16105daad2e69ce8544`, `data/launches_legacy/2026-09-26.parquet`, validiert die Tages-SHA aus `results/neutral-solana-launch-120-day-coverage.csv` und verlangt exakt gleiche Mint-Identität. Das Fehlersignal folgt **nach** dem SHA-Test; der Grund der fehlenden Übereinstimmung ist noch nicht belegt. Möglich sind verschiedene Erfassungsuniversen oder fehlerhafte Mint-Zuordnung; keine dieser Hypothesen gilt als bestätigt.

## Nächster unabhängiger Prüfschritt

1. SHA-pinned Minutenframe-Quelle des ersten WATCH aus dem Policy-Artefakt 14308549593 und neutralen Launch-Parquet-Satz 2026-09-26 zeilenweise auf Mint, UTC-Launchzeit und Source-ID vergleichen; zusätzlich SHA und Zeilenzahl der jeweiligen Artefakte protokollieren.
2. Prüfen, ob der Mint im **anderen** originalen, as-of begrenzten Feature-Universum enthalten war und ob ein neutraler Launch-Quellbeleg fehlt. Keinen Coin nachträglich austauschen und keine der neun eingefrorenen GPT-Reviews umschreiben.
3. Für nicht matchbare Mints Outcome `UNKNOWN_SOURCE_IDENTITY_MISMATCH` getrennt erfassen; erst nach unabhängiger Quellidentitätsprüfung verbleibende Mints posthoc auswerten. Niemals solche Labels in ursprüngliche Entscheidungsframes zurückschreiben.

Der ältere erfolgreiche [120-Tage-Readiness-Run 44044451031](https://github.com/127027/Sniperbot-/actions/runs/44044451031) validiert Controller-/Readiness-Tests, **nicht** diesen gescheiterten Posthoc-Join und keinen 60-Tage-PnL. Training weiterhin 18/60 Launch-Tage, Holdout 49/60 Launch-Tage, 43/60 Minutenfeatures, 1/60 neutraler vollständiger DEX-Tag, 0/60 nachgewiesene GPT-DEX-PnL-Tage (Stand Quellenmatrix). Echtgeld und Live-Paper-BUY bleiben gesperrt.
