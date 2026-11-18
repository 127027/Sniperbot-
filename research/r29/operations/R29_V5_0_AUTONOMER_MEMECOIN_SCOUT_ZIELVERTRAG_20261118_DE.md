# R29 V5.0 – Verbindlicher Produktzielvertrag: unbekannte Memecoins entdecken und GPT-Paper-Handelszyklen nachweisen

**Stand 18.11.2026. Freigabe:** Nutzer hat den optimierten V5.0-Zielauftrag im anderen Chat ausdrücklich mit GO freigegeben. **WICHTIG: GO für die Entwicklung ist KEIN Beleg ihrer Fertigstellung.** Die hier vorgenommene Dokumentation ersetzt keinen technischen Merge, kein Windows-Update und keine tatsächlich autonome GPT-Order.

**Kanonischer Code-Branch:** `codex/r29-chatgpt-github-paper-cycle-20261115`.
**Aktueller belastbarer Implementierungsstand bei Formulierung:** V4.9, [PR #65](https://github.com/127027/Sniperbot-/pull/65), [Checkpoint](R29_LATEST_CHECKPOINT.json); Dokumentationskonsolidierung [PR #66](https://github.com/127027/Sniperbot-/pull/66). Eine spätere echte V5.0-Implementierung muss separat mit Code/CI/Windows/ChatGPT-Läufen belegt werden.

## 1. Das tatsächliche Nutzerziel

Der bestehende Windows-Sniperbot soll **unbekannte neue Memecoins möglichst VOR extremen Kursbewegungen finden**, statt nur Charts bereits erfolgreicher Coins nachträglich anzusehen. GPT ist alleiniger STRATEGISCHER Entscheider und wählt den Coin, WATCH / BUY / HOLD / SELL / NO_TRADE, die konkrete Einsatzhöhe sowie individuelle Exit-Regeln.

Der vorhandene Markt-Collector sammelt und archiviert fortlaufend zeitgerechte Belege (neue Token/Pools, Liquidität, Kauf-/Verkaufsfluss, neue/organische Wallets, Preis- und Volumendynamik, News, Social-Media-Ereignisse und Security-/Sellability-Signale). Er darf Kandidaten technisch priorisieren und an GPT übermitteln, **aber keinen lokalen spekulativen BUY-Entscheider ersetzen**. GitHub ist lediglich der versionierte Forschungs-/Entscheidungstransport. Der vorhandene Windows-Bot validiert und verbucht signierte GPT-Paper-Aufträge im bestehenden privaten Ledger. Es darf kein zweites Bot-/Kurrier-/Modell-Strategiesystem entstehen.

Das Ziel sind **tatsächlich durchgeführte virtuelle Handelszyklen**:
`unbekanntes neues Ereignis → nachweislich zeitgerechter Collector-Fund → echte autonome GPT-Review → signierter strategischer BUY → unabhängige technische Sicherheits- und Quoteprüfung → echter Eintrag im bestehenden privaten Paper-Ledger → GPT-autorisierte positionsgebundene Überwachung → SELL → Netto-PnL und Gründe im bestehenden Dashboard`.

Eine WATCH-/NO_TRADE-Entscheidung ist legitime Strategie, aber **kein belegter BUY/SELL-Erfolg**. Isolierte CI-Testkäufe und Heuristik-Trades dürfen nicht als autonome GPT-Trades ausgegeben werden.

## 2. Betriebsrhythmus und Latenz

- **Collector/Windows:** 24/7-Forschungs-, Quellen- und Marktüberwachung nur soweit der Benutzer-PC/Server/Kurier läuft, nicht schläft und Datenquellen/Netz erreichbar sind.
- **Strategie-GPT:** Ziel **4 bis 24 vollständige echte Modellbewertungen pro Tag** über die **bereits vorhandene prospektive ChatGPT-R29-Forward-Automation**. Die bestehende stündliche Weckplanung ermöglicht höchstens 24 vorgesehene Weckzeiten/Tag; ein Wecklauf ist **nicht automatisch ein vollständiger GPT-Review**. Ein verlässliches Minimum von vier tatsächlichen Reviews ist **noch nicht nachgewiesen**. Ohne eigenständige Änderungsfreigabe keine neue Automation/kein zusätzlicher OpenAI-API-Key und keine Behauptung von Sekundenreaktion.
- **Priorität:** marktrelevante neue Events, frische neutrale Merkmale, Quellenbeleg und vorher unbekannte Contract-Identitäten; im Modellbudget keine blind gepushten Gewinnernamen.
- **Exit-Monitor:** die vorhandene 30-Sekunden-Überwachung vollzieht **vom GPT zuvor autorisierte individuelle Exit-Regeln**, ohne auf die nächste GPT-Weckzeit zu warten, sofern der lokale Prozess läuft und ein sicherer Preis-/Sellability-Beleg vorliegt. Sie ist KEINE zusätzliche frei entscheidende Handelsstrategie.
- **Latenzmetriken:** exakte UTC-Zeitstempel für ersten beobachteten Pool, Source-Ereignis, lokales Capture, GitHub-Publish, GPT-Input-As-of, tatsächlich ausgeführten GPT-Turn, GitHub-Decision-Commit, lokalen Courier-Empfang, unabhängiges Paper-Gate, BUY-Fill, Exit-Trigger und SELL-Receipt. GET-Heartbeat oder Decision→Courier-Zeit allein ist **nicht** Event→BUY-Latenz.

## 3. Markt- und Sicherheitsdaten

Für jede relevante Chain eine eindeutige Contract-/Pool-/Netzwerkidentität statt nur Tickersymbol verwenden. Marktweite Vollständigkeit wird nicht behauptet: Quellenausfälle, Anbieterabdeckung, Rate-Limits, neue Chain-DEXs, Verlust bei Vorfiltern und ungenügende historische Kauf-/Verkaufs-Trades transparent ausweisen.

Markt-, Social-, News-, Wallet- und Contract-/LP-/Holder-/Sellability-Aussagen nur mit **zeitgerecht verfügbaren Quellen und überprüfbarer Qualität** verwenden. Nullbeobachtung ist nicht automatisch ein gemessener Nullwert. Unbestätigte, veraltete oder nur indikative Kursdaten dürfen nicht als sichere ausführbare Zweiwegpreise bezeichnet werden.

Unabhängige Contract-/Token-Pool-Zuordnung, einschlägige Security- und Liquiditätsnachweise und realistisch modellierte BUY-/SELL-Quotes inkl. Gebühren/Slippage bleiben Kaufgates. Auch eine sehr hohe GPT-Überzeugung ist **keine 100-%-Gewinnwahrscheinlichkeit oder Garantie eines Ausbruchs**.

## 4. Dynamischer Bot-Ist-Zustand und zwei Konten

**ZIEL:** Eine GPT-Strategieentscheidung kann in zwei strikt getrennten Konten mit jeweils aktuellem Zustand verarbeitet werden: Paper und später separat freigegebenes Echtgeld. Der Bot bleibt Quelle für gespeicherte bevorzugte Einsatzhöhe, Gesamtlimit gleichzeitig gebundener Einsätze, Cash, Reservierungen, bereits offene Positionen, Freigaben, Zustandsrevision und Quellenfrische. GPT bestimmt flexible Positionsgrößen, die der lokale Bot unmittelbar vor jeder tatsächlichen Order erneut gegen das dann gültige Konto prüft. Keine fixen Zahlen aus Beispielen.

**IST V4.9:** Paper-Präferenz/gesamtes Exposure-Limit sind dynamisch gespeichert. `GET /api/gpt/private/bot-state` stellt zwei getrennte private READ-ONLY-Snapshots mit Revisionen **nur auf authentifiziertem localhost** bereit. Ein sicherer automatischer, privater Windows→Cloud-ChatGPT-Zustellweg und von der tatsächlichen Cloud-Entscheidung belegte Account-Revisionen sind **NICHT implementiert oder verifiziert**. Niemals private Geldbeträge, Walletdaten, Zugangsdaten oder identifizierende Revisionen in öffentliche GitHub-Dateien hochladen. Bei fehlendem privaten Transport UNKNOWN/fail-closed statt erfundener Synchronisierung.

**IST Echtgeld:** LIVE_LOCKED, die eigenständige Echtgeld-Preferred/Total-Cap-Persistenz, echtes Real-Positions-/Reservierungsledger und reale Orderausführung sind **nicht nachgewiesen**. Die bestehende READ-ONLY-Wallet-/UI-Funktion bleibt unangetastet. Dieser Auftrag genehmigt **weder Echtgeldhandel noch Wallet-Transfer, PayPal, reale Swaps oder Einzahlungen**.

**Risikodifferenz:** Im bisherigen Paper-Code greifen zusätzlich 1 % Equity pro Einzelposition und 3 % Equity Gesamtexposition. Das widerspricht teilweise höheren dynamischen Investitionsbudgets. Diese Gates sind **nicht durch diesen Dokumentationsauftrag entfernt**. Die zuständige Entwicklung muss Kapitalbudget, tatsächliches Verlustrisiko und technische Sicherheitsgates separat prüfen, die Abweichung belegen und jede Risikoänderung ausdrücklich abnehmen lassen statt stillschweigend Schutz zu entfernen.

## 5. Historische Referenzfälle – KEINE vorgefertigten GPT-Kaufaufträge

Die vom Nutzer diskutierte **30-Tage-Tabelle 20.10.–18.11.2026** ist eine **unverifizierte Betreiber-/Recherche-Referenz**, keine vollständige Liste aller weltweit gestarteten Memecoins und keine vorab verfügbare Handelsinformation. Ticker können mehrdeutig sein, reale Contracts/Chains/Quellen fehlen zum Teil, 24h-/Wochen-/„seit Start“-Prozentzahlen messen unterschiedliche Zeitfenster. In extrem illiquiden Pools können auffällige angezeigte Prozentanstiege nicht handelbar sein.

**Datenherkunft und vollständiger Originaltabellenkontext:** [R29 V5.0 Referenzfälle](R29_V5_0_MEMECOIN_30T_REFERENZFAELLE_UNVERIFIZIERT_20261118_DE.md).

- Fälle ausschließlich **POSTFREEZE** für spätere Fehlerdiagnose, nachvollziehbare Preis-/Contractprüfung und die Messung von verpassten Chancen verwenden.
- Für eine historische **blinde** GPT-Entscheidung pro Frame nur zeitgerechte ungekennzeichnete Contract-/Pool-/Source-Informationen verwenden, ohne Gewinnernamen, spätere Höchstkurse, Nutzerbeispielliste oder Labels als Modellinput.
- Immer eine **neutrale Grundgesamtheit einschließlich nicht gestiegener oder gescheiterter Coins** verwenden. Nachträglich nur Gewinner auszuwählen wäre Survivorship-/Selection-Bias.
- Früheren historischen Paging-Verlust nicht neu bauen: PR #56 hat 310.540/310.540 geeignete Candidate-Time-Paare über 5.054 Seiten exportiert. Weiterhin fehlende 241.649 Mint-Minutenmerkmale als UNKNOWN behandeln; reine Paging-Vollständigkeit beweist keine vollständige reale Marktverfügbarkeit.
- Unabhängige 7 Entwicklungs- und 3 unverbrauchte Holdout-Fenster, mit as-of-Warmup und korrekter Source-/Fee-/Slippage-/Sellability-Abnahme, bleiben getrennt vom persönlichen Forward-Paper-Konto.

## 6. Verbindliche Abnahme

Erst als funktionsfähig melden, wenn für einen **im Voraus unbekannten** Coin tatsächlich autonom belegte ChatGPT-Strategiebewertung, eindeutige Contract-ID, echte signierte GitHub-Kaufentscheidung, unabhängige lokale Papierausführung im unveränderten User-Ledger, individuelles autorisiertes Exit-Regelwerk, anschließender lokaler Paper-SELL und Netto-PnL durch voneinander trennbare Evidenz belegt sind.

Zusätzlich messen: tatsächliche GPT-Vollreviews pro Tag, Datenfrische/Chain-Abdeckung, Fund→Review→BUY-Latenz, Anteil früh erkannter/verpasster/spät erkannter Ausbrüche, abgelehnte Sicherheitsfälle, False Positives, Kaufausfälle, Exit-Ausfälle und realistische simulierte Kosten.

**NICHT erneut tun:** extra Bots/Automationen, Paging-Fix, GitHub-Kurier-Neuentwicklung, bezahlte lokale OpenAI-API, Echtgeld-/Wallet-/PayPal-Umbau, UI-Neubau, Datenlöschung, nicht autorisierte Trades, rückdatierte Gewinner-Trades oder erfundene Gewinne.

## 7. Vorrang / Dokumentationsregeln

Dieser V5.0-Zielvertrag ist die aktuelle **fachliche Anforderung**. Bestehende V4.5–V4.9-Chronik, tatsächlicher Sourcecode, jüngster CI-HEAD, Live-GitHub-/Windows-Belege und maschinenlesbarer Checkpoint sind die **Evidenz zum Implementierungsstand**. Bei Widerspruch keine ältere Behauptung als technischen Fakt verwenden. Ein dokumentiertes Ziel gilt erst als „fertig“, wenn real nachgewiesen. Neue Ergebnisse nur datiert als CODE / CI / WINDOWS / GITHUB LIVE / CHATGPT TURN / OFFEN eintragen.
