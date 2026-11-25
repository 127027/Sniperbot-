# R33 Paperbot für iPhone und iPad
Native SwiftUI-App (iOS/iPadOS 16+), identische R31 Paper-Handelsmaschine als lokal gebündeltes JavaScriptCore-Modul. Gemeinsamer öffentlicher, unveränderter R31/R32-v1-Feed; kein Schreiben, kein Token, keine neuen Dots. Eigene UUID, lokale atomare Kontodatei in Application Support, vom Backup ausgeschlossen; keine iCloud, kein Login, keine Kontodaten auf GitHub. Neuer Account startet mit 0 EUR, Kaufpause, eigenem Einsatz/Limit. Paper only, keine echten Orders. GitHub sieht übliche HTTP-Verbindungsdaten, keine lokalen Finanzwerte. Keine historische Positionen kopieren. Gleiche sechs Signalaktionen, BUY bei Besitz HOLD, sonst budgetabhängig BUY; SELL nur Besitz, frische Preise/Hash/Sequenz. 
## Lokaler Build
Mac mit Xcode und aktuellem SDK, Node 22, Python 3, XcodeGen. Vom Repo-Root:
```sh
node r33/ios/tools/bundle-engine.mjs
python3 r33/ios/tools/icon.py
cd r33/ios
xcodegen generate
open R33Paper.xcodeproj
```
Simulator-CI auf macOS 15: native Tests und Screenshot. Simulator-App ist keine installierbare iPhone-IPA. Keine Behauptung einer physischen Geräteprüfung.
## TestFlight
Apple Developer Program / App Store Connect Zugang mit passender Rolle nötig. App-ID com.r33.paperbot ist ein Vorschlag, Verfügbarkeit und Team prüfen. In Xcode Team auswählen, automatische Signierung, eindeutige Bundle-ID, App Store Connect App anlegen, Privacy-Angaben prüfen (kein Tracking, keine persönlichen Konto-Uploads; GitHub als externer öffentlicher Feed). Release-SDK und Apple-Upload-Anforderungen aktuell prüfen. Product > Archive mit generischem iOS-Gerät > Distribute App > App Store Connect > Upload. In TestFlight externe Gruppe anlegen, erste Beta zur Apple-Prüfung einreichen, nach Freigabe Einladungslink teilen. Keine Schlüssel, Zertifikate, Profile oder Apple-Passwörter in GitHub einchecken. Für jedes Update gleiche Bundle-ID/Team verwenden; App nicht deinstallieren, lokale Daten bleiben bei normalem Update, nicht bei Löschung. Eine lokale Backup-/Exportfunktion ist noch nicht vorhanden.
## Hintergrund
BGAppRefreshTask mit 15min frühestem Zeitpunkt, System plant tatsächlich; nicht garantierter stündlicher Betrieb, kein Dauerprozess, kein Bypass. Beim Öffnen sofort aktuelles Signal abrufen, im Vordergrund alle drei Minuten. Keine abgelaufenen Signale nachholen. Apple kann Background App Refresh deaktivieren/verschieben; nach Force-Quit keine verlässliche Hintergrundausführung. Bei fehlender Datenverfügbarkeit kein Trade. Android/Windows nicht verändert.
## Offen
Verifizierte Simulator-Tests, echte iPhone/iPad-Gerätetests, Apple-Team/Signierung, TestFlight Upload/Review/Einladungslink. Kein Echtgeld, keine Zahlungsanbieter. R32-v2-Sharding nicht im aktiven v1-Feed; später separate Migration.
