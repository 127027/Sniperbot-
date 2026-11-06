# Produktanforderungen – AI Meme Sniper (Soll-Zustand)

**Status:** Anforderungskatalog für Codex, **nicht** Beschreibung bereits implementierter Funktionen. Stand 2026-11-06. Windows 11 ist das primäre Zielsystem. Kein Bezug zum Hixton-Projekt.

## 1. Produktziel

Eine verständliche, lokal auf einem Windows-Laptop laufende Anwendung soll öffentlich handelbare Memecoins erkennen und anhand von mehreren unabhängigen Forschungsagenten bewerten, Kaufkandidaten priorisieren, eine regelgebundene Positionsgröße bestimmen, im Paper-Modus hypothetisch kaufen, Tage bis Monate halten und bei erkannten Verkaufssignalen simulierte Verkäufe ausführen. Später sind nach **gesonderter** Freigabe reale Trades sowie regulierte EUR-Ein-/Auszahlungen denkbar.

Beispiel: Der Nutzer fügt virtuell 50 € hinzu; Agenten finden einen Kandidaten; die Risk Engine genehmigt nachweislich nur einen simulierten Betrag innerhalb seiner Vorgaben; der Bot hält die Position auch mehrere Wochen und simuliert gegebenenfalls einen Exit. „50 € → 5.000 €“ ist ein Wunsch-/Extrembeispiel (**100×**) und weder eine Prognose noch ein garantiert oder regelmäßig erzielbares Ergebnis. Gebühren, illiquide Märkte und Rug-Pulls können die gesamte Einsatzsumme vernichten.

## 2. Bedienoberfläche (minimalistisch)

- Installierbar oder lokal startbar unter Windows 11; Oberfläche nur an `127.0.0.1` oder einer ausdrücklich autorisierten lokalen Adresse.
- Deutlich sichtbarer Modus `PAPER / NICHT ECHTES GELD`; optionale spätere Echtgeldfunktion muss technisch separat aktiviert und freigegeben werden.
- Bot AN/AUS bedeutet **neue Einstiege erlauben/sperren**, nicht „alles beenden“. Bestehende Positionen werden weiter überwacht und mit ihrer individuellen Exit-Regel behandelt.
- Separater globaler **Not-Aus**, der neue Orders sperrt und eine klar definierte Behandlung bestehender Positionen verlangt. Kein stilles Verhalten.
- Guthabenübersicht: virtuelle EUR und Test-USDC eindeutig trennen; offene Positionen, unrealisierter P&L, realisierter P&L, Kosten, veraltete Quotes und Feedstatus.
- Virtuelle EUR-Ein-/Auszahlung, virtuelle Umrechnung (im Prototyp ausdrücklich fiktiv 1:1) – echte PayPal-/Bankzahlung erst später über lizenzierten Provider, entsprechende KYC-/Compliance- und Wallet-Prozesse.
- Frei einstellbarer Min-/Maximalbetrag, z. B. **50–50**, **200–400**, **100–1000 Test-USDC**. Die Positionsgrößenberechnung begrenzt durch frei verfügbares Guthaben, Kapitalrisikobudget, Pool-Tiefe, Gebühren und Expositionslimits.
- Gleichzeitige **mehrere** Positionen (in V0.3 noch **nicht** unterstützt, dort max. 1); symbol- und chainübergreifende Gesamtlimits.
- Coin-Radar: Chain, Contract/Mint, Pool, Quelle, Beobachtungszeit, Liquidität, Volumen, Käufercluster, Risiko-/Verkaufbarkeitssignale und Entscheidungsstatus. Keine bloßen Ticker-Signale.
- Portfolio: laufende, nachvollziehbar zeitgestempelte Preisindikationen/Exit-Quotes, Stückzahl, Kaufbasis, Gebühren, P&L, Exit-Modus und Verkaufslog.
- Forschung: statusbasierte Liste beliebig vieler Agenten, Empfehlungen mit Quellen und Abweichungen zwischen Agenten, Begründung der zentralen Entscheidung.
- Grafische Ansicht für Desktop und Smartphone; kein cloudgebundener Zwang für die lokale Paper-Engine.

