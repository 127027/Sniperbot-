# R29 Master-Anweisung – ChatGPT → GitHub → Windows-Sniperbot
Version: 1.1 · 2026-11-15 · **PAPER ONLY**

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

- Der frühere `R27`-Bot, lokale Wallets, Echtgeldguthaben und bestehende Paper-Konten dürfen durch diesen Verbindungstest nicht verändert werden.
- GitHub ist **Transport**, nicht automatisch vertrauenswürdiger signierter Order-Publisher. Kein `unsigned` Befehl darf direkt eine reale Order auslösen.
- Zeitablauf, doppelte IDs, falsche Zielgeräte, ungültige Contract-Identität und Guthabenüberschreitungen müssen blockiert werden.
- Erst nach unabhängig bestandener GitHub-zu-**echter Windows-Instanz**-Bestätigung kann über den getrennten Schritt zur Nutzung des echten virtuellen Kontos entschieden werden.
- Selbst wenn zukünftig Echtgeldhaltung angezeigt werden kann: **keine Echtgeldtransaktionen**, keine PayPal- oder Wallet-Ausgaben, keine automatisch aktivierbare Live-Option.
- Keine Passwörter, GitHub-PATs, API-Schlüssel, Seedphrases, Wallet-Adressen oder personenbezogenen Portfoliostände in öffentlichen GitHub-Dateien speichern.
- Die getrennte R29-Sandbox hat synthetische Preise BUY 0,05 / SELL 0,08. Die ausdrücklich freigegebene **normale Paper-Demo** nutzt den festgelegten erfundenen `TEST`-Coin bei 0,025 TEST-USDC ohne Kursgewinn; die modellierten 1 % Gebühren je Richtung ergeben etwa −0,995 TEST-USDC. Keine dieser Zahlen ist eine Marktprognose oder realer Gewinn.
- Keine fünf separaten Dots erstellen. Eine zukünftige stündliche ChatGPT-Aufgabe darf erst nach echtem Windows-Ende-zu-Ende-Nachweis und Prüfung ihrer Schreibrechte aktiviert werden.
- Eine ChatGPT-Plus-Nutzung ersetzt keine kostenpflichtige OpenAI-API: R29 versucht ausdrücklich, **keine API-basierte KI auf dem PC** zu brauchen. Etwaige ChatGPT-Aufgaben- und GitHub-App-Limits bleiben separat zu prüfen.

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
