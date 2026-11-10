> **Laptop-Bot V0.17 (10.11.2026):** [Dynamische Coin-/Blockchain-Aufträge ohne feste Tokenliste](docs/V17_DYNAMIC_TOKEN_CHAIN_ADAPTERS_AND_SIGNED_INTENTS.md). Neue Agenten-BUY/SELL-Kommandos binden Blockchain, echte Mint-/Contract-Adresse, genaue Geräte-ID und Wallet-Adresse, Einsatz und Mindestausgabe **kryptografisch an eine Ed25519-Signatur**. Auf Solana kann der Bot nach tatsächlicher Wallet-Bestand- und SOL-Gasprüfung für beliebige handelbare Mint-Paare eine **unverbindliche Jupiter-Quote** abrufen. Ethereum/Base/BNB-Chain-Adapters sind noch gesperrt; kein PayPal-in-Bot-Checkout, kein automatischer USDC-Kauf, **kein Echtgeld-Jupiter-Swap**. Die private Wallet bleibt lokal, das Blockchain-Vermögen ist öffentlich onchain. Draft PR #26, nicht in `main` oder auf dem Nutzer-Laptop installiert. **Bitte noch keine 50 EUR in die Beta-Wallet einzahlen.**

> **Laptop-Bot V0.16 (10.11.2026):** [Echte lokale Native-SOL-Überweisung mit Passwort, 75s-Vorschau, signierter RPC-Simulation, Transaktionsjournal und Wiederholschutz](docs/V16_LOCAL_SOL_TRANSFER_PAYPAL_ROUNDTRIP_READINESS.md). **Kein automatischer SOL↔USDC-Swap, kein PayPal-API-Checkout und noch keine unabhängige Echtgeld-Wallet-Abnahme.** Der PayPal-Kauf und Sell-Offramp bleiben beim externen Anbieter; die eigene Wallet-Adresse muss manuell eingegeben und jede einmalige Sell-Empfangsadresse exakt abgeglichen werden. Der Code ist in einem Draft PR #25, nicht auf deinem Laptop installiert und nicht auf `main` gemerged. **Bitte noch nicht die 50 EUR in die Entwicklungs-Wallet einzahlen.**

> **Bot-first V0.15 (10.11.2026):** [Ein Laptop als zentrale Steuerung, GitHub als signierter Präsenzkanal und eigene Wallet je Folgegerät](docs/V15_MASTER_LAPTOP_GITHUB_FOLLOWERS.md). Folgegeräte erhalten **keine** Wallet-/Master-Privatschlüssel, nutzen eine eigene `device_id` und blockieren Käufe/Verkäufe bei fehlender Master-Verbindung. Sichtbare Fehlermeldung: **„Keine Verbindung – ruf Andreas an“**. **Wichtig:** GitHub ist kein Echtzeit-Ausfallsignal, Live-Trading bleibt immer AUS; Ein-/Auszahlungen sind derzeit nur virtuelle PAPER-Buchungen. Keine Android-App, keine echte PayPal-Ein-/Auszahlung und keine vollständige automatische Token-Ausführung. Draft-PR #24; nicht auf Benutzergeräten installiert.

> **Bot-first V0.13 (10.11.2026):** [Vollständige Solana-Legacy/v0-Strukturprüfung, echte SOL-Mindestreserve, unsigned RPC-Simulation und finalisierte Einzelbelege](docs/V13_SOLANA_EXECUTION_SAFETY_AND_RECEIPTS.md). Der Windows-Bot hat **keine Live-Signing-/Sendefunktion und keine integrierte PayPal-Zahlungsabwicklung**. Geld und Wallet-Schlüssel bleiben vom GitHub-Forschungsnetzwerk getrennt. Entwicklung liegt im Draft-PR #22; auf dem privaten Windows-Laptop noch nicht installiert, keine 50-Euro-Zahlung durchgeführt.

