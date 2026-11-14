# Verbindlicher Forschungsablauf: gespeicherter Zustand und belegte Übergaben

Repo127027/Sniperbot-, Branch codex/dots-pepe-replay-20261113. Dieser Branch ist nur Forschung. Keine Änderungen an main, Bot, Wallets, Signaturen, Orderfeed oder Konten.

Diese Regeln ersetzen im eigenen Forschungsauftrag die bisherigen Chat-only-/GitHub-Schreibverbote, die starre3-Datei-Wiederholung und die Pflicht zur Vor-Deployment-Entdeckung. Alte Berichte bleiben erhalten. Historische Inputs bleiben zeitlich begrenzt; das ist kein Live-Handelsauftrag.

## Ablauf jeder Rolle
1. Eigenen aktuellen Zustand unter research/dot-workflow/roles/ROLLE/current.json am AKTUELLEN Branch lesen (nicht am eingefrorenen0713332). Neue Peer-Versionen bei Bedarf lesen.0713332 bleibt nur unveränderliche Rohdatenreferenz.
2. Genau den nächsten offenen Prüfpunkt bearbeiten. Erledigte Prüfungen nur bei neuen Daten oder Widerspruch wiederholen. Begrenzung8 externe Abrufe ist ein Maximum, kein Zwang zur Recherche. Ohne echten Abruf/Auswertung status=NO_PROGRESS oder BLOCKED, nicht neuer Erkenntnisfortschritt.
3. Vorhandene gültige Einzelantworten anhand exakter JSON-Pfade auswerten. Ein Fehler eines früheren Providers entwertet keine erfolgreiche Ersatzantwort. Abgeschnittene Ausgabe gilt als nicht vollständig gelesen; gezielt fehlende Felder abrufen.
4. Neues Ergebnis zuerst als eigene unveränderliche Datei roles/ROLLE/runs/RUN_ID.json erzeugen. Danach NUR eigenes current.json mit vorher gelesener Git-SHA aktualisieren. Bei Konflikt neu lesen. Keine fremde Datei überschreiben.
5. Beide Dateien zurücklesen. Nur bei passendem Inhalt Schreib-/Übergabeerfolg melden, Commit und run_id nennen. Falls Werkzeug/Schreibrecht fehlt, exakte Operation und Fehler melden. Niemals einen Master-Commit als eigene Übergabe ausgeben.

## Datensatz
current.json und Run-Datei enthalten mindestens schema=dot_research_state.v1, role, run_id, previous_run_id, candidate, mode=TRAINING_ONLY, actionable=false, status, input_refs, completed_checks, findings, blockers, next_task, peer_receipts.
candidate.id ist vollständige chain:token:pool-Identität. input_refs nennen repo/ref/path und verwendete JSON-Pfade oder Original-URL/Zeit. peer_receipts nennen role,run_id,Ergebnis. Findings kennzeichnen Eigenprüfung versus übernommene Peer-Aussage.
Befunde enthalten jeweils Aussage, as_of_utc, evidence_ref und Beweisgrenze. Historisch spätere Source-Verifikation ist nicht damalige öffentliche Verfügbarkeit. UNKNOWN ist kein VETO und kein Beweis der Sicherheit; Freigabe bleibt ohne notwendige Prüfung offen.

## Cursor statt Dauerschleife
Blockierte Beweisfragen mit Grund und neu erforderlicher Eingabe parken, dann andere offene Frage bearbeiten. Keine wiederholte Suche nach vollständiger Tagesabdeckung als Bedingung für nächsten Tag. Ohne neue Daten bleibt dieselbe Frage geparkt. current.json muss next_task enthalten. Bei zwei Läufen ohne neuen Befund Status STALLED mit konkret fehlendem Zugang; keine Wiederholung alter Zusammenfassung als Fortschritt.

## Rollenübergabe
Scout/Social/Onchain/Security schreiben ihre eigenen Befunde zur selben Kandidaten-ID. QA liest deren current.json und bestätigt die tatsächlich gelesenen run_ids in peer_receipts. Unterschiedliche Datenstände nicht als Einigkeit ausgeben. QA darf fehlende Sicherheitsprüfung nicht selbst als bestanden erklären.
Dieser erste Übergabetest verwendet den vorgegebenen PEPE-Fall; er beweist Kommunikation/Persistenz, keine autonome Entdeckung.

## Zielkorrektur
Entdeckung darf nach Token-/Poolstart erfolgen, solange entscheidungsrelevante Informationen vor der bewerteten späteren Bewegung verfügbar waren. Ein Social-Post vor Deployment ist KEINE allgemeine Pflicht. Nicht auf einen einzelnen Gewinner kalibrieren. Ein Kaufentscheider, Kosten-/Exit-Modell und unabhängige Ausführbarkeitsprüfung fehlen noch; die bisherigen62NO_BUY-Zeilen sind KEIN Strategiebacktest.

