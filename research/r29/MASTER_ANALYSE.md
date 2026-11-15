# R29 Master-Anweisung – ChatGPT → GitHub → Windows-Sniperbot
Version: 1.2 · 2026-11-15 · **PAPER ONLY**

## Verbindlicher Ablauf bei JEDER ChatGPT-Analyse

1. **Zuerst diese Datei erneut über die GitHub-Verbindung lesen**, branch `codex/r29-chatgpt-github-paper-cycle-20261115`, Pfad `research/r29/MASTER_ANALYSE.md`.
2. Danach `research/r29/channel/latest-intent.json` (letzter Auftrag) und `research/r29/channel/ci-receipt.json` / `ci-ledger.json` (isolierter CI-Bot) oder – falls später eingerichtet – `windows-status.json` (echter Windows-Bot) lesen.
3. Die Herkunft jedes Status prüfen: **`CI_SANDBOX` ist NICHT der Windows-Laptop**. Fehlende Quittung bedeutet noch keine Order.
4. Erst nach dokumentierter Freigabe einer getrennten Handelsstrategie Marktquellen recherchieren. Für den getrennten Kurier-Test ausschließlich `R29_SYNTHETIC_DISPOSABLE`; für den nachfolgend vom Nutzer ausdrücklich freigegebenen, sichtbaren **Haupt-Paper-Demo-Test** ausschließlich `R29_FIXED_TEST_COIN` verwenden. Kein realer Token.
5. NUR eines von `BUY`, `SELL`, `HOLD`, `WATCH`, `NO_TRADE` empfehlen. Im ersten R29-Transporttest sind über GitHub ausschließlich synthetische `BUY` und `SELL` zulässig.
6. Prüfe, ob `BUY` bereits eine Position eröffnet hat, bevor du `SELL` sendest. `SELL` erfordert dieselbe festgelegte Testtoken-Identität.
7. Nach GitHub-Commit eine nachvollziehbare Empfangs-/Paper-Fill-Quittung abwarten bzw. später nachlesen. **Niemals** aus einem erfolgreichen Commit direkt einen erfolgreichen Kauf ableiten.
8. Jede Empfehlung muss Quellen, Zeitstempel, Begründung, Unsicherheiten und einen reproduzierbaren Order-Datensatz enthalten. Bei Unklarheiten `NO_TRADE` statt Fantasiekauf.

## Sicherheitsregeln

- Der frühere `R27`-Bot, lokale Wallets und Echtgeldguthaben dürfen durch diesen Verbindungstest nicht verändert werden. **Einzige ausdrücklich freigegebene Ausnahme:** Der einmalige, auf 50 TEST-USDC begrenzte `MAIN_PAPER_DEMO`-Kauf und der dazugehörige Verkauf dürfen die normale virtuelle Paper-Positionsliste und deren Verlauf verändern. Keine Guthabenaufstockung, keine Manipulation anderer Positionen.
- GitHub ist **Transport**, nicht automatisch vertrauenswürdiger signierter Order-Publisher. Kein `unsigned` Befehl darf direkt eine reale Order auslösen.
- Zeitablauf, doppelte IDs, falsche Zielgeräte, ungültige Contract-Identität und Guthabenüberschreitungen müssen blockiert werden.
- Erst nach unabhängig bestandener GitHub-zu-**echter Windows-Instanz**-Bestätigung kann über den getrennten Schritt zur Nutzung des echten virtuellen Kontos entschieden werden.
- Selbst wenn zukünftig Echtgeldhaltung angezeigt werden kann: **keine Echtgeldtransaktionen**, keine PayPal- oder Wallet-Ausgaben, keine automatisch aktivierbare Live-Option.
- Keine Passwörter, GitHub-PATs, API-Schlüssel, Seedphrases, Wallet-Adressen oder personenbezogenen Portfoliostände in öffentlichen GitHub-Dateien speichern.
- Die getrennte R29-Sandbox hat synthetische Preise BUY 0,05 / SELL 0,08. Die ausdrücklich freigegebene **normale Paper-Demo** nutzt den festgelegten erfundenen `TEST`-Coin bei 0,025 TEST-USDC ohne Kursgewinn; die modellierten 1 % Gebühren je Richtung ergeben etwa −0,995 TEST-USDC. Keine dieser Zahlen ist eine Marktprognose oder realer Gewinn.
- Keine fünf separaten Dots erstellen. Eine zukünftige stündliche ChatGPT-Aufgabe darf erst nach echtem Windows-Ende-zu-Ende-Nachweis und Prüfung ihrer Schreibrechte aktiviert werden.
- Eine ChatGPT-Plus-Nutzung ersetzt keine kostenpflichtige OpenAI-API: R29 versucht ausdrücklich, **keine API-basierte KI auf dem PC** zu brauchen. Etwaige ChatGPT-Aufgaben- und GitHub-App-Limits bleiben separat zu prüfen.

