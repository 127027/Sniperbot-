# V0.15 – Ein Laptop als Zentrale, alle anderen Geräte mit eigener Wallet

Stand: 10. November 2026 · Entwicklungsbranch `codex/v15-device-isolation-agent-execution-inbox-20261110` · Draft-PR #24.

## Verbindliches Konzept

**Die Windows-Laptop-Installation des Eigentümers ist MASTER.** GitHub dient als öffentlicher, signiert überprüfter Übertragungsweg. Alle weiteren Installationen (andere Windows-Rechner und später Android-Geräte) sind FOLLOWER; sie erhalten keine Schlüssel oder Guthaben des MASTER und dürfen nicht selbst entscheiden, wann Coins gekauft/verkauft werden. Sie dürfen später **nur** sicher authentifizierte, gezielt für die jeweilige lokale Wallet adressierte Ausführungsanweisungen der Zentrale umsetzen. Die Kauf-/Verkaufsentscheidung selbst kommt von den GPT-Agenten, nicht aus dem lokalen Bot.

Jede Installation hat eine eigene zufällige `device_id`, einen eigenen lokalen Datenordner und eine **eigene** individuell erzeugte Solana-Wallet. Den gesamten Datenordner einer Installation auf ein anderes Gerät zu kopieren würde dieselbe Wallet duplizieren und ist ausdrücklich **nicht** vorgesehen. Lediglich der **öffentliche** Master-Signaturschlüssel und die öffentliche Master-Geräte-ID werden geteilt.

## Laptop-MASTER: sichtbarer Betrieb

1. Windows-Bot über `Sniperbot_Starten.bat` **sichtbar** starten.
2. Im Dashboard unter „Bot-Zentrale und verbundene Geräte“ **„Dieses Gerät ist die Laptop-Zentrale“** einmalig auswählen. Die Rolle liegt ausschließlich im lokalen Benutzerordner.
3. „Signaturschlüssel einmalig erstellen“ und separate lange Passphrase verwenden. Die **Master-Koordinations-Schlüssel** sind von den **Wallet-Schlüsseln** getrennt. Master-PKCS8-Privatschlüssel wird **AES-verschlüsselt**, ausschließlich im lokalen Ordner gespeichert. Ausschließlich der öffentliche Ed25519-Schlüssel darf an andere Geräte gegeben werden.
4. Bei aktivem, sichtbarem Masterfenster die Master-Passphrase und ein **feingranulares GitHub-Token nur für `127027/Sniperbot-` mit Repository Contents: read/write** eingeben und „Laptop-Verbindung starten“ wählen. Diese beiden Geheimnisse werden **nicht** in Repo, Chat oder auf anderen Geräten gespeichert; sie bleiben nur im laufenden Masterprozess.
5. Der Master veröffentlicht alle ca. 45 Sekunden unter `coordination/master-live` eine kurzlebige (~110 Sekunden) signierte Online-Meldung unter `coordination/master-presence.v1.json`. Das ist öffentlich einsehbar; enthält jedoch nur eine pseudonyme Geräte-ID, Zeitstempel, Sequenz und Signatur. Der Branch löst keine GitHub-Testworkflows aus.
6. **Fenster schließen oder Q:** sämtlichen Master-Prozessen wird durch die bestehende Windows-Job-Object-Logik ein Ende gesetzt; neue GitHub-Meldungen hören auf. Alte Meldungen verfallen spätestens nach ihrer signierten Gültigkeitsdauer. Diese Sichtbarkeit ist keine Geld-Ausführung.

## Weitere Windows-Geräte als FOLLOWER

