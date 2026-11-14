# Memecoin Sniper V2 – belegter Arbeitsstand vom 13.11.2026

**Ergebnis: Bestandsaufnahme und lokale Paper-Härtung umgesetzt; kein freigegebener autonomer Realmarkt-Paperbetrieb und keine vollständige Dot-Anbindung. Kein Echtgeldzugriff und keine Echtgeldorder ausgeführt.**

## Untersuchte Versionen und Betriebszustand

- GitHub `127027/Sniperbot-`, `main` README sowie Branchübersicht gelesen. `main` beschreibt noch V0.4 und ist nicht der neueste Implementierungsstand.
- Arbeitsgrundlage: `codex/v21-paper-lifecycle-evidence-20261112`, Commit `2c6c1487eadaf2dbd66eca9b01ca3090178c9819`. Änderungen isoliert auf `codex/memecoin-sniper-v2-paper-hardening-20261113`; kein Merge nach main und keine Änderung anderer Forschungsbranches.
- Der in der lokalen Überwachungsautomation genannte Ordner `Sniperbot` existiert hier nicht. Eine Installation `Sniperbot0.1` wurde gefunden; deren Code wurde nur gelesen. Der getestete Checkout ist eine eigene Kopie. Kein privates Portfolio kopiert, zurückgesetzt oder finanziert.
- Bei der Prozessprüfung war kein `node`-Prozess sichtbar. Das ist eine Momentaufnahme, kein Nachweis eines 24/7-Betriebs oder der Nichtexistenz anderer Laufzeitformen. Die eigenen temporären Testserver wurden nach Tests beendet.
- Der neuere Code enthält neben Paper auch Wallet-/Transfer-Labormodule. Diese wurden weder aktiviert noch mit privaten Daten ausgeführt. Die vorherige CI enthielt öffentliche Chain-Probes einschließlich Transaktionssimulation; die CI dieses Änderungsbranches wurde auf eine explizite Offline-Paper-Testliste begrenzt. Swap-Live-Modus bleibt gesperrt. Eine global geprüfte reine Paper-Produktauslieferung ist damit noch nicht nachgewiesen.

## Fünf Dots: aktuelle Berichte direkt verifiziert

Alle fünf Chats und alle fünf aktuellen GitHub-Forschungsdateien gelesen. Forschungsbranch: `codex/dots-memecoin-training-only-20261112`, Verzeichnis `research/historical/TRAINING_ONLY_20261112/`. In allen fünf Dateien: `mode=TRAINING_ONLY`, `state=PENDING`, `bot_handoff=PAUSED`, `orders_sent=0`. Das bestätigt veröffentlichte Forschung, nicht die aktuelle Scheduler-Konfiguration oder eine signierte Zustellung an den Laptop.

| Dot / Rolle | Befund | Gelesener Blob-SHA |
|---|---|---|
| Meme Scout – Forschungsradar / news_discovery | Drei Tage punktuell; keine vollständige Tagesabdeckung, Archivfassungen fehlen | ca56fefa90e46fa63d35765dabcd6a17534af060 |
| Sniper Social Research / social_acceleration | Zehn von 61 Tagen punktuell, keine bestätigten historischen Beschleunigungszeitreihen | 987248870ed2ee377f05cb7b734d459ba2c8e68b |
| Sniper Onchain Research / onchain_liquidity | Eine vorläufige ETH-Token-/Pool-Zuordnung; Receipts/Reserven/Sell-Quotes fehlen | 002573443a69d16b6c9718f01ebd2f02692f5ad3 |
| Meme Sniper – Techniklabor / contract_security | Historische Contract-/LP-/Verkaufsnachweise UNKNOWN | 90448b690f1d01c549b00ebfe867e97bb51fd8bb |
| Sniper Opportunity QA / opportunity_qa | 4/4 Peers PENDING, 0/61 vollständig abgedeckte Tage, kein hypothetischer Trade | 5eba5b16cc4c343d23bdda2b305816be9e7b7b36 |

Rollenlast: Keine vergleichbaren Laufzeit-, Ressourcen- oder Backlog-Messreihen vorhanden. Gleiche Auslastung ist daher nicht nachgewiesen. Wiederholte blockierte Quellenabrufe bei Onchain und Security liefern wenig neue Evidenz; QA hängt an vier unvollständigen Peers. Die vorbereitete [Dot-Policy](SNIPER_V2_DOT_POLICY.md) begrenzt Wiederholungen, verteilt Beschaffung/Analyse/Prüfung und definiert ein messbares 20-%-Ziel je Rolle. Sie wurde **nicht** in die Cloud-Scheduler geschrieben: hierfür sind keine passenden Bearbeitungswerkzeuge bzw. verifizierten Scheduler-IDs verfügbar. Keine Ersatzautomationen erstellt.