> **Bot-first V0.12 (10.11.2026):** [Wallet-Guthaben, Transaktionseingänge, beide Jupiter-Kursrichtungen und unsignierte Orderprüfung](docs/V12_WALLET_HOLDINGS_ROUNDTRIP_AND_UNSIGNED_ORDER.md). Der lokal sichtbare Bot liest finalisierte eigene Solana-/SPL-Bestände sowie letzte SOL-Überweisungen, prüft SOL→beliebiger Token→SOL, erkennt eine für die eigene Wallet vorbereitete unsigned Jupiter-Transaktion und zeigt technische Sperrgründe. **Niemals private Schlüssel, PayPal-Freigaben oder Handelsaufträge an Dots/GitHub übertragen. Keine echte PayPal-Zahlung oder realer Swap im Bot implementiert.** Branch: `codex/v12-solana-roundtrip-quote-and-holdings-20261110`; noch nicht auf dem Benutzerlaptop installiert oder sicherheitsauditiert.

> **V0.9 Erweiterung – 10.11.2026:** [Autonomer, read-only Dual-Provider-Poolabgleich, lokales Evidenzarchiv und kryptografisches Sechs-Prinzipale-Quorum](docs/V09_POOL_READBACK_QUORUM_20261110.md). Der Windows-Server kann bis zu drei GitHub-Kandidaten alle fünf Minuten bei GeckoTerminal und DEX Screener nachprüfen, lokale Evidenz archivieren und eine streng reduzierte Rückmeldung über den bestehenden optionalen Markt-Publisher an die Dots übergeben. **Keine echten Signed-Dot-Claims, keine Contract-/Sellability-Freigaben, keine automatischen externen Paper-Orders, kein LIVE**. Entwicklungsbranch: `codex/v09-live-pool-readback-20261110`; noch nicht auf dem persönlichen Laptop abgenommen.

> **V0.9 – Windows-Paper-Integration (10.11.2026):** Aktueller geprüfter Entwicklungsstand auf Branch `codex/v09-local-wallet-readiness-20261110`. Dashboard und Server enthalten `/api/v09/status` (Fünf-Dot-GitHub-Status und begründete Ausführungssperren) sowie eine **rein rechnerische** EUR→Test-USDC-Vorschau, die kein Guthaben ändert und keine Zahlung ausführt. Watch-only-Wallet-Vorbereitung legt **keine** Wallet/Keys an. GitHub Actions: Node-Tests, echter Server-Start und nativer Windows-Supervisor-Selbsttest erfolgreich. **Noch keine produktive autonome fünf-Dot-Paper-Ausführung und kein Live-Modus.** Siehe [V0.9 Startanleitung und bekannte Grenzen](docs/V09_WINDOWS_START_20261110.md).

> **V0.7 – Historischer Blind-Replay und Original-News-Archiv (10.11.2026):** [Fünf öffentliche historische Fälle, 225 Tage, Datenlücken und Ursachen](docs/HISTORICAL_BLIND_FIVE_CASES_20261110.md). Im GitHub-Test `node runner/historical-blind-five.mjs --json` werden 5 vorab ausgewählte historische Meme-Coin-Fälle jeden Tag vom 30. Tag vor bis zum 14. Tag nach dem jeweiligen Ereignis geprüft, mit strengem Zeit-Gate und separater Wahrheits-Hülle. **Keiner der fünf historischen Gewinne/Käufe/Exits ist bisher verlässlich nachweisbar**: nachträglich abgerufene Nachrichten und ATH dürfen nicht in damalige Entscheidungen gelangen. Daher meldet der Replay-Datensatz korrekt `UNTESTABLE`, nicht 5/5 Treffer. Für zukünftig echte Zeitdaten sammelt der lokale Collector jetzt alle 15 Min. öffentliche Decrypt-/BeInCrypto-/Cointelegraph-RSS-Titel mit erstmals beobachteter UTC-Zeit in `.local/research-learning/news-captures.json` und reicht die letzten 60 Min. nur informativ an die **fünf bestehenden Forschungs-Dots** weiter. Weiterhin PAPER ONLY, kein Echtgeld, keine echten autonomen externen BUY/SELL-Freigaben. Die private Excel-Datei wurde nicht öffentlich hochgeladen.

