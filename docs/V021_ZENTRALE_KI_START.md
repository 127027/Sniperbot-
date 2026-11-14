# Sniperbot V0.21 – eine zentrale stündliche KI, keine Dots

## Was tatsächlich implementiert ist

- **Eine** stündliche lokale KI-Forschungsschleife, solange der Windows-Bot läuft und ein OpenAI-API-Key eingerichtet wurde.
- Beobachtung und Neubewertung der von GeckoTerminal gefundenen Pools sowie bestehender Paper-Positionen.
- Öffentliche RSS-Nachrichten von drei Quellen und ein OpenAI-Responses-API-Aufruf mit `web_search`, um aktuelle Meldungen auszuwerten.
- Nur streng aus der übermittelten Liste ausgewählte `candidate_id`; das Modell darf keine eigenen Contracts erfinden oder wallet-spezifische Transaktionen ausführen.
- Gewünschte Aktionen: `BUY`, `SELL`, `HOLD`, `WATCH`. Höchstens zwei BUY-Kandidaten pro Durchlauf, Score mindestens 80/100, höchstens 20 % je Token, 25 % des virtuellen Portfoliowerts insgesamt pro Durchlauf, 50–1000 virtuelle USDC je Auftrag und nicht mehr als 1 % der angezeigten Poolliquidität.
- Bei geeignetem BUY/SELL wird eine **lokal mit einem nur im RAM gehaltenen Ed25519-Schlüssel signierte** Paper-Nachricht an die vorhandene Bot-Pipeline übergeben. Der Bot prüft erneut die exakte Contract-/Pool-Adresse und holt selbst aktuelle DEX-Screener-Kursdaten.
- Neue Paper-Fills verwenden **indikative DEX-Spotkurse** und eine modellierte 1-%-Gebühr je Kauf/Verkauf. Dies beweist **weder ausführbare Kurse noch Verkaufbarkeit, Slippage, tatsächliche Steuern oder Onchain-Transaktionen**. Jeder Beleg ist als `INDICATIVE_DEX_QUOTE_NOT_EXECUTABLE` gekennzeichnet.
- Die lokale Preisüberwachung für gehaltene Paper-Positionen läuft unabhängig vom Stundentakt, soweit Live-Quotes verfügbar sind; Sicherheitsdaten und reale Sell-Quotes werden dadurch nicht bewiesen.
- Status, Empfehlungen und Belege erscheinen im lokalen Dashboard und in `%LOCALAPPDATA%\MemeSniperPaper\central-ai\latest.json`.
- OpenAI-API-Key wird beim Windows-Start per DPAPI verschlüsselt gespeichert. Er wird nicht an GitHub übermittelt.

## Windows-Installation aus GitHub

1. In GitHub Branch `codex/sniper-central-ai-paper-v021-20261114` auswählen und **Code → Download ZIP** wählen. Entpacken, z. B. nach `C:\MemeSniperAI`.
2. **Node.js 22 LTS** installieren. Windows PowerShell 5.1 ist erforderlich.
3. `Sniperbot_Starten.bat` doppelklicken. Beim ersten Start wird ein **OpenAI API-Key** abgefragt. Eingabe ist verdeckt und optional; ENTER ohne Key startet den Paper-Bot ohne KI.
4. Der API-Key ist **nicht** durch ChatGPT Plus abgedeckt: OpenAI-API-Nutzung und Websuche werden separat berechnet. Nur einen Key mit passendem API-Budget verwenden; niemals im Chat, Screenshot oder GitHub-Commit teilen.
5. Im Dashboard `http://127.0.0.1:3030` die Paper-Summe (z. B. 5.000 Test-USDC) setzen, den Bot auf **AN** stellen und **„Automatische KI-Paper-Orders erlauben“** aktivieren. Diese lokale Freigabe ist für automatische Käufe erforderlich. Der Bot kann dabei ausschließlich TEST-Guthaben einsetzen.
6. Der erste KI-Durchlauf wird nach ungefähr 30 Sekunden angestoßen, danach frühestens etwa alle 60 Minuten **nach Ende des vorherigen Durchlaufs**. Ausfälle der Nachrichtenquellen oder der API führen zu `ERROR_NO_ORDERS`, **nicht** zu einem erfundenen Coin-Kauf.
7. `Zentrale KI · stündliche Analyse` zeigt letzte Analyse, Fehler, Empfehlungen und nächsten Durchlauf. `Signierte Paper-Aufträge` zeigt Empfang/Fill/Blockierung.
8. Zum Stoppen im Windows-Fenster Q drücken. Wenn der Rechner schläft, ausgeschaltet oder offline ist, läuft auch keine KI-Analyse. Beim nächsten Start beginnt die Schleife erneut.
9. API-Key neu einrichten: `Sniperbot_Starten.bat -ResetAiKey`. Die aktuelle **Paper-Kontodatei und private Wallet niemals löschen**.

