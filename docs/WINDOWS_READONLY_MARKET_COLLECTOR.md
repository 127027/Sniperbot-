# Sniperbot: dauerhaft laufender, ausschließlich lesender Markt-Collector auf Windows

**Stand:** 09.11.2026 · **Branch:** `codex/research-gateway-v04` · **Modus:** Nur Forschung, keine Orders oder echten Guthaben. Kein Merge nach `main`.

## Warum lokal statt in den ChatGPT-Automationen?

Die fünf Sniper-Forschungsrollen konnten öffentliche Pool-Webendpunkte aus ihrer Cloud-Laufzeit teilweise nicht erreichen (Web-Verweigerung und DNS-Ausfall). Der dauerhaft eingeschaltete Windows-Laptop kann eine **separate** Datenstrecke tragen. Der Collector versucht alle **120 Sekunden** öffentliche strukturelle Pool-APIs, ohne die vorhandenen Bot-Käufe, Positionen oder Windows-Runner-Einstellungen anzufassen. Kein Ergebnis ohne tatsächlich funktionierenden API-Zugriff behaupten. Ein immer eingeschaltetes Gerät alleine beweist **noch nicht**, dass sein Netzwerk DNS/API erlaubt; erster lokaler Test erforderlich.

## Dateien, die jetzt im Arbeitsbranch vorhanden sind

