# Sniperbot Windows – ein Startfenster, zwei lokal beaufsichtigte Prozesse

**Arbeitsbranch:** `codex/research-gateway-v04` · **nur PAPER** · kein Merge nach `main`.

## Was ändert sich?

**Nur `Sniperbot_Starten.bat` doppelklicken.** Diese eine Datei startet den bestehenden Paper-Gateway samt eingeschaltetem Forschungs-Statusfeed und den lokalen Markt-Collector. Der Browser zeigt weiterhin die vorhandene Oberfläche unter `http://127.0.0.1:3030`. Die Startsteuerung öffnet keine zweite Konsole. Die drei alten Startdateien `Windows_Starten.bat`, `Windows_Starten_mit_Forschung.bat` und `Windows_Marktbeobachtung_Starten.bat` sind entfernt. `Sniperbot_Starten.bat` ist der einzige reguläre Starter; `Windows_Tests.bat` bleibt nur für Offline-Tests.

**Ein zentral verwaltetes Kontrollfenster** überwacht beide Node-Prozesse. Über **Taste `Q`** wird geordnet beendet: Paper-Bot schreibt vorher den aktuellen Zustand, Markt-Collector beendet die Warteschleife und gibt seinen Lock frei. **Beim Schließen des Fensters über X/Alt+F4** beendet eine geprüfte native Windows-JobObject-Gruppe alle dazugehörigen Kindprozesse; dieser erzwungene Fall ist nicht gleichbedeutend mit einem garantierten letzten State-Save. **Deshalb für einen sauberen Abschluss vorzugsweise Q verwenden.**

Beim unerwarteten Absturz einer Komponente versucht die Startsteuerung **maximal drei begrenzte Neustarts** und beendet danach alle eigenen Prozesse mit Fehlermeldung. Sie übernimmt keine fremden Prozesse. Läuft bereits ein Bot auf Port `3030` oder eine zweite Instanz desselben Supervisors, wird **abgebrochen**, statt den Bestand zu überschreiben. Mit dem älteren separaten Markt-Collector kann dessen Lock noch belegt sein; deshalb beim Upgrade **beide bisherigen Fenster schließen**, dann nur den neuen Starter verwenden.

## Sichere Aktualisierung deines vorhandenen Laptops

1. **Bestehenden Paper-Bot und Markt-Collector vollständig beenden** (deren Fenster, nicht nur die Browser-Seite).
2. **Komplettes Verzeichnis sichern**, besonders `.local/` und – soweit vorhanden – `%LOCALAPPDATA%\MemeSniperPaper`. Der Paper-Runner speichert sein laufendes Portfolio normalerweise unter `%LOCALAPPDATA%\MemeSniperPaper`; die lokale komprimierte Markthistorie bleibt im bestehenden Projektordner unter `.local\research-market`.
3. Aktuellen ZIP-Branch herunterladen: https://github.com/127027/Sniperbot-/archive/refs/heads/codex/research-gateway-v04.zip .
4. ZIP entpacken und **die Programmdateien** in das bestehende Windows-Verzeichnis, z. B. `C:\Users\andre\OneDrive\Desktop\Sniperbot0.1`, kopieren. **Nicht den bestehenden Ordner vorab löschen und keine Synchronisationsoption zum Löschen fehlender Dateien einsetzen.** Vorhandene `.local`-Dateien und das Paper-Guthaben nicht überschreiben; im veröffentlichten ZIP sind diese lokalen Laufzeitdaten nicht enthalten.
5. `Windows_Tests.bat` optional ausführen. Danach ausschließlich `Sniperbot_Starten.bat` doppelklicken. Beim allerersten Start erscheint eine verdeckte Eingabeaufforderung für den bereits eingerichteten GitHub-Fine-Grained-Token. **Den Token nur dort eingeben, niemals im Chat.**
6. Browser öffnen sich nach gesundem lokalen Start automatisch. Im zentralen Fenster erscheinen Paper-Gateway, Markt-Collector und GitHub-Veröffentlichung. Das Fenster geöffnet lassen; Windows darf nicht in den Schlafmodus fallen.

## GitHub-Token: einmalige Anmeldung und spätere Verwendung

Der Benutzer tippt den eigenen GitHub-Token **einmal** verdeckt ein. `runner/windows-supervisor.ps1` verschlüsselt ihn mittels **Windows DPAPI** (aktuelles Windows-Benutzerkonto) unter:

`%LOCALAPPDATA%\MemeSniperPaper\secrets\research-github-token.dpapi`