> **V0.6 (10.11.2026):** [Gesamtbudget statt pro-Trade-Grenze, fünf proaktive Memecoin-Dots, zusätzliche nicht-chartbasierte Discovery und ehrliche Rücktest-Grenzen](docs/V06_TOTAL_BUDGET_AND_MULTI_SOURCE_DISCOVERY_20261110.md). **Erste UI-Zahl = bevorzugter Einzelkauf, zweite = gesamtes gleichzeitig gebundenes Paper-Budget; Einzeleinstiege ab 50 Test-USDC.** 200–300 erlaubt 50+50+200, aber nicht 200+200. Die fünf aktiven stündlichen Forschungsrollen durchsuchen eigenständig öffentlich verifizierbare News/Social/Onchain/Contract/QA-Quellen; lokale 2-Minuten-Collector-Profile/Community-Takeovers/bezahlte Boosts werden nur als Forschungs-Hinweise geteilt, kein bestätigter viraler Trend. Echte externe automatische Paper-BUY/SELL bleiben durch fehlende unabhängige Risk-/Sellability-/signierte Entscheidungsadapter gesperrt. 

> **V0.5 Forschungsbrücke – 10.11.2026:** [Fünf-Dot-Kandidatenprüfung und frühe Markt-Beschleunigungs-Alerts](docs/V05_RESEARCH_ADVISORY_AND_EVENT_BRIDGE_20261110.md). GitHub-Snapshots erlauben jetzt bis zu 96 neue Poolidentitäten, Markt-Alerts der letzten 60 Minuten und eine nicht handelbare, im Dashboard sichtbare gemeinsame Prüfwarteschlange. Die fünf bestehenden Cloud-Dots prüfen diese Hinweise unabhängig. Ein hoher Score oder mehrere Rollen-Erwähnungen ist KEIN Nachweis einer 95%-Kurschance und erzeugt keinen Paper-Kauf. **Echte externe automatische Paper-Ein- und Ausstiege bleiben bis unabhängiger Contract-/Sellability-/Quote-Adapter und signiertem 5/5-Risikokonsens gesperrt.** Das synthetische Trailing-Exit-Szenario mit laufengelassenem 3×-Gewinn wird separat getestet.\n\n> **V0.5 Forschungs-Ausbau (09.11.2026):** Der Windows-Collector beobachtet pro 2 Minuten bis zu 96 neue deduplizierte Poolidentitäten über zwei Seiten pro Chain, speichert begrenzte 14-Tage-Kursnachbeobachtungen und ausgewählte Negativkontrollen unter `.local/research-learning/pools.json` und zeigt im Dashboard fünf GitHub-Rollen plus lokalen Forschungsspeicher. 14-Tage-Kursziele **2×/5×/10×/50×/200×** sind indikative Forschungsereignisse, keine gesicherten verkaufbaren Gewinne oder kalibrierten Wahrscheinlichkeiten. Fünf bestehende Research-Automationen wurden auf neue Memecoin-Starts fokussiert, aber **kein** echter Contract-/Sellability-Validator oder autonome externe Paper-Kaufkette ist angeschlossen. [V0.5-Stand und Installation](docs/V05_DISCOVERY_LEARNING_STATUS_20261109.md).\n\n> **Aktuelle Forschungs- und Kapitalstrategie (09.11.2026):** [Strategisches Paper-Kapital, fünf Forschungsrollen und 14-Tage-Wahrscheinlichkeit](docs/STRATEGIC_PAPER_CAPITAL_V1.md). Min/Max sind Grenzen **je Kauf** und keine lineare Prozentformel. Kleine Prüfpositionen verwenden meist das Minimum; eine gesondert einstimmig und unabhängig begründete Hochüberzeugungs-Chance darf mehr vom verbleibenden freien Paper-Kapital nutzen. Ein Rating von 95 ist **keine 95-%-Wahrscheinlichkeit**; ohne 14-tägige vollständige Kohortendaten bleibt die Ausbruchswahrscheinlichkeit unkalibriert. Keine realen externen automatischen Paper-Käufe ohne echten unabhängigen Sicherheits-/Verkaufbarkeitsadapter. Der Laptop kann jetzt alle fünf GitHub-Rollenberichte **nur lesend** anzeigen, aber die Cloud-Dots haben keinen direkten lokalen Portfoliosteuerungszugang.\n\n## Windows-Ein-Klick-Start (09.11.2026)