## 3. Märkte

Langfristig möglichst breite Multi-Chain-/Multi-DEX-Abdeckung und modulare Anbindung weiterer handelbarer Kryptowährungen; „**jede** Kryptowährung“ ist **kein** technischer Ist-Zustand: zentral gelistete Coins, nicht gelistete Contracts, proprietäre Märkte, geringe Pool-Tiefe und unterschiedliche Chain-Standards benötigen jeweils passende Adapter und Handelswege.

MVP-Priorität: **Solana**, später **Base, BNB Chain, Ethereum**. V0.3 liest neue Pools auf allen vier Chains, kann aber keine echte Order ausführen. Die native Solana-Mint/Freeze-Sicherheit und EVM-Sellbarkeit müssen zusätzlich auf Chain-Ebene geprüft werden.

## 4. Agentenmodell (unbegrenzte Zahl nach Kapazität)

Kein festes 2-Dot-Limit. Jeder spezialisierte Agent registriert sich mit `agent_id`, Typ, Modellschema-Version und Fähigkeiten. Rollen: Discovery, News, Social, Wallet/On-Chain, Contract-Sicherheit, Marktstruktur/Liquidität, Scam-Analyse, unabhängige QA, Handelsentscheidung und Positionsüberwachung. Funktionen können durch weitere Agenten ergänzt werden.

Ein Scout-Signal ist nur eine **Empfehlung**. Zentraler Decision-/Risk-Controller aggregiert nachvollziehbare Quellen und lehnt kritische Risiken unabhängig von der Anzahl positiver Empfehlungen ab. Mehrere Agenten allein beweisen keine Unabhängigkeit, wenn ihre Quellen identisch sind.

Die existierenden ChatGPT-Automationen laufen **nicht** automatisch in der lokalen Anwendung; ein real implementierter, authentifizierter und überprüfbarer Kommunikationskanal fehlt noch. Maximal stündliche ChatGPT-Automationen eignen sich nicht für Sekunden-Sniping; den schnellen Teil muss ein lokaler/remote Service übernehmen.

## 5. Trade- und Exit-Verhalten

1. Neue Pools entdecken und Contract eindeutig mit Chain und Pool identifizieren.
2. Verlässlichkeit der Daten, Alter, Liquidität, tatsächliche Käuferwallets und Kauf-/Verkaufstiefe bestimmen.
3. Contract-Sicherheit inkl. Authorities, Token-2022-Extensions, Holder-Verflechtungen, LP-Kontrolle, gebündelter Insiderwallets, Honeypot-/Sell-Simulation verifizieren.
4. Mehrere Agentenmeinungen und einen unabhängigen Risk-Gate-Befund zusammenführen.
5. **Fail-closed:** bei ungeprüfter Sicherheit, veralteten Daten, nicht simuliert verkäuflicher Position, nicht ausreichender Liquidität oder fehlender Orderroute kein Echtgeldkauf.
6. Im Paper-Modus eigene Größe errechnen, Quote zur Entscheidung und späteren hypothetischen Ausführung mit Gebühren, Slippage, Latenz und abgelehnten Fills loggen.
7. Position mindestens so lange halten können, wie die These gültig bleibt: Minuten, Tage, Wochen oder Monate.
8. Exit-Strategien **konfigurierbar**: HOLD bis manueller Entscheidung, regelbasierter Trailing-Stop, gestaffelte Gewinnmitnahme, Risk-Kill und Zeit-/News-Exit. Hohe Gewinne nicht als Verkaufsgarantie werten: bei Liquiditätsentzug können simulierte Exits nicht ausführbar sein.
9. Bot AUS blockiert nur neue Einstiege; bereits aktive Exit-Regeln gelten weiter. Bei Neustart Recovery aus persistiertem Ledger.
10. Jedes Ereignis auditierbar und reproduzierbar, keine doppelten Käufe bei mehrfach eintreffenden Agentensignalen.

