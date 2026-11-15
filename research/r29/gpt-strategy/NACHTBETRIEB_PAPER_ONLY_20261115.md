# Sniperbot R29 – GPT-Nachtbetrieb und vollständiger Paper-Handelskreislauf

**Stand 15. November 2026 · Status: GitHub-Implementierung und Offline-Tests; lokale reale Markt-Paper-Ausführung auf dem privaten Windows-Laptop noch NICHT abgenommen.**

## Vorrang

Dieser Nachweis hat Vorrang vor einem neuen historischen 30-Tage-Lerntest. Der Vergleich wird erst ausgewertet, wenn GPT-Bot-Kommunikation und mindestens ein tatsächlich empfangener GPT-Entscheid belegbar sind. Die bestehende lokale 30+30-Tage-Beobachtung darf weiter Daten erfassen; sie ist nicht identisch mit dem neuen historischen Test.

## Dauerbetrieb ohne kostenpflichtige OpenAI-API

1. Die bestehende **eine ChatGPT-Automation** `6af9cdf5ba548191a1c2304988e4d3ab` prüft stündlich, auch nachts, ob es wirklich neue relevante Marktereignisse, Research-Hashes, offene Positionen, Sicherheitsnachweise oder ausbleibende Quittungen gibt.
2. Sie kann **1, 4, 12 oder 24 tatsächliche, dokumentierte GPT-Analysen pro UTC-Tag** auslösen, **höchstens eine pro Stunde**. Ein Cron-/Automation-Check ohne neue Evidenz ist **keine** vollständige Research-Analyse. Weder der lokale 120-Sekunden-Snapshot noch GitHub-Statusabfragen sind eigenständige GPT-Modellaufrufe.
3. Für BUY/SELL schreibt GPT **eine datierte und hashgebundene archivierte Entscheidung**, nicht direkt eine Wallet- oder Trading-API. Das GitHub-Pointer-Format steht unter `runner/gpt-paper-protocol.mjs`.
4. Der bestehende R29-Kurier liest alle 45 Sekunden den neuesten autorisierten GitHub-Pointer, überprüft die **Owner-Zuordnung beider Commits** und den Archiv-SHA-256. Ein GitHub-Owner-Commit belegt **keine kryptografische Modellidentität**; die zusätzliche lokale Einmal-Session-Berechtigung gilt nur für Paper.
5. Nur bei explizit aktiviertem `gptPaperFollow`, laufendem Paper-Bot, noch gültiger BUY-/SELL-TTL (max. 3 Minuten) und allen harten Quote-, Contract-, Sellability-, Risiko- und Identitätsprüfungen darf der lokale Ed25519-Adapter einen **virtuellen** Trade in **dem bestehenden Konto** durchführen.
6. SELL/HOLD-Offenpositionen dürfen über `research/r29/channel/gpt-paper-context.json` (Token/Pool, kein Kontostand) analysiert werden. Die lokale Risiko-Notbremse kann aus Sicherheitsgründen unabhängig von GPT eine virtuelle Position schließen; sie wählt keine neuen Käufe.
7. Der lokale Bot veröffentlicht nach Eingang `research/r29/channel/gpt-paper-receipt.json`. **Nur `PAPER_FILLED` beweist eine virtuelle Ausführung.** `NO_TRADE`, `WATCH`, `BLOCKED`, `WAITING_FOR_UPDATED_LOCAL_BOT` sind keine Trades. Quittungen allein beweisen keine realisierbaren Echtgeld-Gewinne.

## Zusätzliche unabhängige EVM-Sicherheitsforschung (neu)