**Empfohlener Start ab diesem Arbeitsbranch: nur noch `Sniperbot_Starten.bat` doppelklicken.** Damit starten der bestehende Paper-Bot, sein Forschungsstatusfeed und der Markt-Collector samt optional verschlüsselter GitHub-Forschungsübertragung gemeinsam. Ein Kontrollfenster; mit **Q** geordnet stoppen; Fenster schließen beendet dank Windows-Prozessgruppe alle zugehörigen lokalen Prozesse. Einmalig eigenen GitHub-Token verdeckt eingeben, danach ist er per Windows-DPAPI im Benutzerprofil verschlüsselt gespeichert.

**Aktualisieren:** Bestehenden Ordner und `%LOCALAPPDATA%\MemeSniperPaper` sichern. Arbeitsbranch-ZIP herunterladen, **nur Programmdateien in vorhandenen Ordner kopieren**, `.local/`/Paper-Guthaben erhalten. Die drei alten Startdateien wurden entfernt. Einziger regulärer Starter ist `Sniperbot_Starten.bat`. Kein Echtgeld, keine automatische Konto-/Wallet-Integration. [Schritt-für-Schritt-Anleitung](docs/WINDOWS_EIN_KLICK_START_20261109.md).

---

> **NEUE VERBINDLICHE PRODUKTSPEZIFIKATION (07.11.2026): Ein gemeinsames Forschungsnetzwerk, beliebig viele voneinander isolierte Sniperbot-Installationen.** Jeder Empfänger nutzt sein **eigenes** virtuelles bzw. später gesondert freigegebenes echtes Konto, eigene Wallet, Guthaben, Einstellungen und Trading-Engine. Die fünf zentralen Forschungsrollen publizieren nur Kaufkandidaten und Exit-Hinweise an alle ausdrücklich abonnierenden Instanzen. **Keine fremden Kontozugriffe, keine fremden Orders, kein gemeinsames Guthaben.** Eine nachweisliche Dot-Zustellung und ein zentraler Geräte-Broadcast fehlen heute noch. Siehe [Mehrgeräte-Sollarchitektur](docs/DISTRIBUTED_INSTANCES.md), [Signalverteiler-Protokoll](docs/SIGNAL_DISTRIBUTION_PROTOCOL.md), [Halte-/Exit-Policy](docs/HOLD_EXIT_POLICY.md), [Ist-/Soll-Stand](docs/IMPLEMENTATION_STATUS_2026-11-07.md).

> **Stand heute: V0.4, ausschließlich PAPER.** GitHub ist Code-/Forschungsprojekt, nicht laufender Live-Broker. Eine Installation auf Windows ≠ unabhängige native Android-Engine. Echte PayPal-Zahlungen, Wallets und Handel sind NICHT implementiert oder freigegeben.

# Implementierungsstand V0.4 – lokaler Forschungs-Gateway

