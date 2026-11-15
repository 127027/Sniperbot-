# R29 – Autonomes Live-Paper-Trading auf echten Marktdaten

**Datum: 15.11.2026 · Status: Code/Offline-Tests, noch KEIN auf diesem Windows-Laptop bestätigter Live-Paper-Fill.**

Repository: `127027/Sniperbot-` · Branch `codex/r29-chatgpt-github-paper-cycle-20261115`.
**R29 bleibt die App-Version.** Keine zweite Benutzer-Startdatei.

## Funktion

Der bestehende, lokale R29-Bot verwendet **ein einziges** virtuelles Paper-Konto aus `%LOCALAPPDATA%\MemeSniperPaper\paper-state-v03.json` (bzw. den bisherigen über `SNIPER_DATA_DIR` gewählten Ordner). Das Guthaben wird nicht automatisch zurückgesetzt, erhöht, kopiert oder in eine zweite Bilanz überführt.

Der bestehende Markt-Collector fragt öffentliche Daten ungefähr alle 120 Sekunden ab und archiviert Beobachtungen für den 30+30-Tage-Lernlauf. Neu: `runner/live-paper-autopilot.mjs` übernimmt unabhängig von einer kostenpflichtigen KI-API eine regelbasierte **virtuelle** BUY-/SELL-Prüfung und benutzt die bereits vorhandene signierte Paper-Order-Pipeline `runner/paper-agent-pipeline.mjs`.

- **Aktivierung:** Die einzige `Sniperbot_Starten.bat` startet über den Windows-Supervisor den lokalen Paper-Autopilot-Dienst mit. Er tätigt **keine Käufe**, solange der Benutzer nicht im lokalen Dashboard sowohl **Bot starten** als auch **Automatisches Paper-Trading aktivieren** gewählt hat.
- **Marktdaten:** Die Akquise erfolgt ausschließlich über `research-market-daemon`/GeckoTerminal. Es werden neue Pools auf Solana, Base, Ethereum, BNB erfasst. Für einen lokalen automatischen BUY werden derzeit **nur Ethereum/Base/BNB** betrachtet: Solana ist weiterhin unter Beobachtung, es besteht noch keine ausreichend belegte Solana-Buy-/Sellability-Vollprüfung.
- **Kandidat:** `chain + contract/mint + pool` müssen eindeutig sein; zwei unabhängige Anbieter bestätigen dieselbe EVM-Pair-Identität. Veröffentlichungszeitpunkt, Ursprung und Datenalter werden geprüft. Keine frei erfundenen Token-Adressen.
- **Sicherheit:** GoPlus Token Security und Honeypot.is Sell-Simulation werden kostenfrei/ohne vorausgesetzten Schlüssel angefragt. Fehlende Antworten, unbekannte Authority-/Proxy-/Mint-/Blacklist-Flags, Steuern über 5 %, fehlgeschlagene Simulationen oder nicht identische Token-/Pair-Adressen sperren den Kauf. Source-Dokumentation: `https://docs.gopluslabs.io/reference/tokensecurityusingget_1`, `https://docs.honeypot.is/ishoneypot`. Beide Dienste sind **keine Garantie**, dass sich ein Coin real zu diesem Preis verkaufen ließe.
- **Zusätzliche Bedingungen:** Frische, zum Pool passende DEX-Screener-Preise, mindestens 50.000 USD indikative Liquidität, plausibles Volumen/Käufer-Verhältnis, nicht auffällig hohe Volumen/Liquiditäts-Quote, nicht beworbene Pool-Fallback-Quelle, max. 15 % Kursabweichung gegenüber zuvor erfasster Quelle. Buyer-/Seller-Transaktionszahlen ersetzen **keinen** verifizierten Unique-Wallet-/Social-Nachweis.
- **Risikomanagement:** Max. **0,25 %** anfängliches geschätztes Kapitalrisiko pro Trade, **1 %** Nominalposition pro Coin, **3 %** Gesamtexposition, Tagesverlustgrenze **1 %**, Wochenverlustgrenze **2,5 %**, mindestens 50 TEST-USDC je tatsächlicher Paper-Position. Wenn 50 TEST-USDC im Risiko nicht mehr möglich sind, **kein BUY**, keine heimliche Lockerung der Limits. Bestehendes Budget-`SET_RANGE` wirkt zusätzlich. Keine Standardorder von 5.000 TEST-USDC bei 5.000 Guthaben.
- **Virtuelle Ausführung:** BUY wird **lokal** mit einem flüchtigen Ed25519-Signer signiert. Signatur, Preis, Identität und Sicherheits-/Risikogate werden **unmittelbar vor dem Paper-Fill** erneut geprüft; Transaktions-ID-Tombstones verhindern Replays. Virtuelle Position im bestehenden Paper-Konto; 1 % modellierte Einstiegskosten und 1 % Ausstiegskosten. **Kein echter DEX-Fill, kein Swap, keine Wallet-Transaktion.**
- **Verkauf:** Bereits gehaltene Autopilot-Positionen werden auch bei deaktivierten **Neukäufen** überprüft. Bei Preisrückgang, Gewinnmitnahme, starkem Liquiditätsabfluss oder Verkäufersprung: separat signierte virtuelle SELL-Order. Zusätzlich greifen vorhandene AUTO-Exit-Regeln auf frische indikative Kurse. Ohne frischen, zum ursprünglichen Pool passenden Kurs gibt es **keinen erfundenen Verkauf**; der Zustand bleibt offen und als Datenlücke sichtbar. Eine verkaufte Position wird für 12 Stunden nicht wieder gekauft.
- **Lern-/Audit-Daten:** Im lokalen `%LOCALAPPDATA%\MemeSniperPaper\live-paper-autopilot\latest.json` stehen letzte Entscheidung, erkannte Probleme, Anzahl übermittelter Orders und bestätigter virtueller Fills. Der historische R29-Forschungs- und Outcome-Collector läuft davon getrennt und archiviert weiterhin zeitpunktgerechte Beobachtungen.
- **GitHub-Kurier:** Der bestehende Kurier publiziert eine **gekürzte**, öffentliche Anzeige unter `research/r29/channel/live-paper-autopilot-status.json`: Aktivität, letzte Prüfung, virtuelle BUY-/SELL-Zähler, virtuelle Fills und Fehlerstatus. **Keine Kontostände, Gewinne, Coins, Wallet-Adressen oder Geheimnisse** werden dorthin kopiert. Der Anfangszustand `WAITING_FOR_UPDATED_LOCAL_BOT` ist ein Platzhalter und beweist keinen lokalen Live-Fill.