## Zentrales Zielbild: EINE Entscheidung, getrennte Kontoausführung (Zukunftsarchitektur, NICHT live freigegeben)

Der Nutzer stellt an der Bot-Oberfläche selbst **pro Konto** Guthaben, Modus, Start/Stopp und Einsatzgrenzen ein. ChatGPT ist der zentrale **Forschungs- und Signalentscheider** für die Coinauswahl, Zeitpunkt und BUY / SELL / HOLD / WATCH / NO_TRADE. Der Bot ist der **Ausführungs- und Sicherheitsverantwortliche**: Er darf keine Order außerhalb des vorhandenen Guthabens, der individuellen Limits, notwendiger Marktvalidierung und der lokalen Freigabe durchführen. Ein Signal ist **kein unbedingter Ausführungsbefehl**.

**Ein einziges signiertes, zeitlich begrenztes Forschungssignal** kann später an zwei voneinander unabhängige Kontomodule geroutet werden. Beide erhalten dieselbe Coin-/Contract-Identität, dasselbe Signal und denselben beabsichtigten Zeitpunkt. Das tatsächlich ausführbare Volumen ist jedoch **je Konto unterschiedlich**. Ein deaktiviertes oder ungedecktes Echtgeldkonto blockiert **nicht** den freigegebenen Paper-Handel.

- **Paper**: eigener, vorhandener virtueller Bestand in TEST-USDC, eigene benutzerdefinierte Min-/Max-Einsätze, eigener Kauf-/Verkaufsverlauf. Beispiel: 5.000 TEST-USDC mit gewünschten 5–50 TEST-USDC je Kauf.
- **Echtgeld (später)**: getrennte reale Wallet, Gebühren, Slippage, Gas, Wallet-/Börsenbestände und Währungsumrechnung; Beispiel 500 EUR Guthaben und Grenzen 50–500 EUR. **Derzeit keine echte Ausführung implementieren, simulieren oder freischalten. Nur gesonderte spätere Freigabe nach Sicherheitsprüfung.**
- **Wichtige Ist-Grenze der aktuellen Paper-Engine**: `runner/portfolio-budget.mjs` setzt derzeit `MIN_PAPER_ENTRY_USDC=50`. Das Nutzerbeispiel mit **5 USDC** ist **ein Ziel für eine spätere kompatible Anpassung**, nicht bereits funktionsfähige Unterstützung. Keine stillschweigende Änderung der aktuellen Orderregeln im R29-Verbindungstest.
- Auch bei einem sehr starken Signal wird **niemals das gesamte Guthaben automatisch investiert**, wenn die konfigurierten Maximalbeträge oder Risikokappen dies ausschließen. Beispiel: Paper 5.000 TEST-USDC Bestand und Maximum 50 TEST-USDC → höchstens **50 TEST-USDC** pro Order. Echtgeld 500 EUR Bestand mit Maximum 500 EUR → **nicht automatisch 500 EUR**, sondern nur der durch separate Risikokappen, Liquidität und vorhandene Deckung gedeckte Betrag.
- **Signalstärke ≠ statistische Ausbruchswahrscheinlichkeit.** Aussagen wie „100 % sicher“ sind für Memecoins unbegründet; auch hohe Scores erlauben `NO_TRADE`. Mindestqualität bei Sicherheitsdaten und unabhängigen Quellen sind zwingend.
- Kein automatischer Echtgeldhandel aufgrund einer ChatGPT-Nachricht oder eines GitHub-Commits. Für LIVE wären zusätzlich ein separater autorisierter Signierer, Wallet-Sicherheitsprüfung, Schutz gegen kompromittierte Repo-Schreibrechte, echte Order-/Gas-/Preisprüfungen, Not-Aus und gesonderte manuelle Nutzerfreigabe nötig.

### Einheitliche Analyse-Forschungsregeln

Bei jedem neuen Analysezyklus:

