# R29 V5.4 – Konkreter asynchroner GPT-Paper-Orderfehler und Abnahmegrenzen

**Datum:** 19.11.2026 · **Ziel:** bestehende GPT→GitHub→Windows-Paper-BUY/SELL-Strecke absichern, ohne einen anderen Bot oder eine künstliche Order zu erzeugen.

## 1. Tatsächlich nachgewiesener Codefehler

Die bestehende Funktion `createGptPaperLocalReceiver` in `runner/gpt-paper-local-receiver.mjs` prüfte beim Start einer GPT-Entscheidung die Ablaufzeit sowie die lokale Freigabe `gptPaperFollow` / `entriesEnabled`. Danach wurden **asynchrone externe** Marktkurs- und Contract-Sicherheitsabfragen durchgeführt. **Unmittelbar vor dem Signieren und Weiterreichen an `submit` wurden die GPT-Gültigkeitsdauer und die mittlerweile ggf. widerrufene lokale Freigabe nicht erneut geprüft.**

Somit konnte im Code ein zunächst noch gültiger GPT-Auftrag während externer Anbieterabfragen ablaufen; nach Rückkehr der Abfrage konnte der lokale Empfänger eine frische 90-Sekunden-Signatur über einen inzwischen **abgelaufenen GPT-Entschluss** erzeugen. Ebenso konnte der Betreiber GPT-Follow während der Abfrage deaktivieren, ohne dass dies vor dem abschließenden lokalen Auftrag erneut berücksichtigt wurde. Beide Vorgänge sind realistische Race-Conditions; es gibt **keinen Nachweis, dass ein solcher Auftrag jemals auf dem persönlichen Konto tatsächlich ausgeführt wurde**.

### Minimaler Fix

Nach den asynchronen Provider- und bereits existierenden Risiko-Prüfungen, aber **direkt vor der Signatur**, werden erneut geprüft:

1. `d.expires_at_utc > now()` – sonst `REJECTED/GPT_DECISION_EXPIRED_BEFORE_PAPER_SUBMISSION`.
2. `getState().gptPaperFollow === true` und für BUY zusätzlich `entriesEnabled === true` – sonst `BLOCKED/GPT_FOLLOW_OR_PAPER_BOT_DISABLED`.

Das verändert keinerlei Coin-Auswahl, Score, Transaktionskosten, Quote-Frische, GoPlus-/Honeypot-/LP-/Sellability-Gates oder Budgetgrenzen und umgeht keine Sicherheitsprüfung. Es **verhindert** unberechtigte späte virtuelle Käufe, erzeugt aber **nicht automatisch** neue zulässige BUYs.

## 2. Reproduktion und Tests

Zwei neue isolierte Tests wurden an den bestehenden `runner/gpt-paper-bridge.test.mjs` angehängt:

- Eine zunächst gültige GPT-BUY-Entscheidung mit fiktiv vorverstellter Uhr läuft erst **während** der externen Kursabfrage ab; der Rückgabekurs ist frisch und der Contract ist im Mock sicher. Erwartet `REJECTED`, **0 signierte Weiterleitungen, 0 Positionen, 5.000 TEST-USDC unverändert**.
- Während einer gültigen BUY-Abfrage wird `gptPaperFollow=false` gesetzt. Erwartet `BLOCKED`, **0 Weiterleitungen und 0 Positionen**.

Alle Mocks laufen in eigenem temporärem Datenordner. Kein persönlicher `%LOCALAPPDATA%\MemeSniperPaper`-Zustand, keine echte GitHub-Live-Order und keine Wallet wird für diese Tests verändert.

## 3. Offene, nicht durch diesen Fix lösbare Kaufblocker

**Öffentlicher GitHub-Stand 19.11.2026 ~18:45 UTC:** 61 beobachtete Pools → 37 EVM → 3 geeignet für Sicherheitsforschung → 2 unabhängigen Anbietern vorgelegt → **0 vollständig zum BUY freigegeben**. In `research/r29/channel/gpt-paper-security.json` fehlen u. a. GoPlus-Feldwerte und die unabhängige exakte Pool-Bestätigung. Diese Werte dürfen nicht als `false`, `0` oder erfolgreich validiert erfunden werden. Sicherheitsablehnung ist berechtigt, bis zuverlässige positive Belege tatsächlich eintreffen.

**Frische:** GPT-Order-Entscheidung maximal 180 Sekunden, lokaler Candidate maximal 5 Minuten, Quote bei BUY maximal 60 Sekunden. Diese Kombination kann bei verzögerter stündlicher GPT-Analyse Kandidaten ausschließen; die derzeit öffentlich sichtbaren NO_TRADE-Receipts beweisen **noch keine konkrete TTL-bedingte BUY-Ablehnung**.

**Chain-Abdeckung:** Solana bleibt im lokalen GPT-Paper-BUY-Receiver ausdrücklich gesperrt, da eigene verifizierte Mint/Pool-/Sellability-/Ausführbarkeitsnachweise fehlen. Die Freigabe wäre ein eigenes Security-/Ausführungsvorhaben und ist **nicht** durch diesen Bugfix erfolgt.

**Authentische GPT-Orders:** Die aktuelle öffentliche GitHub-Receipt `gpt-paper-receipt.json` berichtet weiter `NO_TRADE` vom 18.11.2026. Der bisherige personale Windows-GPT-Paper-BUY→monitorierter SELL→Netto-PnL ist **nicht** belegt. Öffentliche Quellen sind keine Einsicht in das private Windows-Paper-Ledger, und Modellzuordnung zu einem GitHub-Commit ist nicht kryptografisch bewiesen.

**Historisch Januar:** PR #71 enthält 40 geplante aber **0 tatsächlich ausgeführte** Januar-Modellbewertungen und die strikt getrennte posthoc-Pump.fun-Tagesauswertung. Keine zeitgerechte komplette Multichain-Kohorte mit historischen ausführbaren Zweiwegquotes, kein zehn-Tage-GPT-Blindtest-PnL.

**Private Budgets:** Bestehende 1%-Einzel- und 3%-Gesamtexpositions-Gates bleiben wirksam. Das Paper-Konto ist dynamisch konfigurierbar; die private Cloud-Übermittlung von separaten Paper/Real-Werten wurde nicht durch den Fix geschaffen. Echtgeld bleibt `LIVE_LOCKED`.

## 4. Was als nächstes wirklich nötig ist

**Keine weiteren isolierten Scanner oder Forschungstasks.** Der nächste zuverlässige Schritt ist ein tatsächlich frisches, nach GoPlus/Honeypot/Pool/Quote vollständig zulässiges **unbekanntes EVM-Kandidatensignal**, eine authentische GPT-BUY-Entscheidung und der gesonderte lokale persönliche Windows-`PAPER_FILLED`-Receipt samt signiertem GPT-Policy-Exit. Bis dahin darf keine künstliche Kontobuchung die Lücke kaschieren. Falls ein einzelner konkreter gültiger Kandidat an einem Codefehler scheitert, den exakten lokalen Reason protokollieren und nur diesen Fehler korrigieren.

**Status:** Ein konkreter Revalidierungsfehler ist durch Code und Regressionstest adressiert. **V5.4-Gesamtabnahme weiterhin OFFEN**; weder vollständige Januar-Blindtest-Ausführung noch autonome persönliche GPT-Paper-BUY/SELL-Quittung kann durch diesen Patch belegt werden.