## Sicherheit und was NICHT funktioniert

**Wichtig:** Dies ist ein lokal gestarteter *API-basierter Analyseprozess*, nicht diese bestehende ChatGPT-Unterhaltung. Diese Chat-Sitzung kann den Laptop nicht automatisch kontaktieren oder eine Nachricht stündlich abschicken. Die integrierte KI verwendet ein über deinen eigenen API-Key angebundenes OpenAI-Modell und dessen Websuche.

- Es wurde **keine neue ChatGPT-Dot-Automation** angelegt.
- Der Bot sendet seine **Paper-Statusdaten intern an den lokalen KI-Prozess**, nicht an die öffentliche GitHub-Repository-Historie und nicht automatisch an diese Chat-Unterhaltung. Die echte Solana-Wallet kann weiterhin über die bestehenden, separat lesenden Dashboard-Funktionen betrachtet werden, ihr Live-Bestand wird der KI **nicht** automatisch übermittelt.
- Keine echten Memecoin-Swaps, Wallet-Belastungen oder automatisierten PayPal-Zahlungen. Der frühere manuelle SOL-Transferbereich ist davon getrennt.
- Nur die im Code vorhandenen vier Chains werden vom Pool-Scanner durchsucht: Solana, Ethereum, Base und BNB Chain. Das ist keine Vollabdeckung aller Memecoins weltweit.
- `web_search` und RSS liefern keine vollständige Sammlung aller aktuellen Tweets/Telegram-/TikTok-Daten. Kein AI-Score ist eine zuverlässige Ausbruchswahrscheinlichkeit.
- Die signierte GitHub-Pull-Forschungskurier-Pipeline ist unabhängig und beweist **keine** automatisch verbundene ChatGPT-Chat-Sitzung.
- Der Optionsschalter für Paper-Auto-Handel ist zunächst AUS. Ohne lokale Freigabe werden KI-Empfehlungen höchstens protokolliert.
- **Verkaufbarkeit ist nicht verifiziert:** Indicative Paper-Fills sind virtuelle Buchungen bei Markt-Snapshots und keine Belege einer erfolgreichen realen Transaktion.

## Verifikation

Offline-Tests im CI (`ubuntu-latest` und `windows-latest`):

- Strict candidate allowlist / kein erfundener Token.
- Stale Quote / gesperrte Liqudität / keine untrusted GitHub-Order-Ausführung.
- Ed25519-signierter BUY und SELL im isolierten virtuellen Ledger, gewinnbringender Dummy-Verkauf.
- Doppelte Nachricht verändert nach Neustart das Paper-Guthaben nicht erneut (bestehender Replay-Schutz).
- Fehlende API-/Websuche, Bot AUS, zentrale Paper-Freigabe AUS und ungültige Modellantworten dürfen keine Orders auslösen.
- Keine API-Aufrufe mit Echtgeld oder bezahlte KI-Abfragen in CI. **Live-Ende-zu-Ende mit deinem echten API-Key ist noch nicht bewiesen.**

Der Status ist in `/api/central-ai/status` ohne Geheimnisse lokal lesbar.