## Sicherheitsgrenzen und aktuelle Lücken

Diese Version hat **keine nachgewiesene profitable Strategie**. Käuferzählungen aus DEX-Snapshots sind keine verifizierten unterschiedlichen Wallets. Ohne belegte Unique-Wallet-/Social-Diversität ist ein BUY trotz Sicherheitsgate ein vorsichtiger regelbasierter Paper-Experimentaleinstieg, keine vollständig nachgewiesene 100-Punkte-GPT-Chancenbewertung.

Die fünf Cloud-Forschungs-Dots sind weiterhin nicht automatisch ein 24/7 signerfähiger Qualitätsquorum-Kanal. Die bestehende GitHub-Diagnose ist eine **Research-Empfehlung**, kein handelsausführender GPT-Prozess. Hier entscheidet ein lokaler deterministischer Regelmotor über simulierte Orders, nicht die ChatGPT-Websitzung. Erst nach separater Freigabe und Tests können echte fünf-Dot-QA-Signale für diese Strecke eingebunden werden.

**Kein Echtgeldmodus:** `SNIPER_LIVE_TRADING`, Wallet-, Solana-Transfer-, PayPal- und realer DEX-Tausch werden vom Live-Paper-Autopilot nicht angesprochen. Wenn eine Datenquelle nicht verfügbar ist, werden die Sicherheit und der Kauf **fail-closed** abgelehnt. GoPlus/Honeypot.is können API-Limits ändern oder Gebühren einführen; dann blockiert der Bot die entsprechenden Käufe statt kostenpflichtige Anfragen auszulösen.