Neu: authentifizierte rollengetrennte Research-API, persistente Belege/Stimmen/Gegenargumente,
5/5-Prüfung und separate synthetische Risikoprüfung, idempotente Paper-Käufe,
mehrere Positionen mit Min/Max-Einsatz je Coin und Demo-Trailing ohne feste Gewinnkappung.
Der Scanner entdeckt weiterhin neue Pools; es gibt keine feste Liste von 20 Coins.
Min/Max gilt je Kauf; keine zusätzliche Positionsanzahl- oder Gesamteinsatzgrenze.

**Echte Dots sind noch nicht verbunden.** Externe Research-Nachrichten können lokal
angenommen werden, lösen aber ohne implementierte unabhängige On-Chain-/Sell-Adapter
keine automatischen Käufe aus. Der vollständige Auto-Ablauf ist mit erfundenen
Testcoins geprüft. Heuristischer Scanner-Autokauf ist abgeschaltet.

Windows-Daten liegen standardmäßig unter `%LOCALAPPDATA%/MemeSniperPaper`, außerhalb
von OneDrive. Bestehende `.local/paper-state-v03.json` wird einmalig kopiert und als
Migrationsbackup erhalten. `SNIPER_DATA_DIR` überschreibt den Speicherort.
Beschädigte Daten stoppen den Start, statt das Portfolio zurückzusetzen.

Anleitung, Schnittstellen, Dot-Anbindung und Grenzen: [GATEWAY_V04.md](docs/GATEWAY_V04.md).
Tests: `node runner/test.mjs` und `node --test runner/*.test.mjs`.

Die nachfolgende V0.3-Dokumentation beschreibt den historischen Ausgangsstand;
bei Widersprüchen gilt der oben verlinkte V0.4-Implementierungsstand.

---

# Meme Sniper AI – Lokal, minimalistisch, Windows

**Version 0.3 + Codex-Handoff (06.11.2026) – ausschließlich TEST-/PAPER-TRADING; keine echten Einzahlungen, Auszahlungen, Kryptowährungskäufe oder Wallet-Zugriffe.**

## In drei Schritten starten

1. **Node.js 22 LTS oder neuer** installieren: https://nodejs.org
2. ZIP in einen eigenen Ordner entpacken.
3. `Sniperbot_Starten.bat` doppelklicken. Dashboard: **http://127.0.0.1:3030**. Das schwarze Terminal-Fenster geöffnet lassen.

Keine `npm install` für die Startversion nötig. Zum Testen: `Windows_Tests.bat` bzw. `node runner/test.mjs` und `node --test runner/integration.test.mjs`. Der HTTP-Integrationstest arbeitet **offline** mit einem separaten temporären Datenordner und verändert dein Portfolio nicht.

## Erstes Szenario: 50 € Testguthaben → Sniper-Testkauf

1. Dashboard öffnen, **Testguthaben +50 €** klicken. Es wird nur eine virtuelle Zahl gespeichert – es fließt kein Geld.
2. Auf **Bot AN** schalten. Standardgröße ist **50–50 Test-USDC**, also genau eine Position von 50 Test-USDC.
3. Auf **Testsignal erstellen** klicken. Der angezeigte `TEST`-Coin ist vollständig erfunden, damit der Ablauf ohne Marktfeed überprüfbar ist.
4. **Testkauf 50** klicken (oder vorher den optionalen Paper-Autokauf einschalten, dann kauft ein Demo-Signal ebenfalls automatisch). Beim Kauf wandelt der Server die 50 virtuellen EUR automatisch 1:1 in Test-USDC. Das ist ein absichtlich fiktiver Umrechnungskurs und kein tatsächlicher EUR/USD/USDC-Wechselkurs. Modellierte Kaufkosten 1 %.
5. Position erscheint unter **Gekaufte Coins**. Standardmäßig **HOLD**, sie bleibt also liegen bis du sie verkaufst.
6. Optional **Legacy-Demo-Ausstiege** aktivieren (+15 % / −10 %). **Dies ist noch nicht die geplante adaptive Sniper-Verkaufsstrategie.** Auch wenn Bot AUS ist, bleibt der Exitprozess für bestehende Positionen aktiv, solange der Laptop-Runner läuft.
7. Über **Verkaufen** wird ein Testverkauf gebucht. Nur frei verfügbares virtuelles EUR-Guthaben kann abgehoben werden; vorher Test-USDC zurück in Demo-EUR tauschen (bei vorhandenem freien Test-USDC).

