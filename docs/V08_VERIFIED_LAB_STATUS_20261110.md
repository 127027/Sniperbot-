# V0.8 – Reviewbarer Zwischenstand: Archiv und Execution-Parity-Labor
Datum: 2026-11-10. Entwicklungsbranch: `codex/v08-execution-parity-lab-20261110`; `main` unverändert.

## Tatsächlich implementiert
- `runner/research-news-archive.mjs`: unveränderliches lokales Nachrichtenevent pro ID-Hash, Speicherung vor Hot-Cache-Retention. Vorhandene Belege behalten `first_observed_at_utc`. Private lokale Daten werden nicht nach GitHub hochgeladen.
- `runner/research-news-journal.mjs`: bestehende Belege werden vor den bisherigen 45 Tagen und 1000-Event-Caps archiviert; bei beschädigtem Datensatz fail closed.
- `runner/execution-parity-lab.mjs`: gemeinsame reine Eligibilitätsprüfung für PAPER/LIVE; PAPER nur mit expliziten synthetischen AMM-Fixtures (Poolreserven, Handelsgebühr, Gas, Price Impact), LIVE vollständig deaktiviert. Isolierte lokale Testpositionen, 50-USDC-Mindesteinsatz und Gesamtbudget.
- Aktuelle Produktions-Paper-Bot-Kette **nicht** an dieses neue Ausführungslabor angebunden. Kein Remote-Order-Kanal, keine Wallet, keine echte Quote, keine automatische Zahlung.
- CI-Windows-Job testet das Archiv auf einem Windows GitHub Runner und das neue Ausführungslabor. **Nicht** mit dem privaten Laptop gleichsetzen.

## Verifizierte Tests
GitHub Actions Run 42811724555 (2026-11-10):
- Linux `node --test runner/*.test.mjs`: 149/149 PASS.
- Windows `node --test runner/research-news-archive.test.mjs runner/research-news-journal.test.mjs`: 7/7 PASS.
- Windows `node --test runner/execution-parity-lab.test.mjs`: 7/7 PASS.
- Gesamt-Workflow conclusion success.
Link: https://github.com/127027/Sniperbot-/actions/runs/42811724555

## Was diese Tests NICHT beweisen
1. Keine verifizierte autonome Entdeckung kommender Memecoin-Ausbrüche; die fünf historischen Fälle verbleiben UNTESTABLE wegen fehlender originalzeitlicher Datensätze und handelbarer Quotes.
2. Die fünf Dots publizieren GitHub-Research; es gibt **keinen** verifizierten signierten Dot-zu-Laptop-Kaufentscheidungsweg. Der letzte beobachtete 5-Rollen-Konsens war null.
3. Keine vollständigen Contract-/Liquiditäts-/Honeypot-/Sellability-Adapter. Synthetic-FIXTURE-Checks sind Testflags und dürfen nie als echte Sicherheitsatteste interpretiert werden.
4. Keine Aussage, dass Paper und Live gleiche reale Ausführungspreise erzielen. Gemeinsame Policy ist der Anfang; Live-Routing bleibt explizit geschlossen.
5. Keine Tests des 24/7-Betriebs auf dem privaten Windows-Laptop, der dortigen OneDrive/NTFS-Installation, Rotations-/Backupstrategie und des Wiederanlaufs nach Stromausfall.
6. Die historischen Nutzer-Excel-Daten dürfen nicht in öffentliches GitHub übertragen werden; sie ersetzen keine as-of-Snapshots inkl. Fehlstarts.

## Abnahme-Voraussetzungen für die nächste Stufe
- Echte End-to-End Nachricht mit identischer Event-ID von GitHub-Rollen-Review bis lokalem Client und Empfangsbeleg, inklusive TTL, Signaturen, Revocation, Duplikaten und Offline-Wiederanlauf.
- Unabhängige tatsächliche on-chain Sicherheitsprüfungen, liquiditäts- und größenabhängige Kauf- und **Verkaufs**quoten.
- Paper-Ausführung nur bei nachgewiesener echter Quote, signiertem Quorum und lokal erneut geprüftem Risk-PASS.
- Historische Blind- und Holdout-Tests mit vollständiger, zeitlich korrekter Gewinner- UND Verliererkohorte; 17-Tage-Wahrscheinlichkeiten erst nach statistischer Kalibrierung ausweisen.
- Windows-Produktintegration nach Sicherung der bisherigen lokalen `.local`-Daten und Paper-Guthaben.

Fazit: Das isolierte synthetische V0.8-Labor ist grün; der gewünschte autonome Memecoin-Sniper ist **noch nicht** abgenommen. Keine Live-Freigabe oder `main`-Änderung.
