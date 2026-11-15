# R27 – Memecoin-Früherkennung, as-of KI-Analyse und Frequenzvergleich

**Stand:** 15. November 2026 · **PAPER ONLY / NO REAL MONEY**.

**Branches:** Entwicklung `codex/r27-early-discovery-asof-ai-20261115`, 
V0.21-Basis `codex/sniper-central-ai-paper-v021-20261114`,
R26-Vergleich `codex/r26-15day-1v4v12v24-frequency-20261114`.

## 1. Eingebaut und getestet

### Ein zentraler Prozess, keine neuen Dots

- `runner/central-ai-coordinator.mjs` bleibt der einzige opt-in stündliche KI-Prozess.
- Der vorhandene 2-Minuten-Forschungscollector zeichnet nach freigegebenem Windows-Start fortlaufend neue öffentliche DEX-Pool- und RSS-Nachrichten-Snapshots auf. R27 nutzt diese Daten zusätzlich zu stündlichen Scans.
- `runner/r27-early-bridge.mjs` nimmt nur frische, exakt chain- und poolgebundene Kandidaten sowie Aktivitätsbeschleunigungen und Narrative auf. Paid Boost ≠ organische Viralität. Ein Nachrichtenbeitrag allein identifiziert noch keinen Token.
- `runner/r27-market-regime.mjs` ruft öffentlich die abgeschlossenen BTC-/ETH-Stundenkerzen ab. Starker Abwärtstrend oder Datenfehler ⇒ **neue automatische BUYs blockiert**. Bestehende SELL-Empfehlungen bleiben erlaubt.
- Ein KI-Score ist keine kalibrierte Gewinnwahrscheinlichkeit. Ein WATCH, HOLD oder NO_TRADE ist akzeptabel.
- Echtgeld-Swaps bleiben gesperrt. Automatische Paper-Fills werden nach wie vor nur zu **indikativen, ausdrücklich nicht als ausführbar bestätigten** DEX-Kursen modelliert.

### Lokales Prospektiv-Archiv

`runner/r27-prospective-capture.mjs` speichert immutable, öffentliche Daten am Zeitpunkt ihrer **ersten lokalen Beobachtung**.

Windows-Ordner:

`%LOCALAPPDATA%\MemeSniperPaper\r27-evidence\captures\YYYYMMDD\`

Die Dateien werden unter einem SHA-256-gebundenen Dateinamen mit `wx` (nicht überschreiben) geschrieben. Sie enthalten keine Wallet-Schlüssel, Zugangsdaten, privaten Ledger oder echten Transaktionen.

Die lokale Archivierung ist **kein extern notariell beglaubigter Zeitstempel und keine Vollerfassung aller DEX-Pools**. Das bestehende GT-New-Pools-Scanning hat eine beschränkte Seitenzahl. Bei Quellen-/RPC-Ausfällen ist die Abdeckung lückenhaft. Dateien nicht löschen, bei einem Gerätewechsel separat sichern.

Der Windows-Supervisor startet den Collector nun bei aktivem zentralen KI-Modus mit vorhandenem API-Key; bei einem Neustart der App startet auch der Collector neu. Zum Stoppen Q oder das Konsolenfenster schließen.

Status im Dashboard `http://127.0.0.1:3030`: zentrale KI, Marktfilter und R27-Archiv. Technischer JSON-Status unter `/api/central-ai/status` und `/api/r27/archive/status`.

### Historischer, strikt abgeschotteter Replay

`research/r27/r27-asof-frequency.mjs` erzeugt genau:

- 1/Tag: 15 Zeitpunkte
- 4/Tag: 60 Zeitpunkte
- 12/Tag: 180 Zeitpunkte
- 24/Tag: 360 Zeitpunkte
- zusammen: 615 Zeitpunkte für 30.10.2026 00:00 UTC bis 14.11.2026 00:00 UTC (exklusiv).

Der historische Replay-Adapter `r27-historical-ai.mjs` akzeptiert **nur** freigegebene, zeitversiegelte Evidence-Frames; `tools:[]` verhindert aktuelle Internetrecherche während einer historischen KI-Entscheidung. Modellinterne Erinnerungen an spätere Gewinner bleiben jedoch ein mögliches Problem und müssen in echten Blindtests geprüft werden.

Fehlende Nachrichten, Sicherheitsnachweise oder Pool-/Quoten-Abdeckung führen zu `DATA_GAP_NOT_NO_TRADE`, nicht zu einem behaupteten Kauf oder 0-Gewinn. Das Replay führt **niemals** Wallet- oder bestehende Paper-Konto-Aktionen aus.

## 2. Tatsächliches Ergebnis der R27-Quellenprüfung

GitHub Actions hat am 15.11.2026 eine **einmalige** historische GDELT-Metadaten-Abfrage und die 615-Zeitpunkt-Evidence-Prüfung ausgeführt.