| Datei | Funktion |
|---|---|
| `runner/research-market-collector.mjs` | Nur lesender GeckoTerminal-New-Pool-Abruf für Solana, Base, BNB Chain, Ethereum; bis zwei DEX-Screener-Pair-Gegenprüfungen je Chain; bei Gecko-Ausfall alternative DEX-Screener-Tokenprofile/**bezahlte Werbung** als getrennt deklarierte mögliche Quellen |
| `runner/research-market-daemon.mjs` | Lokal wiederholende Erfassung und sichere Archivierung; `--once` führt nur einen einzigen Erfassungszyklus aus |
| `runner/research-market-publisher.mjs` | **Optional**, standardmäßig AUS: veröffentlicht ausschließlich `research/market/latest.json` als research_market_snapshot.v1 über bereits selbst bereitgestellte GitHub-Authentifizierung |
| `Windows_Marktbeobachtung_Starten.bat` | Startet nur den Recherche-Collector, **keinen zweiten Paper-Bot** |
| `runner/research-market-collector.test.mjs`, `runner/research-market-daemon.test.mjs` | Negative API-/Schlüssel-/Verifikations-/Retention-Tests |

### Start auf dem Windows-Laptop

1. Zuerst Arbeitsbranch `codex/research-gateway-v04` vollständig auf den Laptop übertragen; **lokale .local-Dateien und bestehendes Paper-Konto vorher sichern**. Der GitHub-Commit verändert auf dem Laptop noch nichts.
2. Bei laufendem Bot darf **nur** `Windows_Marktbeobachtung_Starten.bat` gestartet werden. **Nicht nochmals `Windows_Starten.bat`** ausführen, sonst könnte ein zweiter Runner-Start versucht werden.
3. Nach dem Start auf dem Laptop existieren – **nur bei erfolgreich abgerufenen echten Marktdaten** – `.local/research-market/latest.json` und komprimierte JSON-Snapshots unter `.local/research-market/history/`. Der jeweilige technische Zustand (auch Fehler) steht in `.local/research-market/status.json`.
4. Ohne längeren Dauerbetrieb lässt sich einmal testen: `node runner/research-market-daemon.mjs --once`. Bei DNS-/HTTP-Blockade bleibt der letzte erfolgreiche Snapshot **unverändert** und der Status ist `BLOCKED_RESEARCH_DATA_ACCESS`.
5. Es ist ein **eigener Windows-Prozess**. Wird dieses Fenster geschlossen, Windows in den Energiesparmodus versetzt oder der Rechner heruntergefahren, endet die Datenerfassung; es wurde **kein** automatischer Windows-Dienst/Autostart auf dem Privatgerät eingerichtet.

### Speicher & automatische Bereinigung

- Unter `.local/research-market/history/` speichert der Collector erfolgreiche regelmäßige Snapshots als komprimierte `.json.gz`.
- **Maximal 21 Tage**, **höchstens 512 MiB**, **höchstens 16.000 Snapshot-Dateien**. Bei Überschreitung werden die **ältesten eigenen** Dateien entfernt. Diese 21 Tage reichen für die separat gewünschten 17-/18-Tage-Forschungsvergleiche, garantieren aber noch keinen historischen Backtest.
- `.local/research-market/latest.json` bleibt als letzte erfolgreiche Beobachtung bestehen (auch wenn eine spätere Erhebung fehlschlägt); `status.json` kennzeichnet dann den aktuellen Verbindungsfehler. Historische Snapshots werden nur im eigens vorgesehenen `history`-Ordner gelöscht.
- **Niemals** das Paper-Konto, State-Dateien, Käufe, GitHub-Rollensnapshots oder die gemeinsame Watchlist bereinigen. `.local/` ist bereits in `.gitignore` ausgeschlossen. Bitte die lokale Forschungssicherung beim Gerätewechsel berücksichtigen.
- Stündlich geplante Forschungs-Dots lesen **nicht direkt** die privaten lokalen Dateien; für gemeinsamen Zugriff ist eine freigegebene Veröffentlichung notwendig.

## GitHub-Brücke zu den fünf Dots – optional und ausdrücklich getrennt

Wenn der Eigentümer Forschungssnapshots aus dem Laptop **öffentlich im Repository** mit den fünf Cloud-Dots teilen möchte, muss er separat eine GitHub-Zugangsberechtigung für **genau dieses Repo** einrichten. **Keinen Schlüssel im Chat senden oder in einer .bat-/Repo-Datei speichern.** Der GitHub-Publisher verwendet nur die *zur Laufzeit* aus der Windows-Umgebung bezogenen Werte `SNIPER_MARKET_PUBLISH=1` und `SNIPER_MARKET_GITHUB_TOKEN`.

**Wichtig:** GitHub-Contents-Rechte können nicht auf eine einzelne Datei eingeschränkt werden; der eigens entwickelte Publisher schreibt zwar ausschließlich `research/market/latest.json` auf dem **Arbeitsbranch**, aber der zugrundeliegende GitHub-Zugang hat weitere Berechtigungen in diesem Repo. Darum minimal notwendige Repo-Rechte, kurze Gültigkeit, geschützte lokale Verwaltung, niemals ein Token mit Konto-/Wallet-Zugriff.

Der Publisher ist **standardmäßig deaktiviert**. Erst nach Opt-in und echtem erfolgreichen lokalen API-Abruf aktualisiert er höchstens alle **15 Minuten** genau das nicht handelbare Research-Dokument. Im Fall eines GitHub-SHA-Konflikts, Netzfehlers oder fehlender Credentials wird **nicht** heimlich erneut auf den alten SHA überschrieben; lokales Sammeln läuft davon unabhängig weiter.

Die fünf Sniper-Dots können bei Vorhandensein des GitHub-Files `research/market/latest.json` (Branch `codex/research-gateway-v04`) lesen. Der Scout bleibt **alleiniger Schreiber** von `research/watchlist/current.json`; die anderen vier Rollen lesen Watchlist/Markt-Fakten und schreiben nur eigene Research-Dateien. **Ein Market-Snapshot ist kein zentraler Publisher und darf nie direkt an /api/decisions/events geleitet werden.**

## Technische Grenzen / Sicherheitsprüfungen

- Der neue Collector bestätigt **höchstens Pool-/Token-Identität** über zwei Marktdatenaggregatoren. Auch zwei Anbieter sind **keine** bestätigte Sellability/On-chain-Contract-Prüfung.
- DEX-Screener-Tokenprofile können bezahlte Profile sein und werden mit `promotion_biased:true` markiert. Nicht als organischen Hype zählen.
- `paper_only:true`, `actionable:false` in jedem Markt-Snapshot, einschließlich Fallback. Die lokalen Paper-Handelswege bleiben unverändert und der externe REAL_VALIDATOR_UNAVAILABLE-Blocker bleibt bestehen.
- Quelle/Beobachtungszeit von Pool-Entstehungszeit unterscheiden. Kein erfundener Käufercount, kein Echtzeit-WebSocket und keine garantierte weltweite Vollständigkeit.
- Der Publisher erzeugt **keine** Ed25519-Order-Signaturen, setzt keine fünf Stimmen und erhält keine Wallet-/Trading-/Fiat-Berechtigungen.
- Die Tests für externe API-Ausfälle werden mit lokalen simulierten HTTP-Antworten ausgeführt, **nicht** mit fiktiven Live-Kauf-/Verkaufs-Orders.

## Danach objektiv zu verifizieren

Erst wenn der Laptop tatsächlich einen erfolgreichen `research_market_snapshot.v1`-Datensatz schreibt und (nach separater Freigabe) `research/market/latest.json` auf GitHub erscheint, liegt ein echter gemeinsamer Datenpfad zu den Cloud-Dots vor. Bis dahin ist die Brücke **BLOCKED/NOT_CONFIGURED**, auch wenn die neuen Funktionen im GitHub-Repository syntaktisch und durch Unit-Tests funktionieren.

Quellen: https://api.geckoterminal.com/docs/index.html ; https://docs.dexscreener.com/api/reference .
