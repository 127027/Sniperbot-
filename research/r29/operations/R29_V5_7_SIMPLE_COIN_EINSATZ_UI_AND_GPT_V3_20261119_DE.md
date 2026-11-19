# R29 V5.7 – EIN EINSTELLBARER EINSATZ PRO COIN (PAPER + ECHTGELD)

**Freigabe:** Nutzer-GO am 19.11.2026. User Experience: In jedem Reiter nur „Maximal vorhanden“ (read-only) und „Einsatz / Coin“ (standardmäßig **50**, vom Nutzer einstellbar). GPT entscheidet **nur die Coins, BUY/SELL und Exit-Strategie, nicht den Betrag**. Keinen neuen Bot, keine Paid APIs.

## Bedienung

- **Paper-Reiter:** „Maximal vorhanden“ = effektiv frei verfügbares Guthaben des **persönlichen** Testkontos (z. B. 5.000 TEST-USDC; nach 10 Käufen à 50: 4.500). „Einsatz / Coin“ = 50 TEST-USDC als Vorgabe; 50,00–5.000,00 einstellbar; im vorhandenen lokalen Paper-Ledger unter `paperCoinStakeUsdc` separat gespeichert. Freier Betrag wird nach jedem ausgeführten Kauf/Verkauf von vorhandenen Backend-Transaktionen aktualisiert. Ein Buy benötigt mindestens diesen vollständigen Einsatz, keine automatischen Teilkäufe bei unzureichenden Mitteln.
- **Echtgeld-Reiter:** derselbe UI-Aufbau, aber „Maximal vorhanden“ aus **verifiziertem Wallet-USDC**, ohne eingerichtete Wallet **0 USDC**; bei unbekanntem/unverifiziertem Chainstatus **–** (nicht als erfundene 0). „Einsatz / Coin“ = 50 USDC; separat als `realCoinStakeUsdc` gespeichert. Dieses Feld ist rein informativ/vorgemerkt, aktiviert keine Echtgeldzahlung/Wallet-Orders, und wird für Paper-Käufe niemals verwendet. LIVE weiterhin technisch gesperrt.
- **Verschwundene Alt-UI:** „Bevorzugter Einsatz“, „Gesamtlimit offener Einsätze“ und überholte UI-Texte zur 1%-Risikogrenze. Legacy-Daten bleiben unverändert; `SET_RANGE` und alte Limitfelder werden für andere Altwege beibehalten, aber **signierte GPT-Paper-Käufe verwenden nur tatsächlich freie virtuelle Mittel**.
- Settings dürfen auch bei laufendem Bot lokal geändert werden. Die aktuelle Order fällt nach einem solchen Wechsel ausdrücklich durch die Wiederholprüfung, statt mit dem neuen Betrag unbemerkt zu kaufen.

## Neues GPT-Paper-Protokoll v3

Für einen neu abgegebenen BUY lautet `schema: sniper_r29_gpt_paper_decision.v3`, `sizing_mode: LOCAL_USER_COIN_STAKE` und `amount_test_usdc: null`. Der **sonst vollständig formatierte** v3-Entscheid enthält weiterhin einzigartigen `decision_id`, individuelle aktuelle Chain+Token+Pool-Bindung, Quell-Hash, frische UTC-Zeiten, Risikoanerkennung und gültige **`exit_policy`**.

Die GitHub-Archivsignatur über genau diese unveränderte Entscheidung bleibt obligatorisch. **Erst der lokal vom Nutzer autorisierte Windows-Executor** liest sein eigenes `paperCoinStakeUsdc` und setzt den Geldbetrag in das **lokal signierte Ed25519-Paper-BUY-Signal** ein. Er prüft Guthaben, Quote, Liquidität, exakte Contract-/Pool-Adresse, unabhängige Zweirichtungs-Simulation, GPT-Follow, Exit-Vertrag, Deadline und Replay unmittelbar vorher; nach asynchronen Checks auch, dass der Nutzer den Betrag nicht verändert hat. Bereits existierende v1- und v2-Archiventscheidungen bleiben zur historischen Überprüfung lesbar; ältere signierte v2-BUYs enthalten weiterhin einen Betrag und können aus Kompatibilitätsgründen bis zur Umstellung weiterlaufen. **Neue GPT-Reviews müssen v3 BUY nutzen.**

Dies schützt die alleinige Coin-/Risikostrategie von GPT, während der Nutzer direkt den Einsatz festlegt. Es wird keine fiktive private Budgetzahl auf GitHub veröffentlicht und kein Modellaufruf für eine Einsatzanfrage benötigt. Das vorhandene `/api/gpt/private/bot-state` ist **nur auf dem authentifizierten lokalen Gerät** verfügbar und stellt keine bestätigte Cloud-Zustellung dar.

## Testplan

- Striktes `SET_COIN_STAKE` nur 50–5.000 USDC (zwei Nachkommastellen). Paper und Echtgeld-Persistenz voneinander unabhängig, keine Geldbewegung, kein Live-Freigabebit; bestehende Geldbestände bleiben unverändert.
- Neue v3-GPT-Entscheidung ohne beliebigen Betrag: authentifizierter BUY → lokale Position mit `paperCoinStakeUsdc=250` → SELL → Rückbuchung. Budget <50 blockiert. Konfigurationsänderung während langsamem Marktcheck blockiert **vor** lokaler Signatur.
- Bestehender Legacy-Budgetpfad und alte v2-Entscheidungen bleiben rückwärtskompatibel; keine Bank-, Wallet- oder Testsender-Daten als persönliche Performance-Beweise behandeln.
- UI-Tests auf beiden Plattformen zeigen den einzigen Einsatz pro Coin und ein read-only „Maximal vorhanden“, Echtgeldhandel weiterhin AUS.
- **Erfolg noch NICHT prospektiv nachgewiesen:** erster persönlich vom GPT-v3-BUY ausgelöster Windows-`PAPER_FILLED` BUY + späterer SELL. GitHub-Merge installiert nicht automatisch lokal.

**Nicht Bestandteil:** echte Echtgeld-Orders, Nachbauten weiterer Dots, frei erfundene Paper-Profite oder ein Echtgeld-Wallet-Management. Historische Februar-Auswertung und Solana-Execution bleiben getrennte Entwicklungsaufgaben.