1. Diese Datei **neu lesen**. Bot-Status, Kontomodi, aktuelle Paperpositionen, letzte bestätigte Orderquittungen und letzte Signalspezifikation aus einem **berechtigten, geschützten** Kanal lesen. GitHub ist nicht automatisch privat.
2. Kandidaten **chain- und contractgenau** entdecken, nicht anhand von Symbolen oder einer historischen Gewinnerliste. Jede Beobachtung hat Quelle, `event_at_utc`, `first_verified_available_at_utc` und Quellen-/Datenlückenstatus.
3. DEX-Pool-Entstehung, Liquidität, Volumen, Kauf-/Verkaufsdruck, Wallet-Verteilung, Contract-/Honeypot-/Sellability-Risiko, organische vs. bezahlte Social-/News-Signale, Marktphase und **Kosten** getrennt bewerten. Fehlt unverzichtbare Sicherheitsinformation, `WATCH` oder `NO_TRADE`.
4. Eine begründete, zeitlich begrenzte Forschungsentscheidung erzeugen: `signal_id`, `at_utc`, `expires_at_utc`, `chain`, `contract_address`, `pool_address`, `action`, `score_0_100`, `evidence_ids`, `reason`, `risks`. **Keine** persönlichen Geheimnisse oder beliebigen ausführbaren Skripte in Signalen.
5. Der lokale Bot muss vor Ausführung unabhängig prüfen: richtige Chain/Contract/Pool, kein alter/doppelter Auftrag, aktiver Kontomodus, Marktpreis/Slippage/Poolliquidität, verfügbare Mittel, Gebühren und Limits; wenn ungültig `BLOCKED` mit Grund zurückmelden.
6. Nur tatsächlich empfangene Quittungen als `PAPER_FILLED` zählen. `WATCH`/ `NO_TRADE` sind **keine Gewinne**, ein Testerfolg ist **kein realer DEX-Fill**.
7. Ausführungen und Fehlentscheidungen versioniert auswerten; lernen durch nachvollziehbare Regeln/Tests, nicht durch unbewiesene selbstständige Gewichtsupdates. Frühere Analysen aus `research/` sind Hypothesen, keine zuverlässigen statistischen Gewinnwahrscheinlichkeiten.
8. Stündliche geplante ChatGPT-Ausführungen erst aktivieren, wenn **tatsächlich** eine unbeaufsichtigte GitHub-Lese-/Schreib-/Empfangskette genehmigungsfrei in der verwendeten Produktumgebung nachgewiesen ist. Ein einzelner manueller ChatGPT-Auftrag genügt nicht als Beleg.

### Priorität bis zur erfolgreichen Abnahme

**Keine Echtgeld-Implementierung und keine neuen Memecoin-BUYs.** Zuerst den vom Nutzer beauftragten einen sichtbaren `MAIN_PAPER_DEMO`-BUY über die **tatsächlich auf dem Laptop gestartete Version**, GitHub-Quittung und danach SELL durchführen. Nur die separate Windows-Datei
`research/r29/channel/main-paper-status.json` mit `main_paper_demo_opt_in:true` beweist die Aktivierung dieses Pfads. `research/r29/channel/windows-status.json` beweist nur den älteren **separaten** Sandbox-Kurier.

## Einheitliches Auftragsformat für den ersten GitHub-CI-Paper-Sandbox-Test

Speichere `research/r29/channel/latest-intent.json` im R29-Branch:

```json
{
  "schema": "sniper_r29_isolated_paper_intent.v1",
  "intent_id": "r29_0123456789abcdef0123456789abcdef",
  "target": "CI_SANDBOX",
  "mode": "ISOLATED_PAPER_TEST",
  "asset": "R29_SYNTHETIC_DISPOSABLE",
  "action": "BUY",
  "amount_test_usdc": "50.00",
  "created_at_utc": "2026-11-15T10:00:00Z",
  "expires_at_utc": "2026-11-15T10:20:00Z",
  "reason": "Isolierter ChatGPT-GitHub-Bot Kommunikationsnachweis"
}
```

Die Zeitangaben im Beispiel müssen bei echter Verwendung jeweils mit dem aktuellen Zeitpunkt ersetzt werden. `SELL` benötigt `amount_test_usdc:null`, eine **neue** ID und dieselbe feste Testasset-Identität. Alle 10 Felder sind Pflicht; zusätzliche Felder werden verworfen. Gültigkeitsdauer maximal 1 Stunde. Kaufen setzt ausschließlich **50,00 virtuelle USDC** in diesem Test ein. Das separate CI-Sandbox-Konto beginnt mit 5.000 virtuellen USDC. Es wird nicht aus einem Benutzerkonto gefüllt.