## Vier Chain-Scanner (nur lesend)

Das Dashboard ruft über den lokalen Node-Server öffentliche **GeckoTerminal**-Endpunkte für neue Pools auf Solana, Base, BNB Chain und Ethereum ab. Der Server benutzt außerdem **DEX Screener** für Token-Details und die Schätzung des aktuellen Positionswerts. Es können **nur beobachtete handelbare DEX-Tokens** angezeigt werden; das ist noch kein Zugang zu *jeder* Kryptowährung oder zu zentralisierten Börsen. Manuelle Contract-Suche über Chain + Token-Adresse ist möglich.

Scoring erfolgt nur anhand einfacher Marktkennzahlen. **Es ist keine KI-Prognose, kein Vertragssicherheitsnachweis und keine Garantie für eine tatsächlich verkäufliche Position.** Gelegentlich fehlen Daten und die Quellen können ausfallen. Der App-Status zeigt das an. Die simulierten Testkäufe basieren auf beobachteten Preismeldungen; reale Orderausführung und echte Wallet-Swaps sind nicht enthalten.

## Einstellungen

- Bot AN/AUS: **AUS verhindert neue Paperkäufe**, aber bestehende Positionen werden weiter markiert und beim AUTO-Exit automatisch geschlossen.
- Paper-Autokauf optional: nur falls Scanner einen Kandidaten nach einer konservativen, nicht auditierenden Punktelogik markiert und ausreichend Testguthaben vorhanden ist. Die Funktion ist standardmäßig AUS.
- Positionsgröße flexibel: `50–50`, `200–400` oder frei eingeben; max. 1 Position gleichzeitig in der aktuellen Testversion (**mehrere** parallele Positionen sind für Codex als Anforderung spezifiziert).
- Exit: Standard **HOLD** (Position bleibt liegen), alternativ **LEGACY AUTO** mit Stop-Loss/Take-Profit (aktuell +15 %; Ablösung in Arbeit).
- Testguthaben-Ein-/Auszahlung und 1:1-Testumtausch; **keine PayPal- oder Bankanbindung**.

## 24/7

Runner läuft im schwarzen Terminal im Hintergrund – unabhängig vom Browser, aber **nicht unabhängig von Windows/Laptop**. Windows-Energiesparmodus deaktivieren; nach Windows-Neustart manuell neu starten. Keine Autostart-Aufgabe wird ohne Einwilligung eingerichtet. Die Daten bleiben lokal in `.local/paper-state-v03.json`, nicht in GitHub.

## GitHub / Codex

Das offizielle Repository ist **[127027/Sniperbot-](https://github.com/127027/Sniperbot-)**. Es ist derzeit **öffentlich**: keine Zugangsdaten oder echten Kundendaten committen. Auf deinem Laptop mit Git klonen und lokal testen; Codex liest `AGENTS.md` und den Arbeitsauftrag unter `docs/CODEX_TASKS.md`. Ein älteres Helper-Skript für neue private Repositories wird nicht benötigt.

### Vollständige Codex-Übergabedokumentation

- [AGENTS.md](AGENTS.md): verbindliche Codex-/Agenten-Regeln
- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md): vollständiges Nutzerziel inkl. Multi-Agenten-System und langfristigem HOLD
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Ist- und Soll-Architektur
- [docs/AGENT_PROTOCOL.md](docs/AGENT_PROTOCOL.md): skalierbare Agentenereignisse (noch **nicht** implementiert)
- [docs/CODEX_TASKS.md](docs/CODEX_TASKS.md): Prioritäten P0–P6 mit Abnahmekriterien
- [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md): nachweislich offene Funktionen
- [docs/SECURITY.md](docs/SECURITY.md): Sicherheitsgrenzen und Datenschutz
- [docs/GITHUB_VERÖFFENTLICHEN.md](docs/GITHUB_VERÖFFENTLICHEN.md): GitHub-Veröffentlichung ohne Eingriff in Hixton
- [docs/ROADMAP.md](docs/ROADMAP.md): Meilensteine
- [.github/workflows/tests.yml](.github/workflows/tests.yml): Offline-CI

