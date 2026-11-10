> **Offenes nach V0.7-Blindreplay (10.11.2026):** Keine verifizierte historische 30+14-Tage-as-of-Datenbasis mit Originalnachrichten/Socials, tatsächlicher damaliger Pooltiefe und kompletter Gewinner-/Verliererkohorte. 5 historische Gewinner als Stichprobe sind **nicht** ein valider Profitabilitäts-Backtest. DOGE-2013-PoW-Chain außerhalb der derzeit überwachten vier DEX-Chains. RSS-Inhalte/Publisher-Daten sind nicht automatisch unabhängige ursprüngliche Socialposts. Weiterhin keine unabhängigen realen DEX-Contract-/Sellability-Validatoren und keine echten externen autonomen Paper-Käufe/Exits. [Vollständige Ursachen und 225-Tage-Replay](HISTORICAL_BLIND_FIVE_CASES_20261110.md).

## V0.5 – weiter offene Risiken (09.11.2026)

Die neue Forschungskomponente liest bis zu zwei Neupool-Seiten pro Chain, speichert ausgewählte wiederholte indikative Pool-Preise lokal und zählt historische 2×/5×/10×/50×/200×-Beobachtungen. **Nicht behoben:** Vollständige Abdeckung aller Memecoin-Starts, unabhängige unzensierte Launch-Gesamtkohorten, verlässlich kalibrierte 14-Tage-Ausbruchswahrscheinlichkeiten, Contract-/LP-/Honeypot-/Sellability-Validatoren, signierte Fünf-Rollen-Kaufpublikation, echte externe automatische Paper-Käufe, unabhängige echte Sell-Quotes und nachgewiesene profitable Selbstverbesserung. Kein Cloud-Dot schreibt unmittelbar lokale Windows-Dateien. [Details](V05_DISCOVERY_LEARNING_STATUS_20261109.md).

---

# Stand V0.4

Lokaler Gateway, synthetische Fünf-Rollen-Tests, Mehrfachpositionen, begrenzter
Kapitaleinsatz, Demo-Trailing, Neustart und Fehlerabbruch bei beschädigtem State
sind implementiert. Details und verbleibende Grenzen: [GATEWAY_V04.md](GATEWAY_V04.md).
Echte Dot-Zustellung, unabhängige reale Contract-/Sell-Prüfungen und eine validierte
adaptive Marktstrategie bleiben offen. Trailing ist nur für synthetische Coins
ausführbar. Der Research-JSON-Speicher wächst; Archivierung/Indexierung ist noch
kein skalierbarer 24/7-Datenbankdienst. Registry-Erweiterung erfolgt lokal mit Neustart.

Die folgende Liste dokumentiert V0.3 vor diesem Implementierungsschritt.

---

# Bekannte Probleme und Einschränkungen (ehrliche Ist-Liste)

1. **Kein echter KI-Sniper:** V0.3 hat heuristisches Scoring, keine ChatGPT-Dot-Integration, keinen Agenten-Controller und kein Modell für verlässlich profitable Memecoins. Ein Demo-Signal wird künstlich erzeugt.
2. **Keine echte EUR- oder USDC-Transaktion:** 50 € Testguthaben und die 1:1-Konvertierung sind reine Simulation. Keine PayPal-/Bank-/Wallet-Funktion, keine Ein-/Auszahlung echten Geldes.
3. **Keine echten Käufe/Verkäufe:** Preisindikationen von DEX Screener sind keine ausführbaren Swap-Quotes. Keine Wallet, Signaturen, MEV-/Slippage-/Latenz-/Liquiditätsausstiegs-Simulation im realistischen Maßstab.
4. **Keine vollständige Contract-Sicherheit:** Mint-/Freeze-Authority, Token-2022-Extensions, Honeypot/Sell-Tax, LP-Owner, Insider-Wallet-Cluster und Rug-Pull-Risiken fehlen als verifizierte Gates.
5. **Keine zuverlässige echte Sniping-Latenz:** Neue Pools per 90-s HTTP-Polling, offene Positionen ca. alle 30 s. API-Limits, Datenlücken, fehlerhafte Response-Felder und Latenz wurden nicht unabhängig in Livebetrieb verifiziert.
6. **Nur eine Position gleichzeitig:** `maxPositions:1` in `runner/core.mjs`; die Nutzeranforderung mehrerer paralleler Käufe ist noch zu implementieren. Betragsschema `minTrade/maxTrade` ist vorbereitet.
7. **Bot AN/AUS nicht gleich Exitmodus:** `HOLD` hält bis manueller Verkauf; nur `AUTO` erzwingt TP/SL auch bei Bot AUS. Die spätere KI-gesteuerte Exit-Entscheidung gibt es nicht.
8. **Riskanter Positionswert:** Kurse basieren auf indikativen Preisen und können aus einem anderen Pool stammen. Das UI zeigt einen Kurs, nicht den bei Verkaufsorder tatsächlich erhältlichen Betrag. Mark-Quotes sind nicht atomar mit einem Fill.
9. **Market-Scanner nur bedingt getestet:** Offline-Tests validieren Parser mit Fixtures; kein verlässlicher, dauerhafter echter Provider-Benchmark im aktuellen Paket. Öffentliche APIs können Rate Limits oder Antwortschemaänderungen haben.
10. **Windows nicht vollständig Ende-zu-Ende auf Nutzer-PC getestet:** Runner-Unit- und lokale HTTP-Integrationstests bestehen in einer Linux-Testumgebung mit Node.js 22; Windows Defender, Firewall, browserseitige Besonderheiten und Laptop-Schlafmodus sind noch vor Ort zu prüfen.
11. **Kein Windows-Service/Autostart:** Nach Windows-Neustart muss `Windows_Starten.bat` aktuell manuell gestartet werden. Schließen des Terminals beendet den Dienst; Sleep/Shutdown stoppt alle Ausstiege.
12. **Einfaches Ledger:** JSON-Datei mit atomarem Replace statt revisionssicherem, event-sourced Journal; beschädigte Daten werden momentan im Server mit einem frischen Testzustand ersetzt. Für langfristigen Betrieb sind Backups, Integritätsprüfung und Fehlermeldung statt stillen Reset erforderlich.
13. **FX-/Kapital-Einheit:** Virtuelles EUR und Test-USDC werden 1:1 behandelt; P&L in Test-USDC ist keine echte EUR-Rendite und enthält keine tatsächlichen On-Ramp-Gebühren.
14. **GitHub-Sichtbarkeit:** Offizielles Repository `127027/Sniperbot-` ist aktuell **öffentlich**. Codex muss sicherstellen, dass keine Zugangsdaten oder lokale Zustände committed werden.
15. **Datenexport:** Noch kein CSV-/JSON-Export im UI; `.local/` enthält Testdaten und wird bewusst nicht hochgeladen.
16. **Signal-Disziplin:** Der aktuelle Paper-Autokauf darf für Forschung die heuristischen Scores nutzen, obwohl keine Contract-Sicherheitsprüfung besteht. Das ist in keiner Weise eine Zulassung für Echtgeldhandel; bei späterer Live-Integration muss die Architektur standardmäßig fail-closed sein.

