# Soll-Architektur: Ein Forschungsnetzwerk, beliebig viele voneinander unabhängige Sniperbots

**Freigabe des Product Owners: 07.11.2026.** Dieses Dokument ist die verbindliche Zieldefinition für Codex. **Nicht als bereits implementiertes System verstehen.** Die bestehende V0.4 ist ein lokaler Paper-Trading-Prototyp mit synthetischem Fünf-Rollen-Gateway, ohne bestätigte echte Dot-Zustellung oder Mehrgeräte-Broadcast. Nur `127027/Sniperbot-`; Hixton bleibt vollständig unberührt.

## 1. Geschäfts-/Nutzerprinzip

- Ein Entwicklerkonto / ein gemeinsames Forschungsprojekt: **GitHub `127027/Sniperbot-`** ist Quelle für Quellcode, Dokumentation, Versionierung und gemeinsame Forschungssoftware. **GitHub ist kein Live-Signalbroker, kein Wallet-Host, keine Guthabendatenbank und keine Infrastruktur, die Dots automatisch ausführt.**
- Die **fünf zentralen Forschungsrollen** sammeln aktuelle Quellen und tauschen Beweise/Gegenbeweise aus. Im Sollzustand arbeiten sie für **alle registrierten, ausdrücklich abonnierenden Bot-Instanzen**, nicht nur für den Laptop des Projektinhabers.
- Jede Person (beispielsweise Eigentümer, Sascha, weitere Freunde) erhält **eine eigene Installation/Instanz**, kann ein eigenes Konto anlegen, eigene Ein-/Auszahlungen vornehmen, eigene Handelsgrenzen konfigurieren, eigene Coins halten und unabhängig kaufen/verkaufen.
- Keine gemeinsame Trading-Kasse, keine gemeinsamen Wallets, keine gemeinsam schreibbare Portfolio-Datenbank. **50 € auf Gerät A haben keinerlei Verbindung zu 50 € auf Gerät B**. Auch ein gemeinsamer Coin erzeugt getrennte Käufe und Verluste/Gewinne.
- Der Betreiber des Forschungsnetzwerks darf **keine Einsicht in private Salden, Wallet-Secrets, lokalen Handelsverlauf oder fremde Bestände** erhalten und darf keine Einstellungen anderer Nutzer fernsteuern. Er ist Signalsender, kein Vermögensverwalter im Bot. Vor echter Vermarktung zusätzlich rechtliche / regulatorische Pflichten prüfen.

## 2. Architekturdiagramm

```text
    ZENTRAL (FORSCHUNG, NICHT GELD)
    read-only News + Social + On-chain + New Pools
                  |
         Evidence Store / Event Journal
                  |
        A1 Discovery/News
        A2 Social Acceleration
        A3 On-chain/Liquidity
        A4 Contract/Scam
        A5 Independent Opportunity/QA
                  |
    5 unabhängige aktuelle Reviews, Gegenbelege,
    Quellabgleich und separater Hard-Risk-Check
                  |
        Signed Candidate / Risk / Exit ADVISORIES
                  |
       Authenticated Event Distributor (ZIEL)
          |            |             |
    Client A        Client B       Client C ...
       |               |              |
    Lokaler Bot A    Lokaler Bot B   Lokaler Bot C
    eigenes Konto   eigenes Konto   eigenes Konto
    eigenes Cash    eigenes Cash    eigenes Cash
    eigene Wallet   eigene Wallet   eigene Wallet
    eigene Trades   eigene Trades   eigene Trades
    eigene Exits    eigene Exits    eigene Exits
       |               |              |
     Handy A          Handy B        Handy C
    (authentifizierte, nur eigene Instanz steuernde UI)
```

**Signal empfangen != Order autorisieren.** Jeder Client verarbeitet Signale durch eigene, unabhängige lokale Contract-/Pool-/Sellability-Prüfung, Settings, Bot AN/AUS, Cash/Quote/Slippage- und Risiko-Gates. Jede Instanz darf denselben Kandidaten anders bewerten; z. B. Bot A investiert 50 Test-USDC, B 200, C 0. Ausfälle/Offline des zentralen Researchsystems dürfen die lokale Verwaltung bestehender Positionen nicht abschalten.

