# Übergabe an GPT: tatsächlichen Forschungs-Zustellweg prüfen

Stand: 07.11.2026. Vom Eigentümer beauftragte Übergabe zwischen Codex und GPT.
Arbeitsbranch: `codex/research-gateway-v04`.

## Auftrag und Grenze

Zuerst nur Fähigkeiten prüfen und eine harmlose Testzustellung vorbereiten bzw. bei bereits vorhandenem autorisiertem Zugang durchführen. Keine Kauforders, keine Echtgeldtransaktionen, keine Wallets, keine neuen kostenpflichtigen Dienste, keine Änderungen an Hixton. Bestehende Automationen nicht stillschweigend umkonfigurieren. GitHub ist hier ein manueller Übergabeweg, kein bereits implementierter Live-Nachrichtenbus.

## Bereits festgestellter Stand

- Der lokale Windows-Gateway und `runner/agent-client.mjs` sind implementiert.
- `docs/GATEWAY_V04.md` beschreibt Authentifizierung, Nachrichtenvertrag und Grenzen.
- `docs/DOT_CONNECTIVITY_STATUS.md` dokumentiert den bisher gescheiterten echten Scout-Test: kein lokaler Ausführungszugang, keine bestätigte Zustellung.
- Die vom Eigentümer vorgelegten Meme-Scout-Berichte sind Textberichte ohne ausreichend bestätigten Kandidaten. Sie beweisen keine Zustellung zum Bot.
- Fünf logische Rollen sind keine fünf nachweislich laufenden, verbundenen Dots.

## Was Codex von GPT benötigt

Bitte ausschließlich anhand tatsächlich verfügbarer Werkzeuge und Einstellungen feststellen:

1. Welche Forschungsabläufe existieren tatsächlich (Meme Scout – Forschungsradar, Meme Sniper – Techniklabor)? Jeweils Typ (Chat, geplante Automation, Dot oder anderer Dienst), sichtbarer Aktivierungsstatus, Zeitplan und Ausgabeziel nennen. Nicht einsehbare Felder als UNBEKANNT markieren. Keine privaten internen Kennungen veröffentlichen.
2. Welche Versandfähigkeit besteht **im tatsächlichen geplanten Forschungslauf**, nicht nur im interaktiven Chat? Kann dieser Dateien im Repository schreiben, authentifizierte HTTP-Anfragen senden oder lokal unter Windows ausführen? Nur verifizierte Fähigkeiten nennen; keinen geheimen Endpunkt erfinden.
3. Ist Windows-Ausführung wirklich verfügbar? Eine Chatbezeichnung, Codex-Zugriff oder GitHub-Verbindung genügt nicht als Beleg. Falls nein: BLOCKED melden, fehlende Berechtigung/Integration und konkret verfügbare Einrichtung dokumentieren. Keine spekulativen Menüanweisungen.
4. Falls GitHub die einzige verfügbare Ausgabe ist: als möglichen verzögerten Übergabeweg beschreiben, nicht als aktive Bot-Verbindung. Codex muss einen geeigneten Abrufweg erst implementieren und testen. Keine privaten Daten oder Tokens in das öffentliche Repository schreiben.

## Echter Test nur bei vorhandenem Windows-Zugang

Der tatsächliche Forschungsprozess muss den Adapter selbst ausführen. Kein von Codex erzeugtes Ersatzereignis als Dot-Nachweis werten.

- Nur die eigene bereits zugeordnete Forschungsidentität verwenden. Fehlt sie, Test als BLOCKED melden; keine fremden Rollen übernehmen.
- Token ausschließlich lokal über `SNIPER_AGENT_TOKEN` bereitstellen, niemals in Chat, Repository, Prozessargumente oder Protokoll schreiben.
- Aus dem lokalen Projektverzeichnis zuerst `node runner/agent-client.mjs get` ausführen.
- Genau ein neues `candidate.v1` gemäß Gateway-Dokumentation senden: eindeutige Event-ID, frische UTC-Zeit, Ablauf innerhalb fünf Minuten, `paper_only: true`, Symbol `CONNECTIVITY_TEST`, Chain `base`, Dummy-Token `0x1111111111111111111111111111111111111111`, Dummy-Pool `0x2222222222222222222222222222222222222222`. Candidate-ID exakt aus Chain, Token und Pool gemäß Vertrag bilden. Keine Marktchance behaupten.
- Keine Stimmen, keine Risikofreigabe, keine Simulation, keine Änderungen an Bot-Schaltern, Guthaben oder Einstellungen senden. Der Testkandidat allein darf keinen Kauf auslösen.
- HTTP-Ergebnis und unveränderte Serverantwort ohne Geheimnisse dokumentieren. Der vorhandene Adapter gibt Antworttext und Exitstatus aus; den numerischen HTTP-Status nur nennen, wenn tatsächlich beobachtet. Fehlende Messwerte ausdrücklich markieren.
- Codex prüft anschließend unabhängig den gespeicherten Eingang anhand derselben Event-ID. Erst danach ist der komplette Nachweis erbracht. Ein erfolgreicher GitHub-Commit allein ist keine Zustellung.

## Antwortübergabe

Bitte das Ergebnis im selben Branch als `docs/GPT_CONNECTIVITY_REPLY.md` veröffentlichen, sofern Schreibzugriff vorhanden ist. Andernfalls den Bericht dem Eigentümer zur Weitergabe geben. Nicht nach main zusammenführen.

Der Bericht enthält:

- Prüfzeit (UTC), geprüfter Forschungsablauf und tatsächliche Ausführungsumgebung;
- beobachtete Fähigkeiten und ausdrücklich unbekannte Einstellungen;
- Ergebnis: BLOCKED / NICHT GETESTET / GESENDET, LOKALER NACHWEIS AUSSTEHEND;
- tatsächlich ausgeführte Schritte, Serverantwort, Event-ID und beobachteter Status bzw. fehlende Messwerte;
- bei Blockade: fehlender Zugriffsweg und kleinster konkret belegter Einrichtungsschritt;
- bei GitHub-Ausgabe: ob geplante Läufe diesen Weg tatsächlich benutzen können;
- keine Tokens, Credentials, lokalen Kontodaten oder privaten Portfolioinhalte.

## Noch nicht implementierter Statusbericht

Der bestehende Gateway unterstützt kein eigenständiges `status.v1` oder Heartbeat-Schema. Ein Bericht „kein geeigneter Kandidat“ darf daher nicht als erfundener Coin oder Kaufempfehlung eingereicht werden. Solche Berichte bleiben zunächst Forschungsprotokolle. Ein eigenes Statusschema wäre eine spätere, separat zu testende Codeänderung.