1. Auf jedem Rechner unabhängig von GitHub installieren und **eine eigene Wallet erzeugen**. Nicht den alten Benutzer-Datenordner oder dessen Wallet kopieren.
2. Unter „Folgegerät verbinden“ **Master-Geräte-ID** plus **öffentlichen Ed25519 PEM-Schlüssel** eingeben. Der private Master-Signaturschlüssel sowie alle Wallet-Seeds sind ausdrücklich nicht zulässig.
3. Der Bot fragt alle 60 Sekunden **nur den fest codierten GitHub-Ort** ab, kontrolliert die gepinnte Master-ID, signierte Daten, Zeitfenster und Validität. Ein HTTP 200 von GitHub ist allein keine Master-Berechtigung; falsche/abgelaufene Daten werden blockiert.
4. Wenn Master-Verbindung fehlt, zeigt das Gerät: **„Keine Verbindung – ruf Andreas an“**. Es nimmt dann keine Kauf-/Verkaufsbefehle an, führt keinen eigenen Scan/Auto-Exit aus, nimmt keine selbstständigen Forschungsentscheidungen an und blockiert den manuellen Tausch. Nur **virtuelles** EUR-Einzahlen und -Auszahlen im bisherigen PAPER-Account bleibt möglich. **Echte** PayPal-Zahlungen sind noch nicht eingebaut.
5. Auch **bei** bestätigter GitHub-Präsenz erzeugt eine externe Anweisung **keinen Live-Trade**: der neue Geräte-Inbox prüft lokal einen separaten Agent-Rollen-Token, Ed25519-Publisher-Signatur, gültiges Zielgerät, exakte Token-/Pool-Identität, Menge, Höchstslippage, kurze Gültigkeit und Replay-/Konfliktsicherheit. Ergebnis ausschließlich `BLOCKED_LIVE_EXECUTION_NOT_ENABLED`. Ledger und Wallet bleiben unberührt. Bestehende GPT-Agenten wurden nicht umprogrammiert.

## GitHub ist nicht Echtzeit – wichtige Sicherheitsgrenze

Ein abrupt abgeschalteter Laptop kann GitHub nicht sofort darüber informieren. Zwischen dem Shutdown und dem letzten signierten Heartbeat-Ablauf liegen ggf. bis zu **110 Sekunden**, zuzüglich Netzwerk-/Abfrageverzögerung für die Anzeige. **GitHub-Heartbeat allein darf daher niemals eine Live-Order autorisieren**. Vor einem späteren tatsächlichen Live-Swap braucht der Bot einen unabhängigen **unmittelbaren Live-Handshake / Einmalfreigabe durch die aktive Master-Instanz**, der beim Abschalten sofort fehlschlägt. Bis zu dessen Fertigstellung ist das Live-Ordermodul ausnahmslos gesperrt. Auch das mobile Betriebssystem muss den Kontaktverlust fail-closed behandeln.

## Was noch ausdrücklich fehlt

- **Android/iOS:** Noch keine native oder signierte mobile App und keine Wallet-Keystore-/Android-Keystore-Integration. Die aktuellen Module sind Node/Windows-Entwicklung; der Quellcode allein ist keine Handy-App.
- **Echte PayPal-Einzahlung/Auszahlung:** Noch kein produktives deutsches MoonPay-/PayPal-On-/Offramp-Partnerkonto, kein automatisches Abholen von Zahlungseingang oder -ausgang. Nur Paper-EUR/USDC und externer Browser-Test.
- **Echter Kauf/Verkauf:** Keine unabhängige Live-Signaturabnahme, kein vollständig geprüftes DEX-Programm-/Slippage-/Empfänger-Risikogate, keine freigegebene Jupiter `/execute`-Abwicklung, keine Settlement-/Withdrawal-Buchung.
- **Master-Verteilkanal für Orders:** Aktuell ist nur die signierte Presence-Transportstrecke vorhanden. Der verschlüsselte, pro Gerät gerichtete Befehlspush/Pull über GitHub sowie die unabhängige Master-Live-Freigabe und Onchain-Orderausführung müssen noch geschaffen werden.
- **Echte Praxisabnahme:** Nicht auf dem persönlichen Laptop installiert oder auf einem Mobiltelefon getestet. Keine Echtgeldzahlung, kein 50-€-Kauf oder Swap verifiziert.

## Prüfstrategie

- Geräteeigene IDs bleiben pro Installation stabil, sind zwischen Instanzen unabhängig.
- Signierte Präsenz- und Befehlsinformationen können weder rückwirkend verfälscht noch auf falsche Geräte angewendet werden.
- Test mit **wirklich gestarteter FOLLOWER-HTTP-Instanz**, Master offline: BUY/SELL/SCAN, ältere Research-Events und agentische Orders sind gesperrt; PAPER-Ein-/Auszahlung bleibt möglich, Walletpositionen unverändert.
- Master-Koordination-Privatschlüssel bleiben verschlüsselt lokal; nur öffentliche Felder gelangen auf GitHub.
- Windows-Supervisor und übrige Solana-/Paper-Tests werden weiterhin separat getestet.

**Kein Merge nach `main`; die Version bleibt ein nicht live-freigegebener Draft.**