## 3. Unabhängige Nutzer- und Instanzidentität

- Bei Installation erhält jeder unabhängige Nutzer eine **eindeutige lokale Nutzer-/Mandantenidentität** und einen oder mehrere separat registrierte Geräte/Instanzen. Ein Freund nutzt **nicht** das Konto oder die Gateway-Tokens des Projektinhabers.
- Authentifizierung, Verschlüsselung, Tokenrotation und Revocation pro Instanz. Jede Instanz generiert eigene Secrets lokal; die zentralen Rollen haben nie Zugriff darauf. Authentifizierter Versand über TLS zu explizit abonnierenden Geräten (bevorzugt **ausgehend** aufgebaute Verbindung, z. B. WSS/SSE mit Queue oder abgesichertes Polling). Keine öffentlich ungeschützte localhost-API, kein pauschaler Portforward.
- Das vorhandene `SNIPER_AGENT_TOKEN` aus V0.4 ist **lokal und an genau eine Forschungsrolle gebunden**, kein allgemeiner Transporttoken, den mehrere Nutzer teilen dürfen.
- Eigener Datenpfad und Ledger pro Konto, eigene Recovery/Backups und ggf. später eigenes Wallet-Custody-Design. Kein gemeinsamer OneDrive-Ordner, kein gemeinsam genutztes `gateway-credentials.json`, keine Cloud-Replikation privater Bestände über das Entwicklerkonto.
- Status/Metadaten an den Publisher maximal: Instanz online/offline, Abo-Version und letzte zugestellte Message-ID, sofern Nutzer zustimmt. Weder Salden noch Positionen notwendig, um Broadcast zu liefern. Datenschutz/DSGVO, Datenminimierung, Löschung und Zustimmung dokumentieren.
- Ein Nutzer kann perspektivisch mehrere eigene Geräte bedienen (z. B. Windows-Dienst + Handy), während **die Kontohoheit** weiter ausschließlich beim Nutzer liegt. Gerätepaarung autorisiert nur eigene Instanzen.

## 4. Geräte und 24/7-Betrieb

**Zielgeräte:** Windows-Laptop/PC als erster eigener Bot-Host; mehrere Windows-/später andere Desktop-Rechner oder separat gehostete Instanzen; Mobilgerät als sichere App/PWA zum Anzeigen/Steuern des **eigenen** Bots. Auf dem Handy tatsächlich autonom als Host zu laufen ist eine **separate Entwicklungsstufe**: Android/iOS begrenzen Hintergrundausführung, Netzwerk und Energiesparmodi. Eine Webansicht auf dem Handy macht einen ausgeschalteten Laptop nicht wieder 24/7-fähig.

Die Forschung kann zentral rund um die Uhr durch eine geeignete **dauerhaft betriebene** Datensammel-/Agenten-Infrastruktur stattfinden. Die derzeitigen zwei ChatGPT-Forschungsautomationen sind kein nachgewiesener durchgängiger Fünf-Agenten-Live-Dienst. Fünf **logische** Rollen im Gateway sind nicht gleich fünf verbundene ChatGPT-Dots. Keine tatsächliche Dot-Verbindung ohne Serverantwort/Event-ID behaupten.

## 5. Kapitalbeispiele, pro Nutzer und pro Position

