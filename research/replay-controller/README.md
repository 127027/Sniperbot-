# Replay-Controller: tatsächlicher Stand und sichere Fortsetzung (R15)

**Stand:** 13.11.2026. Dieses Verzeichnis ist isoliertes historisches Forschungslabor. Kein Live-Bot, keine Wallet, kein Signaturdienst, keine Veränderung eines bestehenden Paper-Kontos.

## Was bereits vorhanden ist

- `controller.mjs` und `engine.mjs`: chronologische simulierte Frames, unveränderliche Hashkette, fünf Rollenentscheidungen als Barrier, nachfolgende simulierte BUY/ADD/HOLD/REDUCE/SELL mit konfigurierbaren Gebühren, Gas, Slippage und Poolteilnahme. Simulation nur dann, wenn ein historisch belegbarer MARKET- und SECURITY-Zustand vorliegt.
- `controller.test.mjs`: neun ausschließlich synthetische Regressionstests. Testdurchlauf ist **kein** historischer PEPE-Erkennungserfolg.
- `reports/existing-corpus-audit.json`: beim letzten Work-Lauf berichtete Prüfung: 116 Manifest-Einträge, 0 Hashabweichungen, 62 historische Tagesstände. Das Protokoll ist ein gespeichertes Audit-Ergebnis, kein unabhängiger Beweis einer vollständigen Marktabdeckung.
- `reports/diagnostic-dataset.json`: **einziger bekannter PEPE-Token**, daher `KNOWN_WINNER`, 5 vorbelastete Kontexte, **0 ausführbare Markt-Events**. Exakt dieses Dataset kann niemals einen glaubwürdigen Gewinner-Blindtest bestätigen.
- `bridge/diagnostic-first-frame/input.json`: erster Tagesframe für 14.03.2023; hat keine Coin-Ereignisse.
- `bridge/diagnostic-first-frame/decisions/scout.json`: eine persistierte Scout-Stimme für den ersten Frame. Die vier anderen Stimmen fehlen; sie dürfen nicht synthetisch nacherzeugt oder als Dot-Ergebnisse ausgegeben werden.

## Neu R15: Diagnose und Import

`bridge-audit.mjs` liest die GitHub-kompatible Übergabe **ohne Schreiboperation**:

```sh
node research/replay-controller/bridge-audit.mjs DIAGNOSTIC research/replay-controller/bridge/diagnostic-first-frame
node research/replay-controller/bridge-audit.mjs BLIND research/replay-controller/bridge/diagnostic-first-frame
```

Erwartung auf dem aktuell gespeicherten Stand: 1 vorhandene Rolle, 4 fehlende Stimmen; bekannte Gewinnerkontexte und fehlende Marktdaten sperren einen echten Blindtest. Der CLI-Prozess liefert bei unvollständigen Rollen einen Nicht-Null-Exitcode.

**Erst wenn die vier übrigen Rollen wirklich eigene stimmige Dateien persistiert haben**, darf die vorhandene Diagnose in den lokalen Replay-Controller übergeben werden:

```sh
node research/replay-controller/controller.mjs init pepe-diagnostic research/replay-controller/reports/diagnostic-dataset.json DIAGNOSTIC
node research/replay-controller/bridge-import.mjs pepe-diagnostic research/replay-controller/bridge/diagnostic-first-frame
node research/replay-controller/controller.mjs advance pepe-diagnostic
node research/replay-controller/controller.mjs status pepe-diagnostic
```

WICHTIG: `bridge-import.mjs` importiert ausschließlich **fünf bereits vorhandene** zur exakt gleichen Frame-ID und SHA passende Rollen-Dateien. Fehlende oder veraltete Stimmen führen zum Abbruch **vor** dem Schreiben. Import schreibt lediglich isolierte lokale Entscheidungsdateien. Der `advance`-Befehl ist separat. Erlaubt ist nur `DIAGNOSTIC` oder `SYNTHETIC`; ein echter `BLIND`-Lauf benötigt eine später getrennt zu implementierende unabhängig verifizierte Rollenidentität und saubere Kontexte. Die importierten JSON-Dateien beweisen für sich allein NICHT, dass fünf echte GPT-Dots sie geschrieben haben.

Wenn `pepe-diagnostic` schon existiert, keinen weiteren `init` versuchen; stattdessen `next`, `status` oder `load` verwenden. Nicht rückwirkend bereits eingefrorene Entscheidungen verändern. Die Diagnose bleibt bei ihrem bekannten PEPE-Kandidaten und ist **kein Blindtest**.

## Nächste noch fehlende Arbeitsprodukte

1. Vier echte Rollen-Stimmen für Frame 0, mit dokumentierten Erstellern und GitHub-Readback. Fehlende Onchain-Protokollbestätigung unabhängig nachholen.
2. Ein neutraler, zeitkorrekter **Mehr-Coin-Kandidatenkorpus**, der aus damaligen historischen Beobachtungen abgeleitet wird, einschließlich Fehlstarts. Nicht aus der Excel-Gewinnerliste / späteren ATH vorselektieren.
3. Echte zeitgerechte Marktreserve- und Sicherheitsnachweise inklusive ausführbarer BUY- und SELL-Kursprüfungen für alle in Frage kommenden Kandidaten. Vermeintliche heutige DEX-Preise sind kein historischer Fill.
4. Frische, nicht mit PEPE vorinformierte Forschungsinstanzen mit nachvollziehbaren Zeitfenster-/Rollenattestierungen. Selbst dann echte unabhängige Quellenprüfung erforderlich.
5. Automatische 5-Dot-Entscheidungskoordination pro simuliertem Zeitschritt, nicht die wiederholte stündliche Recherche einzelner historischer Quellen.

Ein 62-Tage-Durchlauf kann rechnerisch schnell sein; ohne die Punkte 2–4 wäre er lediglich ein diagnostischer Durchlauf mit dem aktuellen `NO_BUY`-/`UNKNOWN`-Ergebnis. Das System darf solche Resultate nicht als erfolgreiche Hype-Früherkennung melden.

## Tests

GitHub CI (`.github/workflows/tests.yml`) führt auf Linux und Windows die neun vorhandenen Controller-Tests, acht R15-Bridge-Audit-Tests und vier R15-Import-Tests aus. Alle Tests sind offline und verwenden keine echten Trading-Orders.

