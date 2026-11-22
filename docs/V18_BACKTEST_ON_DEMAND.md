# R29 V1.8 – Trainingsmodus: 5 Dots pausiert, historische Backtests nur auf Anfrage

Stand: 22. November 2026. Ausschließlich Repo `127027/Sniperbot-`, Branch `codex/r29-cleanroom-paper-20261121`. **Keine Änderungen an main, altem Bot, Echtgeld oder bestehenden Paper-Konten.**

## Betriebsentscheidung

Am 22.11.2026 wurden **alle fünf bestehenden ChatGPT-Automationen** des R29-Cleanrooms ausdrücklich deaktiviert (`is_enabled=false`). Die Automationen bleiben erhalten; sie sollen erst nach Nutzerfreigabe wieder planmäßig aktiv werden. Diese Betriebsinformation ist hier nur dokumentiert und wird nicht durch den GitHub-Branch technisch erzwungen. Bereits laufende Jobs laufen möglicherweise noch zu Ende. Andere GitHub-Actions-Prozesse sind davon nicht automatisch pausiert; die Capture-Action reagiert weiterhin nur auf neue `research/requests/**`-Commits.

Die stündlichen Dot-Prompts sind **Live-Forschungsaufträge**, keine historischen Backtest-Befehle. Im Trainingsmodus dürfen sie nicht unverändert als Oktober-2026-Blindtest gestartet werden. Ein On-demand-Backtest muss historische Eingaben und verbotene Zukunftsinformation ausdrücklich getrennt halten.

## Manueller Aufruf aus bestehendem Cleanroom-Branch

Voraussetzungen: Node.js >=20 und unveränderter historischer Quellbestand.

```bash
# Nur auf ausdrückliche Anfrage; keine GitHub-/Paper-Order, keine externen APIs.
node scripts/v18-backtest-on-demand.mjs --date 2026-10-12

# Mit separat belegten zeitgerechten Original-Snapshots:
node scripts/v18-backtest-on-demand.mjs --date 2026-11-22 \
  --input research/backtests/2026-11-22/asof-input.json

# Explizit erzwungene 24 diagnostische Stunden-Takte statt adaptiver Kadenz:
node scripts/v18-backtest-on-demand.mjs --date 2026-10-12 --diagnostic-24
```

Optional `--output probe-artifacts/<name>.json`. Ohne `--input` sind keine vorgetäuschten historischen Quotes verfügbar: Der Bericht zeigt `DATA_GAP_NO_CONTEMPORANEOUS_HISTORICAL_UNIVERSE`, 0 belegte Trades und 0 Paper-Receipts. Der bloße Tagesname ist keine Datenquelle!

### Eingabeschema (keine Oracle-Gewinnerliste)

```json
{
  "schema": 1,
  "kind": "R29_V18_ASOF_REPLAY_INPUT",
  "date": "2026-11-22",
  "selected_from_future_winner_list": false,
  "activity_observations": [],
  "snapshots": []
}
```

`snapshots` müssen die in `src/point-in-time-strategy.mjs` beschriebenen Chain+Contract+Pool-, Dot2-/Dot3-, Quote-, Quellzeit- und Archivfelder tragen. Retrospektiv ausgewählte Gewinnerlisten, künftig erstellte Dateizeitstempel und fehlende Provider-Zeitstempel sind keine historischen Kaufbelege. `SYNTHETIC_TEST` ist ausschließlich für Regressionen zulässig und kann keine damalige Handelsperformance beweisen.

**Wichtig:** Das derzeitige `src/v18-requested-backtest.mjs` überprüft bislang technische Zeitstempel, SHA-Formate und die vorhandenen Ausführungsgates; es kann **nicht unabhängig** beweisen, dass der angegebenen SHA tatsächlich zu einem damals auf GitHub verfügbaren Originalbeleg gehörte oder eine Originalanbieterquote enthielt. Bei Daten mit behaupteter Originalprovenienz ist das Ergebnis daher `PROVISIONAL_ASOF_SOURCE_AUTHENTICITY_NOT_VERIFIED`, bis eine separate externe Prüfung durchgeführt wurde.

## Bewertung der fünf Rollen im Replay

- **Dot 1:** Erfassen, welche 4/8/12/24-Kadenz der deterministische As-of-Cadence-Algorithmus wählen würde.
- **Dot 2:** Prüfen, welche historisch im Input vorliegenden Pools und ihre Quellen bis zum Entscheidungszeitpunkt technisch verfügbar sind; gefundene Pools niemals mit vollständiger tatsächlicher Markt-Discovery verwechseln.
- **Dot 3:** Risiko- und Zitat-Pflichtfelder kontrollieren; fehlende Sellability, Quelle, Identität oder Zeitbelege als Datenlücken/Blocker erfassen. Ein behauptetes `ELIGIBLE` ist allein noch kein authentischer Dot3-Beleg.
- **Dot 4:** Den bestehenden deterministischen Shadow-Handelsalgorithmus ausführen, nicht fälschlich „fünf echte GPT-Analysen“ behaupten. BUY/SELL im Forschungsreplay sind **keine tatsächlichen GPT-Orders**.
- **Dot 5:** Ergebnisquittungen, Datenlücken, unerreichbare Quotezeiten, No-Lookahead und den unabhängigen Holdout prüfen. Zukunftslabels/Oracle erst **nach** der Entscheidungsrekonstruktion vergleichen.

Der 12.10.2026 bleibt ein bekannter **Trainings-/Diagnosetag**. Seine sechs rückblickend ausgewählten OHLCV-Tapes sind ausschließlich für eine separate, als retrospektiv etikettierte Oracle-/Strategie-Forschung zulässig. Die anderen 59 Meldungen dienen nur zur nachträglichen Kontrolle, niemals als anfänglicher Kandidatensatz. Für einen echten Blindtest muss ein vorher unbekannter und hinreichend vollständiger Original-Kandidatenbestand vorliegen, einschließlich Verlusten und Nichtgewinnern.

## Noch fehlende Meilensteine vor erneuter Aktivierung

1. Unabhängiger unveränderlicher Proof für tatsächliche historische Dot2-Funde, Anbieterquotes, Dot3-Freigaben und Sellability.
2. Node.js-Gesamttests (`npm test`) und reproduzierbarer Datum-CLI-Run inklusive Rohlogs/Artefakten.
3. Erfolgreicher abgeschotteter Paper-BUY/SELL-/Client-Receipt-Test mit echten Sicherheitsbelegen ohne Kontostandsverfälschung.
4. Unveränderte Trainingsparameter auf vorher eingefrorenem unabhängigem Holdout prüfen; keine rückblickende Gewinnerauswahl.
5. Die Dots **erst auf ausdrücklichen Nutzerwunsch** wieder aktivieren; dann werden erneut Live-Marktbeobachtungen (aber weiterhin nur Paper-Trading) erhoben.

Ziel ist ein technisch ehrlicher, wiederholbarer Lernzyklus statt eines überoptimierten Gewinner-Rückblicks. „Perfekt“ ist kein belastbares Abnahmekriterium; gemessene Datenqualität, verifizierte Trade-Kette, Kalibrierung und kontrolliertes Risiko sind es.