Der Nutzer legt `minTrade = 50` / `maxTrade = 200` Test-USDC fest:
- Instanz A hat nur 50 freie Test-USDC: höchstens 50 TEST-USDC Einsatz einschließlich modellierter Einstandskosten, **wenn** sie eine ausreichende Kauf- und Exit-Quote sowie Sicherheitsfreigabe erhält; andernfalls 0.
- Instanz B hat 200 freie Test-USDC: kann beispielsweise 50+50+100 in getrennte Coins investieren, wenn unabhängige Prüfungen bestanden und Kapital noch frei ist.
- A verkauft hypothetisch eine Position zu 10.000 Test-USDC nach Kosten: der Betrag wird erst **nach tatsächlich gebuchtem Paper-Verkauf** frei; offener, nicht realisierter Marktwert ist kein auszahlbares Guthaben. Danach gelten dieselben 50–200 Grenzen pro neuem Coin weiter.
- C verwendet individuelle Grenzen, z. B. 50–1000; B bleibt bei 50–200. Ein zentrales Signal darf keine der beiden Einstellungen überschreiben.
- Keine Pflicht zum Kauf oder zum Maximalbetrag; `0` ist zulässig. Gebühren, Slippage und vorhandene freie Mittel berücksichtigen. In einem zukünftigen Echtgeldmodus separate freigegebene Risikopolitik erforderlich.
- **Aktueller Ist-Stand:** V0.4 kennt nur virtuelle EUR und Test-USDC zum ausdrücklich fiktiven Kurs 1:1. PayPal-Kontoaufladung, echte EUR/USDC-Konvertierung, tatsächliche Wallets, reale Orders und Auszahlung sind **nicht implementiert**.

## 6. Akzeptanzkriterien für Codex

1. Drei **isolierte Testinstanzen** A/B/C starten mit eigenen Datenordnern, Port-/Instanz-IDs, unterschiedlichen Gateway-Identitäten und jeweils 50 virtuellen EUR. Keine Daten-/Zugangskreuzung.
2. Gemeinsamer synthetischer Fünf-Rollen-Kandidat wird an A/B/C verteilt. Alle zeigen identische Kandidaten-/Beleg-IDs, aber getrennte lokale Entscheidungen; A kauft 50 TEST-USDC, B 0, C anders, je nach eigenen Limits.
3. Test mit A=50, B=200, C=0 Guthaben: kein Übergriff; A kann B weder abfragen noch ändern; der zentrale Research-Publisher kann keine Buchungen auf A/B/C erzwingen.
4. Extern übermittelter Exit-Hinweis erreicht alle abonnierten Instanzen. Jeder entscheidet anhand eigener Positionen, lokalen Exit-Regeln und realistischen Paper-Sell-Quotes. Ohne Position / ohne freigegebenen Exit keine Order. `Bot AUS` verhindert Einstiege, blockiert aber *nicht* lokale Positionsexits.
5. Ein Client ist 24h offline: Queue-Rückstände werden mit Sequenznummer/TTL markiert; abgelaufene **Kauf**-Signale dürfen keinen verspäteten Kauf auslösen. Verbindung kommt sicher zurück; Exit-/Risk-Status wird lokal rekonstruiert und marktseitig neu bewertet.
6. Negative Isolationstests: Token B auf A; Signatur-/Nonce-Replay; gefälschte Freigabe; Scope-Eskalation; fremde Wallet/Balance; doppelte Events; mehrfach zugestellte Warnungen; kompromittierte oder widerrufene Instanz.
7. Tests unter Windows; Handyzugriff auf den **eigenen** Host, ohne offenes CORS/Portforwarding. Keine Behauptung einer nativen APK oder eines echten Multi-Tenant-Service ohne realen Build/Test.

## 7. Releasegrenzen

Zuerst reine **Paper-Simulation**. Echte EUR-Aufladung via PayPal und regulierte Umwandlung zu Krypto erfordern gesonderte Produktauswahl, Anbieterfreigabe, Authentifizierung, KYC/AML, Haftungs-/Rechtsprüfung und einen neuen ausdrücklichen Auftrag. Keine API-/Wallet-/PayPal-Schlüssel teilen, keine realen Trades. Dieses Dokument autorisiert keine Installation auf Freunden-Geräten oder Zugriff auf deren Daten.

**Referenzen:** [SIGNAL_DISTRIBUTION_PROTOCOL.md](SIGNAL_DISTRIBUTION_PROTOCOL.md), [HOLD_EXIT_POLICY.md](HOLD_EXIT_POLICY.md), [GATEWAY_V04.md](GATEWAY_V04.md), [AGENT_PROTOCOL.md](AGENT_PROTOCOL.md).