## Zusätzlicher, ausdrücklich freigegebener sichtbarer Haupt-Paper-Demo-Test

Der Nutzer hat ausdrücklich darum gebeten, einen Kauf und Verkauf **in der normalen Paper-Positionsliste** zu sehen. Die bestehende `WINDOWS_SANDBOX` ändert dieses Konto nicht. Deshalb gilt für **genau einen** weiteren Durchlauf:

1. Zuerst **lokalen Opt-in-Status** prüfen: Der Nutzer muss die neuere R29-Version mit `Sniperbot_R29_Papiertrade_Starten.bat` gestartet haben. Dieser Starter allein setzt den Schalter `-AllowR29MainPaperDemo`; die Standard-BAT erlaubt den Haupt-Paper-Trade nicht.
2. Auf GitHub muss `research/r29/channel/main-paper-status.json` mit `main_paper_demo_opt_in:true` und einem aktuellen Zeitstempel stehen. Vorher **keinen** Haupt-Paper-Auftrag ausstellen.
3. Erst dann `research/r29/channel/main-paper-intent.json` im selben Branch mit striktem Format schreiben:
```json
{
  "schema": "sniper_r29_main_paper_demo_intent.v1",
  "target": "MAIN_PAPER_DEMO",
  "mode": "PAPER_ONLY",
  "asset": "R29_FIXED_TEST_COIN",
  "intent_id": "r29main_0123456789abcdef0123456789abcdef",
  "action": "BUY",
  "amount_test_usdc": "50.00",
  "created_at_utc": "2026-11-15T10:00:00Z",
  "expires_at_utc": "2026-11-15T10:20:00Z",
  "reason": "Freigegebener einmaliger Demo-Kauf, nur im normalen virtuellen Paper-Konto"
}
```
Beispielzeiten müssen immer durch **aktuelle** UTC-Zeiten ersetzt werden. BUY darf **nur 50 TEST-USDC** einsetzen und ausschließlich das bereits eingebaute `TEST`-Demoasset kaufen.
4. Die **echte Windows-Quittung** nachlesen: `target:MAIN_PAPER_DEMO`, gleiche ID, `last_action:BUY`, `last_result:PAPER_FILLED`. GitHub-CI-Quittungen sind kein Beweis.
5. Für SELL exakt denselben festen Demo-Coin, `action:SELL`, `amount_test_usdc:null` und eine **neue** `r29main_`-ID senden. Nach `PAPER_FILLED` muss `completed:true` sein.
6. Jeder neue zusätzliche BUY nach diesem Durchlauf ist lokal dauerhaft blockiert. Kein Reset des virtuellen Hauptkontos, keine neuen Guthaben, keine Echtgeld-/Wallet-Transaktionen und keine bestehenden Fremdpositionen verkaufen.
7. Die Haupt-Paper-Order ist ein **fest definierter lokaler UI-Demotest**, kein signierter Produktions-Publisher und kein Beweis für einen externen DEX-Fill. Der normale Bot zeigt `TEST-KAUF` / `TEST-VERKAUF` im Verlauf.

## Nachweis-Kriterien

- **G1** ChatGPT liest diese Anleitung.
- **G2** ChatGPT schreibt eine neue gültige BUY-/SELL-Intent-Datei in GitHub.
- **G3** GitHub Actions nimmt den Push entgegen und startet einen isolierten Bot mit einem lokalen, kurzlebigen Ed25519-Testschlüssel.
- **G4** Die bestehende signierte Paper-Pipeline verarbeitet den Auftrag im **CI-Sandbox-Konto**.
- **G5** GitHub speichert die signierte Test-Verarbeitung als Quittung und den neuen Kontostand; anschließend liest ChatGPT die Dateien zurück.
- **G6** Nach BUY und SELL sind die Test-Positionen geschlossen und der Netto-P&L nachvollziehbar.
- **G7** Ein gesonderter lokaler Windows-Adapter führt denselben Vorgang auf dem **echten Laptop**, ebenfalls zunächst in einem isolierten Konto, aus und sendet eine Statusquittung über GitHub zurück. G7 kann nicht in GitHub Actions simuliert werden.
- **G8** Erst danach einen stündlichen ChatGPT-Workflow einrichten, falls Schreibzugriffe in geplanten Aufgaben tatsächlich unterstützt werden.

**Erfolg bedeutet NICHT**: profitables Meme-Coin-Sniping, selbstständige Windows-Verbindung, signierte Echtgeldbefehle oder erfolgreich freigeschaltete ChatGPT-Automation.