## 6. 24/7-Betrieb

- Der lokale Runner arbeitet auch bei geschlossenem Browser; Laptop muss angeschaltet bleiben und darf nicht schlafen. Bei Ausschalten/Internetverlust gibt es **keinen** kontinuierlichen Echtzeit-Exit.
- Optionaler Windows-Autostart und Watchdog erst nach Nutzer-Einwilligung; Zustandsabgleich nach Wiederanlauf und Fehlersignal bei Datenlücken.
- Dauerhafte Events/Positionshistorie, Wiederherstellung, Backups und Datenschutz.
- Keine Wallet-Private-Keys in Sourcecode, Logs, GitHub oder Konfigurationsdateien. Für jede später erlaubte Echtgeldstufe getrennte Sicherheitsarchitektur.

## 7. Akzeptanzkriterien für die nächste Codex-Lieferung

- Neuer Windows-Checkout startet reproduzierbar mit `Windows_Starten.bat`, keine unbekannten Dienste oder Geheimnisse nötig.
- `50 € virtuell einzahlen → TEST-Kandidat → 50 Test-USDC simuliert kaufen → HOLD → Bot AUS → Exit-Regel läuft weiter` mit automatisierten Integrationstests.
- Neustart erhält Portfolio und Buchungen; reproduzierbares Fehlerhandling bei defekten Daten, Offline-Modus und Provider-Timeout.
- Scanner markiert Live-Daten, veraltete Daten und Demo-Daten klar unterschiedlich.
- Eingebundene Providerfelder mit aktuellen API-Fixtures getestet; kein gefälschtes Signal für fehlende Daten.
- Für neue Realmarkt-Paper-Einstiege Herkunft der Quote und Nichtverifizierbarkeit von Sicherheit sichtbar; kein Live-Kauf.
- Verschiedene Agentenmeinungen und zentrale Freigabe müssen zunächst mit **synthetischen**, versionierten Signalschemas getestet werden.
- CI und README stimmen mit tatsächlich ausführbarem Code überein.

## CODEx-LAPTOP-UEBERGABE 2026-11-06

- **Primärziel zuerst:** Nutzer kann repo direkt von GitHub auf Windows klonen und ohne Cloud-Dienst lokal starten; Codex überprüft und repariert Laufzeitfehler auf echtem Laptop, soweit Zugriffsrechte vorliegen.
- **Viele Agenten statt nur zwei:** alle verfügbaren Forschungsmodule können später nach Rolle an denselben Belegpool angebunden werden; stündliche ChatGPT-Dots sind nicht selbst eine latenzkritische Handelsengine. Ein sicheres gemeinsames Review und ein lokales Request-Gateway sind neue Funktionen.
- **Mehrere Coin-Positionen, unterschiedliche Investitionen:** bei jedem neuen potenziellen Coin unabhängige Prüfung und Budgetierung, kein mehrfacher blinder Kauf. Anlage z. B. 50–50 oder 200–400 Test-USDC, wählbar, niemals über verfügbares Cash und Exposure hinaus.
- **Strategie:** Coins dürfen lange gehalten werden, Positionsüberwachung und Exit-Engine müssen auch ohne Browser und bei Bot AUS laufen; bei Serverabschaltung/Windows-Ruhezustand gibt es keine Überwachung. Schutz durch persistente Daten, Watchdog und Recovery entwickeln.
- **Rendite:** 50 EUR auf 5000 EUR in einem Monat ist ein theoretisches Ausnahmeszenario, kein Leistungsziel oder Garantie. Exit wird durch überprüfte Verkaufbarkeit, Risiko, Marktdaten und implementierte Regeln bestimmt, nicht durch fixe Gewinnannahme.
- **Fiat/Paypal/Wallet:** echte Ein- und Auszahlungen sind NICHT IMPLEMENTIERT; Test-EUR dürfen nicht wie echte Euro angezeigt oder behandelt werden. 