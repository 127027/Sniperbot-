# R29 – zukünftige Memecoins: technische Abnahme von Entdeckung bis Paper-Sell
Stand: 17. November 2026. PAPER_ONLY. Dieses Dokument darf NICHT als Eingang für historische Blindtests verwendet werden.

## Ziel und echte Zielbedingung
Die 40 vom Nutzer geposteten Gewinner (12 fremde Wallet-Berichte, 16 theoretische Fenster, 12 Tagespreisanstiege) sind ausschließlich posthoc Referenzen und NICHT die zukünftige Coinliste. Ihre angegebenen Prozentwerte sind keine gesicherten Ausführungspreise. Für neue unbekannte Coins muss erst eine neutral beobachtete Marktquelle vorliegen, vor dem Handelsergebnis.

## Aktuell wirklich nachgewiesen
1. R29 GitHub-Kurier hat am 17.11.2026 einen aus dem Chat erstellten GPT-NO_TRADE-Entscheid vom laufenden Windows-Bot bestätigt. Original 17:58:12.581 UTC, Bot-Quittung 17:58:45.322 UTC: 32.741 Sekunden. Das ist nur ENTSCHEIDUNG → BOT-QUITTUNG, NICHT Event → GPT-Entscheidung oder Quote → Paper-Fill, und KEIN bestätigter BUY.
2. Der öffentliche Marktfeed im kanonischen Branch war bei letztem Check weiterhin alt. Der in PR51 entwickelte direkte Fallback über den vorhandenen Windows-Kurier kann erst funktionieren, wenn dieser Code tatsächlich auf dem Laptop aktualisiert wurde.
3. Die frühere Solana-Jupiter-V2-Quote-Route ist nur read-only. Jupiter dokumentiert eine kostenlose Entwickler-API-Key-Option über JUPITER_API_KEY und x-api-key; keine bezahlten Endpoints und kein Schlüssel in GitHub.

## Neu in dieser Entwicklung
- runner/solana-forward-evidence.mjs: nimmt nur frische, nicht beworbene Solana-Pools mit übereinstimmender Chain, Contract- und Pool-ID und überprüfter Zuordnung zu GeckoTerminal und DexScreener als technische Forschungskandidaten an.
- Ein finales getAccountInfo mit commitment=finalized liest nur den öffentlichen SPL-Mint-Account. Die bereits vorhandene Mint-Header-Analyse prüft Mint-/Freeze-Rechte. Token-2022 und unklare Header bleiben besonders ungeprüft. Dies ist KEIN vollständiges Contract-, Holder- oder LP-Audit.
- Für diesen Coin werden getrennte rein indikative Jupiter-Kauf- und Rückverkaufskurse zu einer kleinen, festen 0,01-SOL-Research-Probegröße angefordert. Ein solches Angebot ist KEIN verifiziert ausführbarer TEST-USDC-Trade und KEINE Honeypot-Sellability-Garantie. Die echte TEST-USDC-Kaufhöhe kann NICHT aus einer nominalen 0,01-SOL-Probe abgeleitet werden.
- Ein rein öffentlicher JSON-Bericht research/r29/channel/solana-forward-evidence.json kann vom bestehenden Windows-Kurier erzeugt werden. Darin stehen weder Kontostand, Wallet, private API-Schlüssel noch BUY/SELL-Aufträge.
- runner/solana-swap-quote.mjs kann optional den ausdrücklich konfigurierten kostenlosen Jupiter-API-Schlüssel über den lokalen Header x-api-key verwenden. Er wird nie in URLs/Logs oder öffentliche GitHub-Reports eingefügt.
- runner/gpt-paper-delivery-latency.mjs misst die tatsächlich belegte Entscheidung → Bot-Quittung, mit Schemagates gegen vertauschte IDs, rückdatierte Quittungen und falsche Paper-Fills. Reale 32.741 Sekunden aus 17.11.2026 bestätigt, aber keine BUY-Latenz.
- Offline-Tests inklusive RPC-Unverfügbarkeit, manipuliertem Token/Pool, veralteter Quelle, Cross-Provider-Lücke, ungültigen Accounts, Quote-Ausfall, API-Key-Sicherheit und idempotentem Public-Publish unter Windows und Linux.

