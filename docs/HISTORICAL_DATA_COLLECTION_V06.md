# V0.6 — Historische Daten richtig rekonstruieren, statt NO_TRADE zu erzwingen

Die öffentliche GeckoTerminal OHLCV-Schnittstelle dokumentiert Rückfragen mit \`before_timestamp\` und 1/5/15-Minuten-Kerzen. Eine kostenlose, eigenständige Forschungsoption liegt in \`scripts/reconstruct-gecko-candles.mjs\`.

Beispiel **nur mit vorher unabhängig identifiziertem Pool**:
\`node scripts/reconstruct-gecko-candles.mjs 2026-11-15 bsc 0x...\`

Der Befehl nutzt ausschließlich öffentliche Daten und schreibt nach \`research/reconstructions/YYYY-MM-DD/\`. Er gehört NICHT zum lokalen Paper-Client und sendet keinerlei Order. Der hier verfügbare Connector stellt keine externe HTTP-Antwort der OHLCV-API bereit; ein erfolgreiches Live-Resultat wird nicht behauptet.

**Ohne Verfälschung**:
- Pooluniversum vor Analyse festlegen. Falls aus späterer Launchliste gewonnen, alle gelisteten Pools (einschließlich Verlusten) erfassen und die Stichprobenziehung dokumentieren. Der November-15-Tag wurde bereits entblindet: künftige Anpassung daran ist TRAINING, nicht unabhängiger Holdout.
- Für jede Candle liegt \`known_no_earlier_than_utc\` am **Ende** ihres 5-Minuten-Fensters; die spätere Schlusskursbewertung darf keine Hoch-/Tiefpreise der noch laufenden Candle verwenden.
- Anbieter-Retro-OHLCV bedeutet nicht, dass die Seite damals vom Dot gesehen wurde. Ein Candle allein ist außerdem weder historische Pool-Liquidität noch unabhängige zweite Preisquelle, Authentizitäts- oder Sellability-Beweis.
- Erst wenn die zweite tatsächlich unabhängige Quelle, zeitliche Chain/Contract/Pool-Identität, damals gültige Liquidität und Risikogates nachgewiesen sind, darf eine **historische** BUY-/SELL-Leistung behauptet werden.
- Historische Datenlücken werden mit \`DATA_GAP\` ausgewiesen; das ist kein „fehlender Markt“.
- Synthetische Unit-Tests für Orderausführung bleiben davon getrennt.

Quelle: https://skmtc.dev/geckoterminal/apis/geckoterminal-api-v2/docs/networks/:network/pools/:pool_address/ohlcv/:timeframe/get

Unterstützt keine historische Echtzeit-Rekonstruktion der originalen Agenten-GPT-Entscheidung: diese muss als Replay der festgelegten Strategie separat erfolgen.