**Wichtig für Codex:** Ein möglicher 100-facher Coin-Anstieg (50 EUR → 5.000 EUR) ist ein hypothetischer Wunschfall, kein Profitversprechen. Langfristige HOLDs, mehrere getrennte Käufe und 1..N Agenten sind Zielzustand; der Prototyp kann das noch nicht vollständig. Das vorhandene GitHub-Repository ist das Ziel für die Übergabe.


## Anbieterquellen

- https://apiguide.geckoterminal.com/getting-started
- https://docs.dexscreener.com/api/reference
- https://cli.github.com/manual/gh_repo_create

**Sicherheitsgrenze:** Kein automatischer Echtgeldhandel und keine echte Zahlungsannahme. Die bestehenden Hixton-Repos/Dots werden nicht benötigt oder geändert.

## Designvorschau

Die Desktop- und Smartphone-Vorschau ist im ursprünglichen Windows-Übergabepaket vorhanden; die beiden Bilddateien sind noch **nicht** in diesem Repository eingecheckt. Für den tatsächlichen Programmstand gilt der Quellcode unter `runner/`.

Codex kann die visuellen Akzeptanztests auf Windows wiederholen und dabei aktuelle Screenshots erzeugen.

Die Bilder zeigen einen Testzustand. Sie beweisen keine aktuelle Kurs-/KI-/Transaktionsanbindung.

## Codex übernehmen lassen – Laptop und alle Forschungsagenten

**Aktueller GitHub-Ort:** https://github.com/127027/Sniperbot- (öffentlich sichtbar; niemals Zugangsdaten committen). **Codex ist der technische Maintainer**, der den Stand auf Windows 11 klont, startet, Fehlermeldungen untersucht, reproduzierbare Tests durchführt und Patches in diesem Repository erstellt – nur soweit Codex tatsächlich Zugriff auf den Laptop erhält. Dazu `AGENTS.md` und `docs/CODEX_TASKS.md` lesen.

**Forschungsrollen:** 1..N spezialisierte Agenten/Dots suchen Coins, teilen recherchierte Belege und Gegenargumente, validieren potenzielle Kandidaten gegenseitig und senden erst über einen noch zu bauenden, authentifizierten Gateway strukturierte Vorschläge an die lokale Paper-Risk-Engine. Kein Agent darf unmittelbar Orderbefehle auslösen. Voraussetzung sind unabhängige On-Chain-Checks, Pool-Liquidität, Verkaufbarkeit, Budgets und `Bot AN`.

Aktuelle Grenzen: Die Dot-zu-Bot-Kommunikation ist NICHT integriert; Coin-Qualifikation und Exit-Realismus müssen entwickelt und getestet werden. Langfristige Portfolio-Strategie ist vorgesehen, aber derzeit ist höchstens eine simulierte Position gleichzeitig unterstützt.

**GitHub-Verwendung auf Windows:** `git clone https://github.com/127027/Sniperbot-.git` und `cd Sniperbot-`, dann `Windows_Tests.bat` sowie `Sniperbot_Starten.bat`. Node.js 22+ benötigt. Die lokale API erscheint nur unter http://127.0.0.1:3030. Für das Ziel eines nicht-technischen Nutzers sollte Codex einen sicheren Windows-Installer bzw. Starter entwickeln.

