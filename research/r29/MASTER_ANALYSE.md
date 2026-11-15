# R29 Master-Anweisung – ChatGPT → GitHub → Windows-Sniperbot
Version: 1.0 · 2026-11-15 · **PAPER ONLY**

## Verbindlicher Ablauf bei JEDER ChatGPT-Analyse

1. **Zuerst diese Datei erneut über die GitHub-Verbindung lesen**, branch `codex/r29-chatgpt-github-paper-cycle-20261115`, Pfad `research/r29/MASTER_ANALYSE.md`.
2. Danach `research/r29/channel/latest-intent.json` (letzter Auftrag) und `research/r29/channel/ci-receipt.json` / `ci-ledger.json` (isolierter CI-Bot) oder – falls später eingerichtet – `windows-status.json` (echter Windows-Bot) lesen.
3. Die Herkunft jedes Status prüfen: **`CI_SANDBOX` ist NICHT der Windows-Laptop**. Fehlende Quittung bedeutet noch keine Order.
4. Erst nach dokumentierter Freigabe einer getrennten Handelsstrategie Marktquellen recherchieren; bis dahin ausschließlich das fixierte synthetische Testasset `R29_SYNTHETIC_DISPOSABLE` verwenden.
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
- Alle derzeit in R29 verwendeten Preisdaten sind **synthetische Test-Festwerte** (BUY bei 0,05, SELL bei 0,08 TEST-USDC). Gewinne sind **KEINE Prognose, kein Backtest und kein realer Marktgewinn**.
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