**Risikobeschränkung ist nicht garantierter realisierter Verlust:** Ein Modell-Stopp von 10 % und ein virtuell berechneter 0,25-%-Risikorahmen schützen nicht gegen Kurslücken, Rug-Pulls oder Verkaufssperren. Das gesamte Kapital wäre bei einem echten Ausführungsexperiment gefährdet. Hier wird ausschließlich mit Testgeld gehandelt.

## Testnachweis und Betriebsabnahme

Die Windows-/Ubuntu-GitHub-Actions-Tests `.github/workflows/tests.yml` enthalten:

- `runner/live-paper-security.test.mjs`: sichere/unsichere Contract-Flags, fehlende RPC/API-Daten und Sell-Simulation.
- `runner/live-paper-autopilot.test.mjs`: ein **isolierter** E2E-Test mit Mock-Marktdaten und unabhängiger Sicherheits-Simulation: signierter BUY → virtuelle Position → Kursänderung → signierter SELL → Ledger-/P&L-Update → Reentry-Kühlzeit.
- `runner/live-paper-public-status.test.mjs`: private Daten werden nicht öffentlich über GitHub transportiert.
- Bestehende Regressionen, Windows Supervisor und nur eine `.bat`-Startdatei.

**Offline-Fixtures sind keine echten Marktausführungen.** Ein realer öffentlicher EVM-Kandidat gilt erst dann als akzeptiert, wenn der lokale Bot mit frischem Collector-Snapshot, zwei vollständigen Security-Checks, gültiger Risikoentscheidung und einem in `agentOrderReceipts` belegten `PAPER_FILLED` die virtuelle Position im **normalen** Konto eröffnet hat. Eine spätere tatsächliche virtuelle SELL-Quittung muss ebenfalls im normalen Konto belegt sein. Bis dahin ist der End-to-End-Produktionsnachweis **OFFEN**.

## Update auf dem Windows-Laptop

1. R29 mit `Q` beenden. Den gesamten bisherigen Bot-Ordner **inklusive versteckter `.local`** und `%LOCALAPPDATA%\MemeSniperPaper` sichern; niemals `paper-state-v03.json`, Token, Schlüssel, Wallet oder bisherige Trades zurücksetzen.
2. Programmdateien des **aktuellen R29-Branches** aus GitHub in den bestehenden Bot-Ordner übernehmen, ohne private Datenverzeichnisse zu überschreiben.
3. **Nur** `Sniperbot_Starten.bat` öffnen. Die eine Startdatei startet Bot, Markt-Collector, GitHub-Kurier und den neuen lokalen Autopilot.
4. Unter `http://127.0.0.1:3030` den Paper-Bot starten, **Automatisches Paper-Trading aktivieren** wählen, gegebenenfalls das Budget-`SET_RANGE` passend zum bestehenden virtuell verfügbaren Geld einstellen. **Kein neues Guthaben erzeugen**, sofern bereits Guthaben vorhanden.
5. Unter `http://127.0.0.1:3030/api/paper/autopilot/status` kontrollieren, dass `auto.enabled:true` und ein aktuelles `last_scan_at_utc` erscheinen; mögliche Statuswerte `NO_SUITABLE_CROSS_VERIFIED_EVM_CANDIDATES`, `NO_VERIFIED_SAFE_ENTRY` und `DATA_GAP_...` bedeuten echte **Ablehnung**, nicht einen gelungenen Trade.
6. Zur externen Diagnose `research/r29/channel/live-paper-autopilot-status.json` auf GitHub prüfen. Sie enthält **keine** Geldbeträge; Kontowerte nur im lokalen Dashboard ablesen.

Bei wenig oder unzureichend geprüften EVM-Coinstarts kann die Zahl **tatsächlicher Paper-Trades auch null sein**. Das ist bei einer strengen Sicherheitsstrategie ein korrektes Ergebnis und darf nicht durch synthetische oder ungeprüfte Käufe kaschiert werden.