## Historische Datei

Original: `meme_coins_2013_2026_historische_datenbank(5).xlsx`, SHA-256 `f746a855675807f1dc0ad9d2170f1efef0c35d9d105eb545821a49304ad44a88`. Recherchestand laut Datei: 09.11.2026. Sechs Blätter vollständig tabellarisch gelesen, Original unverändert.

- Chronologie: 89 Projekte, davon 72 ohne Start-/Ersthandelsdatum, 80 ohne frühen Referenzkurs, 61 ohne Peakpreis und 82 ohne ATH-Datum.
- Separate Tabellen: 23 ATH-Einträge, 14 Hype-Ereignisse, 281 zeitgenössische Kategorieeinträge. Diese Zahlen nicht zu einer eindeutigen Coin-Gesamtzahl addieren.
- 103 Formeln; Chronologie enthält neun numerische zwischengespeicherte Renditen und 80 leere Ergebnisse. Eine vorhandene Formel ist kein vorhandener Datenwert.
- Wiederholte Ticker: CAT zweimal, TRUMP dreimal, BROCCOLI zweimal. Keine sichere Identifikation ohne Chain/Contract/Pool.
- Status: 60 im damaligen aktuellen Index, 25 ungeprüft, ein eingestelltes Projekt, ein historisch offenes und zwei Crash-/offene Fälle. Einzelne negative Beispiele bilden keine vollständige Negativkohorte.

**Eignung:** Rechercheverzeichnis und rückblickende Vergleichsfälle. Null für einen belastbaren kausalen Handelsbacktest freigegebene Zeilen. Die Datei enthält keine vollständigen Point-in-time-Merkmalsverläufe, unveränderlichen historischen Quellencaptures, Contract-/Poolidentitäten, Launch-Gesamtkohorten, mengenbezogenen Ausführungsquotes oder vorab festgehaltenen Prognosen. Quellen-URLs wurden als Verweise erfasst; nicht jeder externe Inhalt wurde erneut unabhängig verifiziert.

Look-ahead: ATH, Peakdatum, heutiger Status und spätere Hype-Beschreibungen dürfen nicht in damalige Eingangsmerkmale gelangen. Survivorship/Selection: aktuelle Kategorie und manuell bekannte Fälle sind kein historisches Tokenuniversum. Ein ATL kann nach dem ATH liegen. Datenlücken bleiben UNKNOWN statt Verlust/Nullrendite. Historische Erfolgsquote, Brier-Score, Netto-PnL und Drawdown bleiben daher **nicht berechenbar**, nicht null.

Reproduzierbare Prüfung: `python research/audit_memecoin_workbook.py <datei.xlsx> <audit.json>` (openpyxl erforderlich). Die Nutzerdaten selbst werden nicht ins öffentliche Repository aufgenommen. Für belastbare Walk-forward-Tests fehlen vorab definierte Launch-Kohorten inklusive Delistings/Rugs, zeitlich verfügbare Merkmale, ausführbare Einstiegs-/Ausstiegsdaten und getrennte Trainings-/Validierungs-/Testfenster mit Abstand mindestens des Labelhorizonts.

## Änderungen

1. Dauerhafter Signal-ID/Digest-Speicher zusätzlich zu den letzten 250 UI-Belegen. Wiederholung und abweichender Inhalt bleiben auch nach Verdrängung und Neustart blockiert. Ab 100.000 IDs wird sicher angehalten statt gelöscht. Vorhandene noch gespeicherte Belege werden migriert; bereits vor dieser Änderung verlorene IDs können nicht rekonstruiert werden.
2. Solana-Adressen werden exakt verglichen; EVM-Adressen bleiben case-insensitive. Quote-/Pool-Pinning und doppelte EVM-Positionen bei verschiedener Schreibweise abgesichert.
3. Der signierte Agentenpfad akzeptierte zuvor indikative DEX-Kurse als ausreichende Fill-Grundlage. Jetzt sind externe Fills standardmäßig mit `INDEPENDENT_EXECUTION_VALIDATOR_UNAVAILABLE` blockiert. Nur ausdrückliche synthetische Tests können buchen; der HTTP-Pfad verlangt dafür OFFLINE + QA + Testquote. `synthetic_test` und `execution_evidence` stehen im Beleg. Kein übergebenes Signal kann diese Optionen setzen.
4. Beschädigter persistierter Wiederholschutz wird abgewiesen, nicht zurückgesetzt.
5. 45-Tage-Prüfpunkt als nicht ausführbare Review-Funktion ergänzt. Kein automatischer Verkauf und keine Änderung bestehender Exit-Einstellungen. Die bestehende dynamische Review-Funktion bleibt eine Beratungskomponente, keine vollständig angeschlossene autonome Exit-Engine. Teilverkäufe sind weiterhin nicht implementiert.
6. Fünf-Rollen-Policy und reproduzierbarer Excel-Datenaudit ergänzt. Keine unbelegte Prognosequote aus einem Score erzeugt.