- GDELT: **HTTP 429** bereits beim ersten dreitägigen Zeitfenster.
- Vier weitere Zeitfenster absichtlich nicht erneut abgefragt, um den öffentlichen Dienst nicht weiter zu belasten.
- Nachträglich verfügbare Metadaten-URLs in diesem Lauf: **0**.
- Auf Echtheit und damalige Verfügbarkeit unabhängig geprüfte Eingaben: **0**.
- Nachweisbar vollständig abgedeckte historische KI-Frames: **0 von 615**.
- Tatsächlich abgefragte historische OpenAI-Modelle: **0**.
- Historische verifizierte BUY-/SELL-Ausführungen: **0**.
- Historischer **KI-Gewinn, Verlust, Frequenzsieger: nicht bestimmbar**.

Das ist **kein Beleg, dass die KI keine Coins entdeckt hätte**. Es bedeutet ausschließlich, dass die benötigten damaligen Quelldaten nicht bereitstehen.

Der frühere R26-Test mit Binance-Stundenkerzen bleibt eine **separate, preisbasierte Regelstrategie**: 1/Tag -912,31, 4/Tag -1.429,45, 12/Tag -1.907,45, 24/Tag -1.828,74 virtuelle USDC. Diese vier Zahlen nicht als KI-News-Ergebnis ausgeben. Eine No-Trade-Kontrolle hätte die ursprünglichen 5.000 virtuellen Recheneinheiten nominell erhalten, Wechsel- und Emittentenrisiken eines echten Stablecoins ausgenommen.

## 3. Verfügbare Quellen und Grenzen

- **GeckoTerminal API** (https://api.geckoterminal.com/docs/index.html): aktuelle neue Pools, historische OHLCV zu **bereits bekannten** Pooladressen. Die `before_timestamp`-Abfrage ist keine historische `new_pools`-Discovery-Liste. Retrospektiv ausgewählte bekannte Gewinner dürfen nicht unbemerkt in eine historisch blinde Suchmenge gelangen.
- **GDELT DOC** (https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/): journalistische Publikationsmetadaten mit Datumsfenstern, kein Beweis der exakt damals erfassten Originaltexte. Ein aktueller Abruf ist niemals automatisch ein zeitkorrektes Archiv.
- **DEX Screener API** (https://docs.dexscreener.com/api/reference): öffentliche aktuelle Paare, Promotionen und Token-Metadaten; bezahlte Promotionen sind keine unabhängige Social-Prognose.

Die Schnittstelle `r27-source-probe.mjs` kann historische OHLCV für genau benannte Pools abrufen. **Deren Aufnahme in einen Blindtest benötigt eine nachweisbar zum betrachteten Zeitpunkt erstellte neutrale Kandidatenliste**, statt sich auf heutige Ticker oder spätere Gewinner zu stützen.

## 4. Nächste Voraussetzung für einen echten historischen R27-Backtest

1. Vollständige, neutrale Pool-Entdeckungsdaten zum historischen Zeitpunkt mit geprüften Chain-/Contract-/Pool-Identitäten.
2. Zeitgestempelte, unveränderliche Original-Nachrichten und Social-/Kulturereignisse aus dem Zeitraum.
3. Historische Sicherheitszustände, Liquidität, Gebühren, Gas und im nächsten Tick überprüfte Ein- UND Ausstiegsquotes.
4. Erst anschließend kostenpflichtige Modellaufrufe mit isolierten historischen Frames; API-Key nur lokal, **niemals im GitHub-Repository**.
5. Getrennte Ergebnis-Kontrolle: 5000 TEST-USDC, 50–5000 Kauf, max. 5000 offenes Risikokapital; kein Hebel, keine Echtgeldkäufe; Netto-PnL, realisiert/unrealisiert, Max-DD und Datenlücken ausweisen.
6. Strategie zusätzlich auf einem *separaten* Zeitraum testen. Keine nachträgliche Optimierung allein anhand dieses 15-Tage-Fensters.

## 5. Installation und Test

1. Den R27-Branch in GitHub auswählen und `Code → Download ZIP` entpacken.
2. Windows mit installiertem Node.js 22: `Sniperbot_Starten.bat` starten.
3. OpenAI-API-Key **optional** verdeckt lokal per DPAPI einrichten (separat kostenpflichtig). Ohne Key keine stündliche KI und kein automatischer Collector in diesem Modus.
4. Paper-Kapital setzen, lokalen Bot AN, Option `Automatische KI-Paper-Orders erlauben` nur für rein virtuellen Betrieb aktivieren.
5. Dashboard beobachten: Quellenarchiv, Marktfilter, neue Pool-Hinweise, signierte Paper-Eingänge. Keinen Key, keine Seedphrase und keine verschlüsselte Wallet öffentlich hochladen.

GitHub-Actions-Regressionsprüfungen: `node --test research/r27/r27.test.mjs research/r27/r27-source-probe.test.mjs runner/r27-early-bridge.test.mjs`. Der Run für die **historische Quellenprüfung** besitzt keine zeitliche Wiederholung und startet keine KI-Kaufautomationen.

**Fertig und überprüfbar:** Datenmodell, as-of-Schranke, prospektive Archivierung, Filter, Schnittstellen und Tests.

**Nicht fertig / nicht behauptet:** Vollständiger historischer KI-Handelsgewinn, unabhängiger Sicherheitsnachweis aller Kandidaten, künftige Gewinnerquote oder Echtgeldhandel.
