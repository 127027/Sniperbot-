# Fünf Dots: Reparatur und historischer PEPE-Falltest

Stand: 13.11.2026. Ausschließlich Forschung; Bot-Installation, Konten und Orders unberührt.

## Automationen

Alle fünf bestehenden Dots haben im jeweiligen Chat bestätigt, ihren eigenen Forschungsauftrag auf 14.03.–14.05.2023 umgestellt und zurückgelesen zu haben. Stündlicher Takt und Aktivierung blieben erhalten. Dies sind protokollierte Bestätigungen der Dots; kein unabhängig ausgelesener Scheduler-Export und noch kein Beweis eines folgenden planmäßigen Laufs.

| Dot | Aufgabe / letzter belegter Stand |
|---|---|
| Meme Scout – Forschungsradar | Historische Kandidaten/Narrative; vorläufiger PEPE-Hinweis 18.04.2023 05:29 UTC, CoinDesk-Artikel später aktualisiert |
| Sniper Social Research | Historische Social-Belege; ZOOMER/BEN-Hinweise, falsche Blockchain bei „Floki Ethereum“ erkannt; Originalarchive fehlen |
| Sniper Onchain Research | PEPE-Identität/Pool; Cloud-DNS/Webzugriffe blockiert, deshalb Rohdatenbeschaffung hier am Laptop |
| Meme Sniper – Techniklabor | Historische Contract-/LP-Sicherheit; falscher Direktzugriff ergab404, Auflisten der eigenen Automation löste Zuordnung; Umstellung bestätigt, unabhängige Sicherheitsprüfung offen |
| Sniper Opportunity QA | Zeitgerechte Beweise, Trennung von Fallprüfung und Entdeckung, kein erfundener Erfolgsprozentsatz |

Neu verbindlich in ihren Aufträgen: getrennte Zähler für bearbeitet/datenbelegt/handelbar, höchstens8 Quellenabrufe je Lauf, höchstens1 Wiederholung gesperrter Zugriffe. Fehlende Daten sollen dokumentiert werden, statt den gesamten Kalender dauerhaft als unbearbeitet zu führen. Belege: dot-reports.json.

## Testdesign

PEPE wurde aus der bereitgestellten historischen Gewinnerliste ausgewählt, Startreferenz14.04.2023. Fenster14.03.–14.05.2023 einschließlich:62 Tage. Späteres ATH und Renditen sind keine Eingangsmerkmale. Die Auswahl eines bekannten Gewinners und das Vorwissen der Modelle verhindern einen echten Blindtest. Dies misst weder die Trefferquote über alle Coins noch85% Erfolgswahrscheinlichkeit. Das vorab an QA übergebene Ziel2x/14Tage ist nur ein späteres Auswertungskriterium.

Der Tageslauf rekonstruiert den letzten Ethereum-Block vor jedem UTC-Tagesende. Historische Contractexistenz, Poolreserven, Tokenreihenfolge, Owner und limited werden soweit verfügbar am konkreten Block abgefragt. Blockzeit und Folgeblock begrenzen den Informationsstand. Die Rohdaten wurden2026 beschafft, betreffen aber unveränderliche historische Ledgerzustände; sie beweisen nicht, dass ein Dot sie2023 tatsächlich gesehen hätte. Tagesendstände ersetzen keine intratägliche Quote, Gas-/Slippage-Rechnung oder Wallet-spezifische Verkaufssimulation.

## Konkrete Ereignisse am14.04.2023 (UTC)

| Zeit | Nachweis | Bedeutung |
|---|---|---|
|14:51:35|Token-Deployment, Block17046105|Identität existiert; allein kein Kaufsignal|
|17:21:11|Erste Poollogs, Block17046833|Poolstart; anfänglich2WETH im Sync-Event|
|17:34:47|BUY-Swap, Block17046900|Ein anderer Teilnehmer kaufte; Receipt erfolgreich|
|20:33:47|SELL-Swap, Block17047770|Ein anderer Teilnehmer verkaufte; Receipt erfolgreich|

Die ersten BUY-/SELL-Events im abgefragten Startbereich wurden gegen einen zweiten Datenanbieter anhand Transaktionshash, Block, Logindex und Beträgen geprüft. Das ist kein Paper-Trade der Dots und keine universelle Verkaufsgarantie. Siehe verified-swaps.json sowie raw/receipt_BUY_PEPE.json und raw/receipt_SELL_PEPE.json.

Am14.04.Tagesende weist der archivierte Pool rund8,388WETH Reserve auf. Owner und limited sind an diesem Tagesendblock null. Daraus darf nicht auf den Zustand beim ersten Kauf geschlossen werden; frühere Rechte und bereits gesetzte Blacklists sowie LP-Kontrolle bleiben gesondert zu prüfen. Der heute verifizierte Source enthält Owner-Blacklist-/Regelrechte; Zeitpunkt der Source-Verifikation und Übereinstimmung mit damaligem Bytecode sind gesonderte Anforderungen.

## Antwort auf „Wann würden die Dots investieren?“

**In diesem belegten Durchlauf: kein freigegebener Kauf.** Ein vorläufiges WATCH ergibt sich aus dem Scout-Bericht spätestens18.04.05:29UTC, jedoch ohne authentifizierte damalige Artikelfassung. Die Blockchain belegt frühere Handelsaktivität am14.04.; die Dots haben damit keine nachgewiesene damalige Entdeckung oder Kaufentscheidung geliefert. NO_BUY ist hier eine Diagnose fehlender Freigaben, kein Nachweis einer profitablen Strategie.

Fehlend bleiben unabhängige historische Contract-/Blacklist-/LP-Freigabe, zeitgerechte Social-Messreihen, vollständiges damaliges Kandidatenuniversum einschließlich Fehlschlägen, verbindliche Einstiegsregel und größenabhängige ausführbare Ein-/Ausstiegsquote. Ohne diese Grundlagen wird weder ein Fill noch eine85%-Prognose erfunden. Der Tageslauf enthält deshalb0Paper-BUY und0Paper-SELL.

## Dateien und Grenzen

daily-ledger.csv/json:62 Tageszeilen mit Entscheidung und Begründung. daily-raw/: originale Antworten einschließlich Zugriffslimits und späterer Ersatzabfragen. daily-manifest.json: SHA256-Prüfsummen. validation-result.json: tatsächlich bestandene Offline-Prüfungen und Datenabdeckung. replay.py, repair_days.py, verify_events.py, validate.py: nachvollziehbare read-only Rekonstruktion und Prüfungen; keine Botimporte, Schlüssel oder Orderaufrufe.

Die Auftragsschleife der fünf Dots ist verbessert und die Datenbeschaffung konkret vorangekommen. Vollständige autonome Früherkennung, sichere Handelsentscheidung, erfolgreicher planmäßiger Folgelauf und laufende Dot-zu-Bot-Integration sind dadurch noch nicht nachgewiesen. Der Nutzer hat die Botprüfung ausdrücklich zurückgestellt.
