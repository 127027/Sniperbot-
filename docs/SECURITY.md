# R29 V5.0 – Sicherheit und Beweisgrenzen

**VERBINDLICHER V5.0-ZIELVERTRAG (NUTZER GO):** [R29 V4.5–V4.9-Wissenschronik](../research/r29/operations/R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md) · [Autonomer GPT-Memecoin-Scout](../research/r29/operations/R29_V5_0_AUTONOMER_MEMECOIN_SCOUT_ZIELVERTRAG_20261118_DE.md) · [30-Tage-Fälle: ausdrücklich unbestätigt, nicht für Blindtest-Inputs](../research/r29/operations/R29_V5_0_MEMECOIN_30T_REFERENZFAELLE_UNVERIFIZIERT_20261118_DE.md). Die bisherige V4.9-Dokumentation unten ist der **technische Code-IST-Stand**, nicht die Definition eines bereits erreichten V5.0-Ergebnisses.

**V5.0 ist ein vom Nutzer freigegebenes Entwicklungsziel, KEIN Nachweis einer fertig installierten Handelsfunktion.** Aktueller belegter Code-IST ist R29 V4.9 (PR #65) plus Dokumentationsabgleich PR #66. Der parallele Entwicklungsauftrag darf nur mit echten Code-/CI-/Windows-/ChatGPT-Belegen als erfüllt markiert werden.

**Das Produktziel:** vorhandener 24/7-Windows-Collector sucht neu entstehende, vorher unbekannte Memecoins auf unterstützten Chains anhand aktueller Pools, Liquidität, Walletfluss, Social-/News-/Marktdaten. Die bestehende ChatGPT-Forward-Automation trifft **4–24 tatsächliche GPT-Vollreviews/Tag als Ziel**, priorisiert neue Ereignisse und entscheidet allein WATCH/BUY/HOLD/SELL/NO_TRADE, Einsatz und individuellen Exit. Stündlicher Wakeup ist NICHT garantiert eine GPT-Vollanalyse; 24/7 lokales Monitoring ist NICHT gleich 24/7 GPT-Aufrufe.

**Beweisziel:** eindeutiger unbekannter Contract + zeitgerechter Fund → echte GPT-Entscheidung → authentifizierter GitHub-BUY → unabhängiger lokaler Paper-Sicherheits-/Quote-Check → echter persönlicher Paper-Ledger-Fill → GPT-autorisierter kontinuierlich überwachter SELL → Netto-PnL im vorhandenen Dashboard. Isolierte Tests und NO_TRADE sind keine autonomen Trades.

**Zwei Konten, dieselben GPT-Signale (SOLL):** getrennte dynamische Paper-/Real-Präferenzen, Gesamtgrenzen, Positionen, Reservierungen und eigene Sicherheitsprüfungen. **IST V4.9:** Paper-Werte lokal dynamisch; Real READ-ONLY Wallet und LIVE_LOCKED ohne belegtes vollständiges eigenes Real-Handelsledger; privater lokaler Paper-/Real-Snapshot erreicht Cloud-GPT NICHT automatisch. Echtgeld bleibt gesperrt. Bestehende 1-%-/3-%-Paper-Risikogates gelten weiterhin und dürfen nicht stillschweigend entfallen.

**Historische 30-Tage-Tabelle:** 36 **unbestätigte Betreiber-Referenzen**, keine komplette Marktgesamtheit, keine verifizierten ausführbaren Gewinnquoten und KEINE Gewinner-Whitelist. Nur POSTFREEZE-Diagnose; Blindtests brauchen neutralen as-of-Markt inklusive Verlierern. 7+3 Blindtests, Frische-/Quellen- und historische Price-/Fee-/Sellability-Abnahme weiterhin offen.

**Nicht neu bauen:** zusätzlicher Bot/Dot, lokaler bezahlter OpenAI-API-Aufruf, GitHub-Kurier, repariertes Paging, neue UI, PayPal-/Wallet-Funktionen; keine vertraulichen Kontowerte in öffentliches GitHub, keine Echtgeldtransaktion.

**Sicherheitsgrenze V5.0:** Paper-Trading zuerst; Echtgeldausführung LOCKED. Bei nicht nachgewiesener Sellability, frischem Zweiweg-Quote, Contract/Pool-Identität, Exit-Monitor-Liveness oder aktuellem Bot-Budget keinen neuen GPT-Paper-BUY. GPT-Modelleinschätzung kann falsch liegen; 100-%-Ausbruchswahrscheinlichkeit ist kein legitimes Feld. Bei Offline/PC-Schlaf keine 24/7-Exit-Abdeckung behaupten. Alle Betreiber-30T-Gewinner gehören in die Nachher-Diagnose, nicht in as-of-Modellinputs.

---

## Technischer Ausgangsstand R29 V4.9 (nachgewiesene Implementierung, historischer Kopf)

# Sicherheit / Betriebsregeln – aktueller R29 V4.9-Vorrang (18.11.2026)

**R29 V4.9: Aktive automatische Handelsausführung ausschließlich PAPER_ONLY; Echtgeld strikt LIVE_LOCKED.** Der Paper-Bereich verwendet nur virtuelle TEST-Werte. **Der getrennte Echtgeld-/Wallet-Bereich kann verifizierte echte SOL-/USDC-Walletbestände READ-ONLY anzeigen** – diese sind NICHT virtuelles Paper-Guthaben und dürfen weder mit Paper-Zahlen vermischt noch als ausführbare Echtgeld-Trading-Positionen ausgegeben werden. Keine Echtgeldorder, keine Einzahlung oder Auszahlung aus dieser Dokumentation ableiten. Die vorhandenen Wallet-Funktionen und verschlüsselten lokalen Daten bleiben erhalten. [Aktueller R29 V4.5-Wissensstand mit V4.9-Nachtrag](../research/r29/operations/R29_V4_5_KANONISCHER_WISSENSSTAND_20261118_DE.md).

- Localhost-Server nur `127.0.0.1`; bei Netzwerkfreigabe neu absichern und schriftlich reviewen.
- Fremde öffentliche API-Daten und Agenten-Aussagen als untrusted input behandeln; strikt validieren, Rate-Limits, TTL und Vertrauensstufen.
- Kein Login/OAuth, Wallet-Secret, PayPal-API-Token oder andere Kontodaten in GitHub einchecken. `.local/`, `.env*`, `.pem` und `.key` werden ignoriert. `git status` vor Push prüfen.
- Private dynamische Paper-/Real-Zustands-Snapshots sind nur authentifiziert lokal abrufbar; ein sicherer automatischer Cloud-ChatGPT-Rückkanal ist weiterhin nicht bewiesen. Keine privaten Guthaben, Wallet-Adressen, Credentials oder Kontodaten in öffentlichen GitHub-Forschungsdateien speichern.
- Zusätzliche Paper-Risikogates (1 % Einzelposition, 3 % Gesamtexposition) gelten aktuell unabhängig von den gespeicherten Nutzerpräferenzen; ihre fachliche Änderung erfordert getrennte Sicherheitsabnahme.
- Spend-Controls separat von UX-Schaltern: `entriesEnabled` ist **keine** allgemeine Berechtigung für Ausführung von Echtgeldorders.
- Ungeprüfte Contract-, Liquiditäts- oder Verkaufs-Sicherheitsfelder niemals als positives Ergebnis interpretieren.
- Bei Marktfeed-Ausfall bzw. veralteten Quotes keine neuen riskanten Echtgeldeinstiege; Exit-Fehler dokumentieren und alarmieren.
- Public GitHub Actions erhalten keine Secrets; alle Tests laufen offline.
- Gewünschte reale EUR-Aufladung und Auszahlung: regulatorisch gesondertes Projekt mit Anbieterprüfung, Custody-/Noncustody-Entscheid, KYC/AML, steuerlicher Dokumentation, Gebühren- und Betrugsrisikoanalyse.
- Das Repo darf privat sein; kein automatischer Zugriff anderer Codex-/Dot-Systeme ohne bewusst eingerichtete Berechtigungen.

## Zentrales Research-Netz / getrennte Nutzerbots (neue Sollarchitektur 07.11.2026)

Der zentrale Publisher erhält **ausschließlich die Berechtigung, signierte Research-/Exit-Hinweise zu senden**, niemals `BUY/SELL/DEPOSIT/WITHDRAW/RESET` bei fremden Instanzen auszuführen oder Wallet-/Kontostände abzurufen. Jeder Nutzer besitzt eigene Identität, Daten, Credentials, Einstellungen und künftig eine eigene Wallet. Kein gemeinsames Seed-Material oder Datenverzeichnis für Freunde. Client-registrierte Abos per TLS/Signatur/TTL, unabhängige lokale Risiko-/Quote-Gates, Revocation und Geräteisolation sind Pflicht. PWA/App-Remotezugriff darf nur die eigene Instanz autorisieren; ohne Schutzmechanismen kein Internetzugang zur localhost-API. Der Stand ist derzeit nur PAPER; vollständige Spezifikation: [DISTRIBUTED_INSTANCES.md](DISTRIBUTED_INSTANCES.md), [SIGNAL_DISTRIBUTION_PROTOCOL.md](SIGNAL_DISTRIBUTION_PROTOCOL.md).

