# Meme Scout: Verbindungsprüfung vom 06.11.2026

## Ergebnis

**Nicht bestanden: echte Dot-zu-Bot-Zustellung nicht nachgewiesen.**
Der angefragte Chat „Meme Scout – Forschungsradar“ meldete selbst:
`BLOCKED – LOCAL_COMPUTER_ACCESS_UNAVAILABLE`.

GitHub-Zugriff und Lesen der V0.4-Anleitung waren laut seiner Antwort möglich.
Ein lokaler Windows-Ausführungszugang war in dieser Unterhaltung nicht verfügbar.
Ob im Dot-Profil bereits eine Computerfreigabe gesetzt ist, konnte weder aus der
Chat-Metadatenansicht noch vom Scout bestätigt werden. Fehlende ausführbare
Verbindung ist nachgewiesen; ein bestimmter Zustand des Freigabeschalters nicht.

## Tatsächlicher Prüfablauf

1. Lokaler Commit `6569b6b16864fd8dc001ce5d6e0a7bb1d2fec3bd` und veröffentlichter
   Branch `codex/research-gateway-v04` verglichen: identischer Stand, sauberer Checkout.
2. `docs/GATEWAY_V04.md` und `runner/agent-client.mjs` auf diesem Branch verifiziert.
   GitHub CI für diesen Commit erfolgreich. PR #6 war bei dieser Prüfung offen;
   die Dateien waren noch nicht in `main`. Eine separate Merge-Freigabe wurde angefragt.
3. Den benannten Scout direkt um eigene Prüfung seiner verfügbaren Computer/Tools
   und einen eigenen lokalen `get`/`send`-Test gebeten. Kein Cloud-Ersatz und keine
   Ausführung durch Codex als vermeintlicher Dot-Test.
4. Scout antwortete: kein lokaler Windows-Zugang, Adapter nicht ausgeführt,
   keine Testnachricht gesendet, keine Serverantwort und keine bestätigte Event-ID.
5. Unabhängiger rein lesender Blick auf den laufenden Bot um **19:40:46 UTC
   (20:40:46 Europe/Berlin)**: insgesamt 0 Research-Events; angeforderte Test-ID fehlt.

Vorgesehene, **nicht zugestellte** Event-ID:
`meme-scout-connectivity-20261106-a1`.

Der Forschungsauftrag wurde in den Scout-Chat zugestellt. Das ist ein anderer
Kommunikationsweg als der HTTP-Gateway des Bots und kein Nachweis einer Bot-Zustellung.
Es wurde in dieser Prüfung kein lokaler Adaptertest von Codex als Erfolg verbucht.
Keine Orders, Einzahlungen, Echtgeldaktionen, Bot-Einstellungsänderungen oder
Schlüsselausgaben. Der Bot stand bei der Kontrolle auf PAPER_ONLY, Neueinstiege AUS,
Paper-Autokauf AUS.

## Erforderliche Einrichtung

1. In der ChatGPT-App auf dem Windows-Laptop das Profil des tatsächlich verwendeten
   Meme-Scout-Dots öffnen. **Computers → Your computer → Allow access** prüfen und
   bei Bedarf selbst freigeben. Falls kein solches Profil verfügbar ist, zuerst
   klären, ob „Meme Scout – Forschungsradar“ nur ein Chat/eine Forschungsautomation
   oder ein Dot mit unterstütztem Computerzugang ist. Der Chatname beweist das nicht.
2. Die App geöffnet und den Rechner online lassen. Ein Codex-Zugang oder ein
   GitHub-Connector ersetzt die Dot-Computerfreigabe nicht.
3. Scout muss tatsächlich eine lokale Ausführungsumgebung auf genau diesem Laptop
   erhalten. `127.0.0.1` in seinem Cloud-Computer bezeichnet nicht den Windows-Bot.
4. Dort `docs/GATEWAY_V04.md` lesen und `runner/agent-client.mjs get` selbst ausführen.
   Nur den lokalen Zugang `local-news_discovery` über `SNIPER_AGENT_TOKEN` verwenden.
   Keine Tokens im Chat oder als Kommandozeilenargument ausgeben.
5. Ein einziges `candidate.v1` mit `paper_only: true`, eindeutiger Testkennzeichnung,
   frischen UTC-Zeitstempeln und neuer Event-ID senden. Keine Votes, keine
   Risikofreigaben, keine Kauforders und keine Änderung von Bot-Einstellungen.
6. Abnahme benötigt **beides**: vom Scout tatsächlich empfangene Serverantwort und
   dieselbe Event-ID im unabhängig gelesenen Bot-Speicher, mit richtigem Absender
   und Empfangszeit. Bis dahin bleibt der Anschluss unbestätigt.

Offizielle Beschreibung des Computerzugangs:
https://learn.chatgpt.com/docs/dots/computers-and-apps

## GitHub-Dateien für den Scout

- [Gateway-Anleitung](https://github.com/127027/Sniperbot-/blob/codex/research-gateway-v04/docs/GATEWAY_V04.md)
- [Lokaler Adapter](https://github.com/127027/Sniperbot-/blob/codex/research-gateway-v04/runner/agent-client.mjs)
- [Pull Request #6](https://github.com/127027/Sniperbot-/pull/6)