Kapital: Aktueller Code verwendet V0.6-Gesamtbudget über offene Einstandswerte, bevorzugten Einzelbetrag und mindestens 50 Test-USDC pro Kauf. Die ältere 80/92-Interpolation ist nicht die aktuelle Kapitalregel. Nutzerkapital und Limits wurden nicht geändert.

## Ausgeführte Prüfungen

Windows, Node.js 24.18.0; temporäre Datenordner und kurzlebige Ed25519-Testpublisher, keine Cloud-Dot-Schlüssel oder Walletsignaturen.

- 85 Unit-/Regressionsprüfungen bestanden: alle vier Chains, Gewinn/Verlust, Signaturmanipulation, unbekannte/widerrufene Publisher, falsches Gerät, abgelaufene Signale, Budget/Bot-AUS, falsche/stale Quotes, IDs nach mehr als 250 Belegen, persistierter Wiederholschutz, Quellen-/Quorum-/Kalibrierungsgates und 45-Tage-Review.
- Drei HTTP-/Speicherintegrationstests bestanden: Gateway, Neustart und beschädigte Datei ohne Reset. Ein anfänglicher lokaler Verbindungsfehler war auf Ausführungsbeschränkungen zurückzuführen; mit erlaubtem lokalen Testserver bestanden. Ein grenzzeitabhängiger Windows-Test wurde durch eine um eine Sekunde zurückdatierte Testfixture stabilisiert; Produktions-Zeitregeln bleiben unverändert.
- Tatsächlicher lokaler HTTP-Rundlauf: signiertes BUY → eine Paper-Position → identisches BUY ohne Zweitbuchung → signiertes SELL → keine offene Position → Prozessneustart → identisches SELL ohne Zweitbuchung. Zwei Paper-Fills. Ausschließlich erfundener Kurs 0,05 → 0,10 und 50 virtuelle Einheiten: modellierter Gewinn 48,01 Test-USDC nach den bestehenden 1-%-Kosten je Seite. **Kein Strategie- oder Rentabilitätsnachweis.**
- Core-Smoke-Test, Server-Syntax, Dashboard-Syntax und Diff-Prüfung bestanden. Kein visueller Browser-Abnahmetest und kein 24/7-/Sleep-/Wiederanlauf-Langzeittest in diesem Auftrag.
- GitHub-CI ist auf Windows/Linux mit Node 22 vorbereitet; lokaler Testnachweis ist davon getrennt. CI-Erfolg erst nach tatsächlichem Run melden.

## Verbleibende Blocker

1. Fünf Scheduler-Konfigurationen direkt lesen/ändern/zurücklesen und neue Policy tatsächlich aktivieren. Veröffentlichte Dateien reichen dafür nicht.
2. Tatsächlicher Dot-Publisher mit zugeordnetem öffentlichen Schlüssel, Rollenrechten, Rotation und echtem Empfangsbeleg fehlt. Lokaler Testsender ist kein Cloud-Dot.
3. Unabhängige Contract-/LP-/Holder-/mengenbezogene Sell-Quote-Adapter fehlen. Deshalb keine externen autonomen Paper-Fills freigeben. Die Härteprüfung ersetzt keinen solchen Adapter.
4. Unverzerrte historische Daten und prospektiv eingefrorene Prognosen fehlen; keine belastbare Wahrscheinlichkeit, Trefferquote oder Profitabilität.
5. Verbesserungen sind auf einem isolierten Entwicklungsbranch, nicht in der bestehenden Installation ausgerollt. Vor Ausrollen: passenden installierten Versionsstand eindeutig bestimmen, ausschließlich Paper-Profil abnehmen, existierenden privaten Zustand sichern und Migration testen. Allgemeine Wallet-/Transfer-Endpunkte des geerbten Programms gehören nicht in die Paper-only-Auslieferung.
6. Laufender 24/7-Runner, korrekter Monitoring-Pfad, Windows-Neustart und Sleep-Verhalten sind nicht nachgewiesen. Keine Erfolgsmeldung für Dauerbetrieb.

Damit sind technische synthetische Funktion, tatsächliche Dot-Zustellung und wirtschaftliche Prognosequalität ausdrücklich getrennt bewertet.
