# R29 – ChatGPT startet einen sichtbaren virtuellen Kauf und Verkauf im normalen Paper-Konto

**Freigabe:** Nutzer hat am 15.11.2026 einen sichtbaren Paper-Kauf und anschließenden Verkauf ausdrücklich beauftragt. **Echtgeldbetrieb vollständig deaktiviert.**

## Warum die bisherige R29-Version nicht reichte

Der bereits bestandene ChatGPT → GitHub → Windows-Kurier → GitHub → ChatGPT-Test schrieb ausschließlich in
`%LOCALAPPDATA%\MemeSniperPaper\r29-isolated-sandbox`.
Er konnte NICHT die normale Bot-Positionsliste oder den üblichen Paper-Verlauf verändern.

Der neue opt-in Test nutzt hingegen die **bestehende lokale** und ausschließlich virtuelle
`http://127.0.0.1:3030/api/command`-Schnittstelle mit
`DEMO_SIGNAL`, `BUY`, `DEMO_MOVE` (0 %, nur frischer Demo-Zeitstempel) und `SELL`.

Er verändert genau **eine** offene Position mit dem festgelegten erfundenen Testasset
`demo:signal-1`, `DEMO-MINT-001` / `DEMO-POOL-001`,
**maximal 50 TEST-USDC**, ohne realen Coinhandel.

## Installieren und aktivieren

1. Alten R29-Bot mit `Q` vollständig schließen.
2. Branch `codex/r29-chatgpt-github-paper-cycle-20261115` über **Code → Download ZIP** erneut beziehen.
3. In neuen Ordner entpacken. **Bestehendes Paper-Konto nicht löschen.**
4. **Historischer Nachweis vom 15.11.2026:** Für den damaligen einmaligen Test wurde der inzwischen entfernte Sonderstarter verwendet. **Aktuell gibt es nur noch `Sniperbot_Starten.bat`**. Der einmalige Test ist abgeschlossen und darf nicht automatisch wiederholt werden. Dieser Abschnitt ist kein neuer Startleitfaden.
5. **GitHub-Token muss NICHT neu erstellt werden.** Der bereits vorhandene DPAPI-Token wird verwendet. Kein OpenAI-API-Key erforderlich.
6. Im Dashboard `http://127.0.0.1:3030` den normalen virtuellen Bot auf **AN** stellen und sicherstellen, dass mindestens **50 TEST-USDC** frei verfügbar sind. Bereits offene Positionen und das restliche Guthaben bleiben unangetastet.
7. Der R29-Kurier sollte den opt-in Status auf GitHub schreiben:
   `research/r29/channel/main-paper-status.json`.
8. Wenn dieser Status erfolgreich erscheint, ChatGPT im selben Gespräch „sichtbarer Paper-Test bereit“ melden. ChatGPT schreibt anschließend **einen** BUY-Auftrag für 50 TEST-USDC nach
   `research/r29/channel/main-paper-intent.json`.
9. Im normalen Dashboard unter **Positionen** muss **TEST (Demo)** erscheinen; im normalen **Verlauf** muss `TEST-KAUF` erscheinen.
10. Erst nach bestätigtem `PAPER_FILLED` sendet ChatGPT den SELL-Auftrag, und der normale Bot-Verlauf zeigt `TEST-VERKAUF`. Die Position verschwindet.

## Sicherheits- und Wiederholschutz

- Beim damaligen Test war die explizite lokale Freigabe der Opt-in-Schutz. Die historische Sonderstartdatei wurde nach erfolgreicher Abnahme entfernt. Der jetzige Einzelstarter aktiviert standardmäßig keine neuen `MAIN_PAPER_DEMO`-Orders.
- Die GitHub-Order hat strikte Felder, feste Tokenidentität, einen eindeutigen 32-Hex-ID, höchstens 30 Minuten Gültigkeit und exakt 50 TEST-USDC BUY (SELL schließt nur diese Position).
- Ein lokaler Zyklus erlaubt **maximal einen BUY und einen SELL** und sperrt weitere Trades, auch nach einem Neustart. Ein zweiter, unbeabsichtigter GitHub-Commit kann diesen Zyklus nicht zurücksetzen.
- SELL darf **nur** die ID der Position verkaufen, die der vorangegangene bestätigte R29-BUY eröffnet hat. Andere bereits bestehende Paper-Positionen werden nie angetastet.
- Ist der Bot AUS, sind weniger als 50 TEST-USDC verfügbar oder besteht bereits eine andere Demo-Position, wird **kein automatischer Kauf** versucht.
- Nach einem Fehler während eines Updates NICHT das lokale `main-paper-demo-cycle.json` löschen; zunächst im Dashboard nachsehen, ob eine Position offen ist, und diese bei Bedarf manuell schließen.
- Es werden weder Seedphrase, Wallet, GitHub-PAT noch lokale Kontostände veröffentlicht.
- Ein bestehendes virtuelles Guthaben wird **nicht aufgeladen** und nicht auf einen neuen Wert gesetzt. Keine Echtgeldzahlungen.
- Nur die Änderung an der normalen **Paper-Simulation** ist beabsichtigt.
- Der Testcoin hat einen fixen Kurs von 0,025 TEST-USDC. Bei unverändertem Kurs führen die in der Paper-Engine modellierten Gebühren von 1 % je Richtung zu rund **−0,995 TEST-USDC** aus einem 50-TEST-USDC-Kauf; das ist kein echter Marktverlust.
- GitHub-Quittungen berichten nur Intent-ID, Status, Abschluss und **Trade-PnL**, keine realen Konto- oder Wallet-Bestände.

## Nachweisgrenzen

Vor der neuen ZIP-Installation kann die bereits laufende R29-Version **diesen Test technisch nicht ausführen**, weil sie nur `WINDOWS_SANDBOX` verarbeitet. Der neue Code liegt lediglich auf GitHub und wird **nicht automatisch in laufende Node-Prozesse geladen**.

Nach erfolgreicher Installation und echtem Windows-Status ist der nächste ChatGPT-Schritt ein neuer BUY/SELL-Rundlauf mit Belegen vom normalen Dashboard, **nicht** aus dem separaten R29-Sandbox-Tester.