## Unverzichtbare Ausführungsgrenzen
1. Der neue GitHub-Code muss zuerst auf dem tatsächlich laufenden Windows-Laptop installiert und die einzige Sniperbot_Starten.bat erneut gestartet werden, ohne bestehende .local- und Paper-Kontodateien zu entfernen. GitHub-CI ist KEIN Beleg der lokalen Installation.
2. Für neue unbekannte Coins müssen aktuelle Quellen per unabhängiger Chain-/Mint-/Pool-Zuordnung und Marktbeobachtung vorliegen; ohne frische GitHub-Frames ist keine Echtzeitentscheidung verifiziert.
3. Solana-Sicherheit benötigt Token-2022-Extensions, tatsächliche Holder-Konzentration, LP-Besitz, Mint-/Freeze-/Transferrechte, Rug-/Honeypot-Risiko und bidirektionale, für die geplante 50–5000 TEST-USDC-Größe ausführbare Onchain-Simulation samt Gebühren, Slippage und verfügbarem SOL/Token. Nominelle Jupiter-Routen reichen dafür NICHT aus.
4. GPT bleibt alleiniger strategischer Entscheider über Coin, Betrag und Exit. Aktueller ChatGPT-Wecklauf maximal stündlich; GitHub-Kurier ist gepollt. Diese beiden Wege sind für Sub-Minuten-Snipes möglicherweise zu langsam. Eine direkte abgesicherte Ereignis→GPT-API-Entscheidung→lokaler Paper-Signature-Pfad müsste implementiert werden; kostenpflichtige Modellaufrufe nur mit separater Nutzerfreigabe. Die lokale Quelle darf nie stattdessen aus eigener Momentum-Heuristik kaufen.
5. Vor jedem BUY: frischer privater tatsächlicher Paper-Kontostand, Vertrags- und Liquiditätsprüfung, REALISTISCHE 2-Wege-Quote, GPT-BUY-Evidenz+Signatur, technische Idempotenz, eindeutiger PAPER_FILLED-Receipt. Vor jedem SELL: bestandene Exit-Quote + dieselbe Position + eindeutige GPT-Entscheidung oder zuvor klar autorisierte Exit-Regel.
6. App zeigt nur einen TEST-USDC-Ledger, offene GPT-Positionen, abgeschlossene Trades mit Fills, tatsächliche Gewinne/Verluste nach Kosten und Empfangsverzögerungen. Keine zweite Sandbox-Bilanz und keine echten Wallet- oder PayPal-Aktionen.

## Proof checklist für zukünftige Erfolgsmeldungen
Phase A: lokaler kostenloser Stream liefert echte launch/migration Events innerhalb weniger Sekunden; Originaleingangstimestamp bestätigt.
Phase B: neuer Pool von zwei unabhängigen Quellen identisch und nicht nachträglich als Gewinner vorselektiert.
Phase C: Mint-Header, Holder-/LP-Risiko, ausführbarer Hin-/Rückweg und unabhängige Slippage-Messung zeitlich belegt.
Phase D: GPT-Full-Review-Aufruf mit Modellzeit/Evidence gespeichert, 1/4/12/24 Tagesplanung nur tatsächliche LLM-Calls; SECURE_PRIVATE_AMOUNT und signierte Intent-Entscheidung bestätigt.
Phase E: lokale R29-PAPER_FILLED-BUY-Quittung und später separate SELL/Teilverkäufe in einem Ledger nachgewiesen; Event→Kauf und Exit→Sell Verzögerungen gemessen.
Phase F: 30–60 Tage unabhängiger Forward-Test protokolliert Treffer, Ausfälle, Liquditätsrugs, übersehene Gewinner, Gebühren, Fehlsignale, Drawdown und realisierten PnL. Keine garantierten extremen Gewinne.

## Nächster Handgriff
Code auf Windows aktualisieren (einzige Sniperbot_Starten.bat behalten, lokale Dateien nicht löschen), danach frische Zeitstempel in research/r29/channel/forward-source-health.json, research/market/latest.json, research/r29/channel/solana-forward-evidence.json kontrollieren.
Die Forschung kann ohne JUPITER_API_KEY laufen, aber Quotes können wegen Limitierung/Autorisierung fehlen. Wer den optionalen Free-Key nutzt, hinterlegt ihn NUR lokal und veröffentlich ihn nie im Chat oder GitHub.

## Fortsetzung in neuem Chat
Immer den kanonischen Branch codex/r29-chatgpt-github-paper-cycle-20261115 und SNIPERBOT_R29_START_HERE.md, R29_LATEST_CHECKPOINT.json, R29_FORWARD_LIVE_RESUME_20261117_DE.md sowie dieses Dokument lesen. Die 40 historischen Referenzen strikt getrennt halten. Nicht behaupten, dass ein aktueller Coin oder Gewinn verifiziert ist, wenn es keinen Echtmarkt-/Fill-Beleg gibt.
