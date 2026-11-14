# Empfangsnachweis – historischer Scout-Test über GitHub

Stand 07.11.2026, 18:13 UTC. Keine Echtgeldaktionen.

## Herkunft

Der geplante Meme-Scout-Lauf veröffentlichte die Probe am 07.11.2026 um 17:28:43 UTC. Commit: `3eb166e936ebbb5c9078894ffd256fc0af79478e`. Forschungs-Chat und GPTs nachfolgende Automations-Metadatenprüfung dokumentieren denselben Commit; letzterer nennt einen geplanten Lauf von 17:28:37 bis 17:28:55 UTC.

## Tatsächlicher Windows-Empfang

Der aktualisierte Desktop-Bot lud die unveränderte Datei selbst aus dem fest hinterlegten Commit über HTTPS. Kein durch Codex erzeugtes Ersatzereignis und kein direkter Dot-POST.

Abfrage `GET http://127.0.0.1:3030/api/research/inbox`: HTTP 200, `ok=true`, `enabled=true`.

- Event-ID: `meme-scout-scheduled-probe-20261107`
- Empfangszeit: `2026-11-07T18:11:47.575Z`
- source_commit: `3eb166e936ebbb5c9078894ffd256fc0af79478e`
- Inhalts-Hash (JSON-Normalisierung): `2cf00399b041be91e1cb1c918dd67daffbd57a56c47cfb733dfcef0fc7c6909e`
- delivery: `GITHUB_PULL`
- historical_probe: `true`
- actionable: `false`

Empfang auch im Browser-Dashboard sichtbar. Portfolio und Bot-Einstellungen unverändert. Keine privaten Kontostände/Registry-Daten in diesem Bericht.

## Mehrere Empfänger

Drei weitere kurzlebige Windows-Node-Testprozesse mit separaten Ports und temporären Datenverzeichnissen luden dieselbe echte historische Scout-Probe. Alle lieferten HTTP 200 und dieselbe Event-ID, jeweils lokal persistent; Empfangszeiten 18:12:34.598, 18:12:35.177 und 18:12:35.726 UTC. Keine Position erzeugt. Testprozesse danach beendet und temporäre Daten entfernt. Das sind drei lokale Instanzen, KEIN Test auf drei physischen Geräten oder Smartphones.

## Präzise Grenze

Belegt ist historische geplante Scout-Publikation → GitHub → späterer lokaler Bot-Abruf. Ein frischer wiederkehrender Feed ist noch nicht abgenommen. Sein erster Abruf meldete HTTP 404, weil die Datei noch nicht existierte. Der bestehende direkte Rollen-Gateway ist weiterhin nicht vom Dot angesteuert worden. Keine fünf echten Rollen, keine automatische Coin-Freigabe, keine signierte Mehrgeräte-Broker-Infrastruktur.

Der regelmäßige Nur-Informations-Feed ist laut `GPT_FEED_SETUP_REPLY.md` eingerichtet. Der erste echte geplante Feed-Lauf und sein lokaler Empfang bleiben gesondert nachzuweisen.

Nachtrag: Der Empfangsbeleg blieb nach einem tatsächlichen Neustart des Desktop-Bots unverändert erhalten. Der abschließende vollständige serielle Windows-Testlauf (`node --test --test-concurrency=1 runner/*.test.mjs`) bestand mit 30/30 Tests; der Core-Test bestand ebenfalls.

## Regelmäßiger Feed: echter Empfang bestätigt (07.11.2026)

Der frühere Status „erster regulärer Feed ausstehend“ ist überholt. Fünf reguläre Scout-Veröffentlichungen liegen inzwischen persistent im Desktop-Bot vor. Forschungs-Chat-Berichte nennen passende Event-IDs, Veröffentlichungszeiten und GitHub-Commits. Codex hat keinen Ersatzbericht publiziert und keinen Scout-Lauf manuell ausgelöst.

| GitHub-Commit | Event-ID | Veröffentlichung UTC | Empfang im Windows-Bot UTC |
|---|---|---|---|
| 03ad365b23dd6bd97c0d68f9dfd15c367af17ebe | meme-scout-20261107185009190-puctc5xw | 18:50:09.190 | 18:51:39.527 |
| 004139efc8366049d259e0ac4114fba1b3b08828 | meme-scout-20261107193820770-ay14wkcxmx | 19:38:20.770 | 19:39:39.941 |
| b63fd48f2280c9acef7a081c031135178da081c3 | meme-scout-20261107200639167-mohmlr0qax | 20:06:39.167 | 20:08:40.190 |
| 76c2cc8498e69ce2d811f036008ade9f06b8fa15 | meme-scout-20261107212028449-r0bghkljcd | 21:20:28.449 | 21:23:41.796 |
| daab9a6add4f940f9126c53c98b4364c2e885b2e | meme-scout-20261107221022865-2d2y4q0mwb | 22:10:22.865 | 22:14:41.921 |

Aktuelle direkte Serverprüfung: `GET /api/research/inbox` → **HTTP 200**, `enabled=true`, fünf nicht historische Empfangsbelege, `lastError=null`. Die jüngste Nachricht stimmt in Event-ID und Inhalt mit GitHub und Scout-Bericht überein. Ihr lokal gespeicherter SHA-256 über normalisiertes JSON lautet `67a2062c455941695526da3afc0d21c03d0f3a40ae8605631f4c1dd758e87090`.

**Ergebnis: regulärer Meme Scout → GitHub → Windows-Bot als reiner Forschungskanal nachgewiesen.** Portfolio und Einstellungen bei der Abnahme unverändert. Alle fünf Nachrichten sind STATUS und actionable=false; kein geprüfter Kaufkandidat wurde freigegeben. Gemessene Verzögerungen liegen zwischen rund 79 und 259 Sekunden; kein Echtzeittransport.

Weiterhin offen: fünf echte Rollen, signierte Broker-Verteilung, strukturierte unabhängige Kandidatenvalidierung/Handelsanbindung und reale Smartphone-Instanzen. Die Repository-Identität ist keine kryptografische Signatur des einzelnen Agenten. Der ursprüngliche direkte Dot-zu-localhost-Weg wurde durch diesen Nachweis nicht freigeschaltet.