- `runner/gpt-paper-security-research.mjs` untersucht **maximal zwei** *frische, nicht beworbene und cross-provider-bestätigte* EVM-Pools innerhalb einer Stunde. Es nutzt öffentlich zugängliche **GoPlus** Token Security und **Honeypot.is** Sell-Simulation; weder Paid API noch Zugriff auf private Kontostände.
- Das lokale GoPlus/Honeypot-Ergebnis wird nur in einer streng eingeschränkten öffentlichen Forschungszusammenfassung nach `research/r29/channel/gpt-paper-security.json` übertragen.
- Fehlende Felder, fehlgeschlagene Simulationen, unbekannte Verkaufsfähigkeit oder unbekannte Pool-Identität bleiben **DATA_GAP / WATCH**. Selbst ein bestandener Sicherheitscheck bedeutet **nicht**, dass Coin-Adoption, Wallet-Diversität, Pool-Abzugssicherheit oder reale Handelskosten geprüft wären.
- Eine GPT-Entscheidung benötigt weiterhin unabhängig verifizierte **organische Käufer, Manipulationsrisiken, aktuelle Quotes und Risiken**. Eine Sicherheitsdatei allein ist **KEINE Freigabe** für BUY.
- Für Solana ist der vollständige lokale Automatik-Contract-/Sellability-Schutz noch nicht implementiert; **Solana BUY gesperrt**. Keine Umgehung zur Erzeugung künstlicher Fills.

Quellen für Provider-Antwortformate:
- https://docs.gopluslabs.io/reference/response-details
- https://docs.honeypot.is/ishoneypot

## Laptop-Installation und Abnahme

**Diese GitHub-Änderungen aktualisieren den lokalen Windows-Ordner NICHT automatisch.** Ohne Benutzerstart / Update kann weder diese ChatGPT-Automation noch der GitHub-Kurier eine lokale Ausführung garantieren.

1. R29 über `Q` beenden und den bestehenden Botordner inklusive `.local`, sowie `%LOCALAPPDATA%\MemeSniperPaper` (Paper-Konto, DPAPI-Token, Signaturen) separat sichern.
2. Aus Branch `codex/r29-chatgpt-github-paper-cycle-20261115` aktuelle **Programmdateien** in **denselben** Botordner übernehmen. Kontodaten und andere private Dateien nicht überschreiben, nicht zurücksetzen.
3. Genau eine Startdatei: `Sniperbot_Starten.bat`. Rechner eingeschaltet lassen, Internetzugang und vorhandenen DPAPI-GitHub-Kurier prüfen. Kein neuer kostenpflichtiger OpenAI-Key.
4. Unter `http://127.0.0.1:3030`: **Bot starten** und **GPT-Paper-Freigabe aktivieren**. Die alte lokale autonome Kaufregel soll deaktiviert bleiben.
5. Unter `http://127.0.0.1:3030/api/gpt/paper/status` kontrollieren: `local_gpt_bridge_ready:true`, `paper_bot_enabled:true`, `gpt_follow_enabled:true`. Keine Änderungen an Echtgeld-Wallets.
6. Auf GitHub `gpt-paper-context.json` und `gpt-paper-receipt.json` prüfen: `WAITING_FOR_UPDATED_LOCAL_BOT` muss durch eine tatsächliche neuere Rückmeldung ersetzt werden. Ein alter, abgelaufener Intent darf niemals als Order nachgeholt werden. Neues GPT-Intent nur mit neuem datierten Evidence-Hash.
7. Vor einem echten Kandidatenkauf zunächst eine aktualisierte **NO_TRADE**-Entscheidung sicher annehmen und die Quittung bestätigen; keine virtuelle Kontobewegung. **Dann** einen begründeten, vollständig unabhängigen und sicheren frischen Kandidaten finden und virtuell BUY/SELL ausführen. Keine Test-Fills als echte Discovery ausgeben.

## Nicht zulässige Behauptungen

- GitHub-CI mit Mock-Fixtures ist kein Beweis für einen erfolgreichen Handel auf dem Windows-Laptop.
- Die stündliche GPT-Automation garantiert nicht, dass bei jeder Ausführung verwertbare Coin-Daten vorliegen oder ein neuer BUY entsteht.
- Kein Echtgeldhandel, selbst wenn eine echte Wallet aktuell leer ist. Mit späteren Einzahlungen wäre die Risikolage anders. **Echte Live-Transaktionen bleiben technisch gesperrt.**
- Kein Fake-Gewinn, kein zweites Paper-Guthaben, kein rückwirkender „30-Tage-KI-Gewinner“ ohne zeitkorrekte Quellen.