Kein Punkt dieser Liste darf im UI/README oder GitHub als „bereits gelöst“ bezeichnet werden, solange keine unabhängigen Tests vorliegen.

## Zusätzliche Lücken nach Strategiefreigabe 06.11.2026

17. **Legacy +15 % Take Profit:** `runner/core.mjs` setzt `takeProfit:15`, `AUTO` schließt eine Position bei +15 %, sofern diese Regel gewählt ist. Das widerspricht dem gewünschten High-Upside-Sniper als Standard-Exit. **Nur dokumentiert, noch nicht behoben.** Codex soll eine adaptive, getestete Exit-Engine bauen und UI/Tests anpassen.
18. **Fünf-Agenten-Konsens fehlt:** Der Bot hat derzeit weder fünf verbundene unabhängige Forschungsagenten noch einen gemeinsamen Belegspeicher, eine reale Dot-zu-Bot-Schnittstelle oder einen 5/5-Vote-Gate. Ziel als fünf logische Rollen, technisch weiter 1..N.
19. **1000-USDC-Positionsgröße nicht risikoprüfbar:** Die aktuelle Betragslogik kennt noch kein belastbares Contract-/Sell-/Liquiditäts-/Portfolio-Risiko. Ein scheinbar überzeugender KI-Score darf nicht 1000 Test-USDC rechtfertigen.
20. **Social-Hype-Frühdetektion fehlt:** Zeitreihen von einzigartigen Autoren, kanalübergreifender Beschleunigung, Bot-/Spam-Korrektur und unabhängiger On-Chain-Bestätigung sind nicht implementiert. Ein zeitlich korrekter Frühindikator ist noch nicht nachgewiesen.

Neue Produktspezifikation: [STRATEGY_5_AGENT_BIG_MOVES.md](STRATEGY_5_AGENT_BIG_MOVES.md). Bis zu separater Codex-Implementierung und Abnahme sind das **offene TODOs**, keine Features.

## Neuer Soll-/Ist-Gap – 07.11.2026 Mehrbenutzer/Mehrgeräte

21. **Kein zentraler Research-/Exit-Signalverteiler:** V0.4 kann nur über `127.0.0.1` innerhalb des jeweiligen lokalen Rechners Research-Events empfangen. Kein sicherer Multi-Instanz-Broadcast, kein signiertes Offline-Abonnement, keine bestätigte echte Dot-Testnachricht. Siehe [SIGNAL_DISTRIBUTION_PROTOCOL.md](SIGNAL_DISTRIBUTION_PROTOCOL.md).
22. **Keine voneinander getrennten Produktionsnutzerkonten:** Mehrere Freunde mit jeweils eigenem Ledger, Credentials, Wallet, Einstellungen, Guthaben und Datenschutzrechten sind ein noch nicht implementierter Sollzustand; aktuelles Ledger ist ein einzelner lokaler Paper-Stand.
23. **Kein autonomer Android-/iOS-Bot:** Responsive mobile HTML-Ansicht ersetzt keinen 24/7-Dienst und keine sichere Fernsteuerung über das eigene Geräte-Netz. Die heutige localhost-Adresse funktioniert nicht über fremde Mobilgeräte.
24. **Verkaufsempfehlungs-Broadcast fehlt:** Keine zentrale Verteilung von zeitgültigen Research-Exit-Hinweisen und keine lokale zustandsabhängige Verarbeitung über viele Nutzerbots.
25. **Echte Zahlungen/Wallet-/Wechselkurse fehlen weiterhin:** Jede hypothetische 50-€-Aufladung ist ein getrenntes, virtuelles Testkonto; kein PayPal und keine Echtgeld-Funktionen.
26. **Haltefristen nicht statistisch validiert:** 24h/7/14/30/90-Tage-Prüfpunkte sind Forschungsannahmen, keine automatisch optimalen Verkaufstermine. Kein Bot darf aufgrund eines beendeten Social-Hypes 'sicher nie wieder Pump' behaupten.

Siehe [DISTRIBUTED_INSTANCES.md](DISTRIBUTED_INSTANCES.md), [HOLD_EXIT_POLICY.md](HOLD_EXIT_POLICY.md) und [IMPLEMENTATION_STATUS_2026-11-07.md](IMPLEMENTATION_STATUS_2026-11-07.md).

