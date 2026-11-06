# Meme Sniper AI – Lokal, minimalistisch, Windows

**Version 0.3 + Codex-Handoff (06.11.2026) – ausschließlich TEST-/PAPER-TRADING; keine echten Einzahlungen, Auszahlungen, Kryptowährungskäufe oder Wallet-Zugriffe.**

## In drei Schritten starten

1. **Node.js 22 LTS oder neuer** installieren: https://nodejs.org
2. ZIP in einen eigenen Ordner entpacken.
3. `Windows_Starten.bat` doppelklicken. Dashboard: **http://127.0.0.1:3030**. Das schwarze Terminal-Fenster geöffnet lassen.

Keine `npm install` für die Startversion nötig. Zum Testen: `Windows_Tests.bat` bzw. `node runner/test.mjs` und `node --test runner/integration.test.mjs`. Der HTTP-Integrationstest arbeitet **offline** mit einem separaten temporären Datenordner und verändert dein Portfolio nicht.

## Erstes Szenario: 50 € Testguthaben → Sniper-Testkauf

1. Dashboard öffnen, **Testguthaben +50 €** klicken. Es wird nur eine virtuelle Zahl gespeichert – es fließt kein Geld.
2. Auf **Bot AN** schalten. Standardgröße ist **50–50 Test-USDC**, also genau eine Position von 50 Test-USDC.
3. Auf **Testsignal erstellen** klicken. Der angezeigte `TEST`-Coin ist vollständig erfunden, damit der Ablauf ohne Marktfeed überprüfbar ist.
4. **Testkauf 50** klicken (oder vorher den optionalen Paper-Autokauf einschalten, dann kauft ein Demo-Signal ebenfalls automatisch). Beim Kauf wandelt der Server die 50 virtuellen EUR automatisch 1:1 in Test-USDC. Das ist ein absichtlich fiktiver Umrechnungskurs und kein tatsächlicher EUR/USD/USDC-Wechselkurs. Modellierte Kaufkosten 1 %.
5. Position erscheint unter **Gekaufte Coins**. Standardmäßig **HOLD**, sie bleibt also liegen bis du sie verkaufst.
6. Optional **Automatische Ausstiege** aktivieren (+15 % / −10 %). Auch wenn Bot AUS ist, bleibt der Exitprozess für bestehende Positionen aktiv, solange der Laptop-Runner läuft.
7. Über **Verkaufen** wird ein Testverkauf gebucht. Nur frei verfügbares virtuelles EUR-Guthaben kann abgehoben werden; vorher Test-USDC zurück in Demo-EUR tauschen (bei vorhandenem freien Test-USDC).

## Vier Chain-Scanner (nur lesend)

Das Dashboard ruft über den lokalen Node-Server öffentliche **GeckoTerminal**-Endpunkte für neue Pools auf Solana, Base, BNB Chain und Ethereum ab. Der Server benutzt außerdem **DEX Screener** für Token-Details und die Schätzung des aktuellen Positionswerts. Es können **nur beobachtete handelbare DEX-Tokens** angezeigt werden; das ist noch kein Zugang zu *jeder* Kryptowährung oder zu zentralisierten Börsen. Manuelle Contract-Suche über Chain + Token-Adresse ist möglich.

Scoring erfolgt nur anhand einfacher Marktkennzahlen. **Es ist keine KI-Prognose, kein Vertragssicherheitsnachweis und keine Garantie für eine tatsächlich verkäufliche Position.** Gelegentlich fehlen Daten und die Quellen können ausfallen. Der App-Status zeigt das an. Die simulierten Testkäufe basieren auf beobachteten Preismeldungen; reale Orderausführung und echte Wallet-Swaps sind nicht enthalten.

## Einstellungen

- Bot AN/AUS: **AUS verhindert neue Paperkäufe**, aber bestehende Positionen werden weiter markiert und beim AUTO-Exit automatisch geschlossen.
- Paper-Autokauf optional: nur falls Scanner einen Kandidaten nach einer konservativen, nicht auditierenden Punktelogik markiert und ausreichend Testguthaben vorhanden ist. Die Funktion ist standardmäßig AUS.
- Positionsgröße flexibel: `50–50`, `200–400` oder frei eingeben; max. 1 Position gleichzeitig in der aktuellen Testversion (**mehrere** parallele Positionen sind für Codex als Anforderung spezifiziert).
- Exit: Standard **HOLD** (Position bleibt liegen), alternativ **AUTO** mit Stop-Loss/Take-Profit.
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

**GitHub-Verwendung auf Windows:** `git clone https://github.com/127027/Sniperbot-.git` und `cd Sniperbot-`, dann `Windows_Tests.bat` sowie `Windows_Starten.bat`. Node.js 22+ benötigt. Die lokale API erscheint nur unter http://127.0.0.1:3030. Für das Ziel eines nicht-technischen Nutzers sollte Codex einen sicheren Windows-Installer bzw. Starter entwickeln. 