## Strategiewechsel: Fünf Agenten und langfristiger High-Upside-Sniper (freigegeben am 06.11.2026)

**Verbindlicher neuer Codex-Auftrag:** [Fünf-Agenten-Strategie, dynamische Positionsgrößen, adaptive Exits](docs/STRATEGY_5_AGENT_BIG_MOVES.md). Codex-Details und Abnahmetests: [docs/CODEX_TASKS.md](docs/CODEX_TASKS.md) und GitHub-Issues.

- **Ziel:** Früh vor einer breiten organischen Memecoin-Nachfragewelle einsteigen; mögliche starke Kursanstiege über Tage/Wochen begleiten. 50 auf 5.000 ist eine extreme hypothetische 100×-Entwicklung, kein Beleg und kein Versprechen.
- **Fünf Fachrollen:** News/Discovery, Social-Momentum, On-Chain/Liquidität, Contract-/Rug-Risiko, unabhängige Opportunity-/QA-Prüfung. Vor Paper-Autokauf soll vorläufig 5/5 aktueller, unabhängiger Reviews plus ein externes hartes Risk-Gate nötig sein. Andere verfügbare Forschungsagenten können später unterstützen (Registry 1..N).
- **Bot-Einsätze:** Nutzerdefiniertes Minimum/Maximum, z. B. 50–1000 TEST-USDC; je Kandidat ist 0 oder ein Wert dazwischen möglich. Kein automatisches Maximieren auf 1.000 wegen eines KI-Scores. Cash, Positions-/Portfoliorisiko, Liquidität, Gebühren, Slippage und Sellbarkeit bleiben Grenzen.
- **Keine feste Gewinnkappung:** Der aktuelle AUTO-Exit bei **+15 %** ist **LEGACY/DEMO**, **nicht** die gewünschte Sniper-Strategie. Codex muss den pauschalen TP durch eine getestete dynamische Exit-Engine ersetzen (Trend, Trailing, Liquiditäts-/Risk-Exit, lange Haltedauer). Der aktuelle Quellcode wurde durch diesen Dokumentationscommit **nicht** verändert.
- **Bot AUS:** Blockiert Neueinstiege, **niemals** die Überwachung oder aktive Exit-Regeln offener Positionen.
- **Nicht implementiert:** Fünf verbundene Dots, direkte Dot-zu-Windows-Kommunikation, autonome KI-Ausführung, sichere Paper-Einstiege nach neuem Konsens, adaptive Exit-Engine und Echtgeldhandel. Vor allem gilt der derzeitige Scanner nicht als vorhersagefähiges 100×-System.

**Sicherheit:** Aktuell nur PAPER, keine echten Geldflüsse/Orders und kein Eingriff in Hixton.

## Optionaler Scout-Forschungseingang (Arbeitsbranch)

`Sniperbot_Starten.bat` startet den lokalen Bot mit aktiviertem Nur-Informations-Feed und den Markt-Collector samt GitHub-Publisher (nach DPAPI-Token-Einrichtung). Vorher einen bereits laufenden Bot und Collector beenden; pro Datenordner läuft nur eine Instanz.

Der Feed liest öffentliche Scout-Nachrichten über GitHub; er nimmt **keine Kaufbefehle** an. Im Dashboard steht der Eingang unter „Scout-Eingang“. Technischer lokaler Empfangsnachweis: `/api/research/inbox`.

Ein historischer echter Scout-Test wurde auf Windows empfangen und in drei weiteren isolierten Testinstanzen bestätigt. Regelmäßige Veröffentlichung und tatsächliche Empfangsbelege werden separat dokumentiert: [Empfangsnachweis](docs/SCOUT_INBOX_PROOF.md), [Grenzen und Betrieb](docs/RESEARCH_INBOX.md). Kein Smartphone-Host, kein signierter Echtzeit-Broker, keine Echtgeldfunktion.
