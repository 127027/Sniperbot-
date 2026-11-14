# Lokale zentrale Paper-Ausführung – Implementierungsstand

Eigentümerauftrag 07.11.2026: Dots entscheiden zentral, lokale Bots verwalten Einsatz und führen technisch aus. Kein zweites lokales KI-Review. Min/Max sind pro Coin und benutzerdefiniert; keine feste 200er-Grenze. Ziel für diesen Laptop: 1000 Test-USDC insgesamt, Bereich50–1000, zentrale Paper-Folge aktiv. Keine realen Zahlungen.

## Implementiert

- `allocation.mjs`: unter80 kein Kauf;80 Minimum;92–100 Maximum; dazwischen linear; Grenze freies Kapital und technische Quote-Kapazität; feste Min=Max entweder genau Betrag oder0; Gesamtbudget inklusive Kosten. Keine Gewinnwahrscheinlichkeit.
- `central-decisions.mjs`: getrennt von Nur-Info-Feed. Exaktes versioniertes BUY-/SELL-Schema aus GPT-Abstimmung plus Pflichtfeld `paper_only:true`. Ed25519-Verifikation gegen lokal vorab vertraute öffentliche Schlüssel. Domain `MemeSniper/paper_execution_decision.v1` gefolgt von genau einem LF; anschließend rekursiv schlüsselsortiertes JSON ohne signature, UTF-8. Nicht RFC8785 allgemein; nur die strikt validierten flachen Felder dieses Schemas. Signatur base64.
- Maximale Signalgültigkeit120s, Zukunftstoleranz5s, Coin-Identität, einmalige Signal-ID, persistente Revisionsprüfung und gemeinsam mit Ledger gespeicherter Empfang. Neue Revision nach blockiertem Signal nötig. Verfall wird auch vor Wiederholungsannahme geprüft.
- `GET /api/decisions` zeigt Follow-/Publisher-/Blockerstatus. `POST /api/decisions/events` ist nur am bestehenden localhost erreichbar, ohne Browser-Origin, mit Signatur, Größenlimit und Rate-Limit. Keine Wallet/Admin/Einzahlungsbefehle.
- Lokale Datei `trusted-publishers.json` im jeweiligen Datenordner: Array aus key_id, issuer, public_key_pem, scope (`external`/`synthetic`), optional revoked. Nur öffentliche Schlüssel; nie aus dem untrusted Feed automatisch übernehmen. Ohne Datei kein vertrauter Publisher. Schlüssel werden pro Anfrage neu gelesen, Widerruf greift sofort.
- Synthetische Ausführung ist ausschließlich im isolierten Test-Aufruf mit expliziter Testoption und synthetischer Quote zulässig. Der laufende HTTP-Server aktiviert diese Option niemals. Tests erstellen flüchtige Schlüssel im Speicher, keine Demo-Schlüssel im Nutzerkonto.
- Die synthetischen Tests verarbeiten dasselbe signierte BUY auf drei getrennten Konten mit50/200/1000, Restkapital50+150, SELL nur eigener identischer Position auch bei Einstiegen AUS, Replay/Signatur/Revision/Quote-Negativfälle. Kein lokales Research im Follower.
- Automatischer lokaler Discovery-Scanner standardmäßig aus; optionaler Diagnose-Scanner benötigt `SNIPER_LOCAL_DISCOVERY=1`. Technische Positionspreisüberwachung bleibt bestehen.

## Noch NICHT vorhanden / bewusst blockiert

Kein echter zentraler Signier-/Entscheidungs-Publisher, keine Order-Broker-Queue oder automatische signierte Orderabholung, keine geprüften realen Contract-/Sell-Ausführungsadapter. Die lokale HTTP-Verifikation ist kein fertig angeschlossener weltweiter Orderdienst. Selbst gültig signierte externe Coin-Aufträge werden mit `REAL_VALIDATOR_UNAVAILABLE` protokolliert, ohne Kauf/Verkauf. Der Statusfeed bleibt getrennt und nicht handelbar.

Die synthetische Quote ist ein Testadapter, kein Marktbeleg. Vor externem Betrieb sind ein authentisierter zentraler Beleg-/Entscheidungsdienst samt vertrauenswürdig eingerichteter öffentlicher Schlüssel, dauerhafter Transport/Queue und unabhängig nachvollziehbare Ausführungsvoraussetzungen nötig. Keine Schlüssel-Erfindung oder automatische Übernahme aus GitHub. Keine Behauptung, fünf echte Dots seien bereits verbunden.

Die alten lokalen Laborstimmen bleiben nur für Regressionstests. Die Mechanik ihres Betragsmodells wurde auf80–92 aktualisiert; sie ist kein Produktions-KI-Konsens. Historische95-Punkte-Dokumentation ist überholt.

## Betrieb und Kontrolle

`Windows_Starten_mit_Forschung.bat` aktiviert den bestehenden Informationsfeed. Zentrale-Follow-Einstellung und Min/Max werden persistent gespeichert. Laufender Bot AN bedeutet Bereitschaft, hebt fehlende Publisher-/Marktadapter nicht auf. Prozess AUS/Schlafmodus bedeutet keine Überwachung. Lokale Stop-/Trailing-Regeln wurden nicht neu aktiviert; vorhandene HOLD-Einstellung bleibt erhalten.

Eine zweistündliche Codex-Kontrolle wurde auf ausdrücklichen Wunsch eingerichtet. Sie erzeugt keine Orders oder Ersatzsignale und lädt Guthaben nicht erneut auf. Desktop-App/ausführbare lokale Umgebung müssen für die Kontrolle verfügbar sein.

Validierung: Core-Test und36 Node-Tests unter Windows bestanden; nur Testkonten, keine echten Orders.