In der Datei ist **kein Klartext-Token**. Die Verschlüsselung hängt am Windows-Benutzerprofil; bei einem anderen Benutzerprofil, einem neuen Gerät oder einem widerrufenen Token muss der Nutzer die Eingabe wiederholen. Ein späterer Neustart des Laptops benötigt bei unverändertem Benutzerprofil keine neue Eingabe. Es wird nichts im Repository, ZIP, Protokoll oder .bat-Dateien als Token gespeichert.

Nur der **Collector-Prozess** bekommt den entschlüsselten Token im eigenen temporären Environment. Beim Paper-Bot werden `SNIPER_MARKET_GITHUB_TOKEN` und `SNIPER_MARKET_PUBLISH` ausdrücklich aus dessen Environment entfernt. Der Collector veröffentlicht weiterhin maximal alle **15 Minuten** nur `research/market/latest.json` auf dem Arbeitsbranch, keine signierten Orderentscheidungen. **Token mit Read/Write auf Repository-Inhalte kann mehr als diese eine Datei verändern; halte seine tatsächliche GitHub-Berechtigung auf nur dieses eine Repository begrenzt.**

**Token erneuern / ersetzen:** Den zentralen Starter schließen und in der Eingabeaufforderung im bestehenden Ordner ausführen:

```cmd
Sniperbot_Starten.bat -ResetToken
```

Dadurch wird der alte verschlüsselte Eintrag gelöscht und der neue Token verdeckt abgefragt. Vorher widerrufene Tokens bei GitHub deaktivieren. Der neue Token darf niemals in diesen Chat, in `.bat`-Quellcode oder in ein GitHub-Commit kopiert werden.

## Was läuft und was nicht?

| Baustein | Beim Doppelklick |
|---|---|
| Bestehender Paper-Bot und lokale Oberfläche | Startet mit erhaltenem lokalen Zustand; Port 3030 |
| Research-Statusfeed | Bleibt für Paper-Bot aktiviert (nicht handelbar) |
| Markt-Collector | Startet alle ~120 Sekunden und archiviert nur Research-Snapshots bis 21 Tage/512 MiB |
| GitHub-Marktbrücke | Startet bei verfügbarem, lokal entschlüsselbarem Token; veröffentlicht alle ~15 Minuten |
| Fünf externe ChatGPT-Forschungsautomationen | Bleiben unabhängig und laufen nach ihren bestehenden Cloud-Zeitplänen – **nicht** als lokale Windows-Prozesse |
| Echtgeld, Wallet, Bank, PayPal und echte externe Orders | Nicht aktiviert/implementiert |

Ein laufendes Markt-Snapshot ist noch **keine** gültige Sell-Quote, keine vollständige Contract-Sicherheitsprüfung und keine Kaufentscheidung. Alle Forschungsdaten bleiben `paper_only:true`, `actionable:false`.

## Technische Tests / Erfolgsmessung

- Bestehende Node-/Paper-Tests: `node runner/test.mjs` und `node --test runner/*.test.mjs`. Tests verwenden keine echten Wallets/Orders.
- Separates Windows-CI: `.github/workflows/windows-supervisor.yml` überprüft DPAPI-Ver-/Entschlüsselung ohne echten Token, Native JobObject-Kopplung, freiwilliges Beenden über privates STDIN und den Killer-nach-Fensterschluss-Fall mit einem Testprozess.
- Lokal: `curl -s -o NUL -w "HTTP %{http_code}" http://127.0.0.1:3030/api/health` sollte HTTP 200 liefern. Die Datei `.local\research-market\status.json` zeigt den letzten lokalen Marktabruf und GitHub-Veröffentlichungsstatus; bei funktionierender Brücke steht `publishing_enabled:true` und zeitweise ein echter `published_commit`.
- **Beim Test von Q/Schließen** sind Port 3030 und der Markt-Collector anschließend nicht mehr aktiv. Das Schließen nur des Browser-Tabs beendet die Prozesse **nicht**.

## Grenzen dieser Umsetzung

Die beiden Node-Prozesse werden auf einem echten Windows-Kern verwaltet; Code- und CI-Tests sind ein technischer Nachweis, **kein** Nachweis eines bereits auf dem Laptop ausgeführten Upgrades. Erst nach ZIP-Austausch und lokalem Start mit seinem eigenen DPAPI-Token läuft die neue Version auf dem Gerät. Kein PC-Zugriff wurde behauptet. Keine Hintergrund-/Autostart-Aufgabe eingerichtet: der Nutzer startet bewusst die eine Datei, Windows-Schlafmodus stoppt die Datenerfassung.

**Wichtig:** Tokenverschlüsselung durch Windows DPAPI schützt ruhende Daten gegen einfache Dateikopie, **nicht** gegen Malware mit Zugriff auf das angemeldete Windows-Benutzerkonto.
