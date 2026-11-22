# R29 V1.9 – Weiterarbeit 22.11.2026: echte Archiv-Wiederaufnahme und neutraler Nenner

**Cleanroom-Branch:** `codex/r29-cleanroom-paper-20261121` im Repository `127027/Sniperbot-`. **Nur Research / Paper-Entwicklung, fünf ChatGPT-Dots weiterhin deaktiviert. Kein Echtgeld, keine Windows-Paper-Kontoänderung und kein Signal-/Orderwrite.**

## Was konkret implementiert wurde

### SYS-11 – Bereits *committete* HTTP200-Rohquellen nach abgebrochenem Capture wiederverwenden (PARTIAL)

Die vorherige Umstellung schrieb `research/state/provider-budget.json`, `page-coverage.json` und `research/feeds/<tag>/<run>/inflight-capture.json` **während** des GitHub-Capture-Jobs auf das Actions-Dateisystem und versuchte, auch bei einem fehlgeschlagenen Prozess diese Dateien im anschließenden `always()`-Schritt zu committen.

Das hatte eine echte Lücke: War eine Originalseite bereits als HTTP200 heruntergeladen, aber noch nicht im Poolindex erfasst, existierten beim nächsten Lauf zwar Rohdatei und HTTP-Quittung, doch der Runner verwendete die Daten nicht und konnte die gleiche Seite erneut abrufen.

**Neue Implementierung:**
- `src/v19-inflight-http-recovery.mjs` validiert `R29_V19_INFLIGHT_CAPTURE_JOURNAL` mit Run-ID, konkreter geplanter Chain und Seitennummer, exakter GeckoTerminal-`new_pools`-HTTPS-URL, Original-Start-/Empfangszeit und SHA-256 des unverändert gespeicherten Rohtexts;
- ausschließlich bestätigte **HTTP200-Original-Body-Dateien** sind reparierbar. HTTP429, fehlende Dateien, Hash-Abweichungen, abweichende URLs, falsche Run-IDs, Zukunftsdaten und nicht dekodierbare Antworten bleiben **kein** Erfolg;
- `scripts/cloud-discovery-runner.mjs` durchsucht beim Start bereits im GitHub-Checkout enthaltene frühere `inflight-capture.json`-Journale und repariert nachweisbare Rohseiten **vor der Planung neuer Gecko-API-Aufrufe**; ein Auditbericht wird geschrieben;
- alte Rohdateien werden nicht überschrieben; bereits indizierte oder durch einen neueren Originalcapture ersetzte Seiten bleiben unverändert; offene PENDING-Seiten werden nur nach erfolgreichem Parser + bestätigter Seitenreferenz geschlossen;
- `src/market-memory.mjs` unterscheidet `GECKOTERMINAL_ARCHIVED_HTTP_RECOVERY` explizit als **nachträgliche Rekonstruktion**. Der ursprüngliche HTTP-Eingang wird mit seiner alten Uhrzeit erhalten, aber **nicht** als bereits damals von Dot2 erfolgreich detektierter Kandidat ausgegeben. Neuere Chain-Cursors und der aktuellere Memory-Zeitstand werden nicht zurückgesetzt;
- `src/v19-partial-capture-durability.mjs` protokolliert dazu die Original-`url` in jeder HTTP-Quittung, statt eine spätere Wiederherstellung ohne überprüfbare Herkunft zu erlauben.

**Grenze:** Ein hart abgebrochener GitHub-Runner kann seine lokalen Dateien verlieren, wenn der abschließende Commit selbst nicht ausgeführt wird. Die Rekonstruktion funktioniert nur für Bytes, die nachweislich **bereits nach GitHub committed** wurden. Dieses System ersetzt **keine** transaktionale, bei jedem Aufruf remote gesicherte Datenbank und garantiert weder vollständigen 24/7-Betrieb noch 100-%-Marktabdeckung. Der neue wiederaufnehmende Live-Provider-Test ist noch offen. **SYS-11 weiterhin PARTIAL.**

### SYS-12 – Neutrales Population-/Nennerregister ohne Gewinnerauswahl (OPEN→PARTIAL)

Der zuvor vorhandene `src/v19-neutral-pool-registry.mjs` konnte Beobachtungen neutral zusammenführen, aber nicht alle bereits gespeicherten Pool-Memories und deren offenes Ergebnisstatus direkt als evaluierten Nenner im bestehenden Runner ausweisen.

**Neu:** `src/v19-neutral-evaluation-population.mjs`:
- bildet bei gegebenem as-of-Zeitpunkt aus den tatsächlich gespeicherten Pool-Quellen einen neutralen, nach sechs Chains aufgeschlüsselten Pool-Nenner; auch Pool-IDs mit fehlendem Contract, Konflikten, ohne Quote oder ohne Handelsevidenz bleiben erhalten;
- aus `research/state/market-memory.json` sind **409 original gespeicherte Pools** rekonstruierbar (nicht 409 tatsächlich kaufbare oder vollständig im weltweiten Markt gefundene Coins);
- nachträgliche Gewinnerrankings und die **65 Excel-Referenznamen** werden **nicht** als Entdeckungs-Input verwendet; `first_actual_dot2_capture_at_utc` bleibt für nicht bezeugte Legacy-Quellen leer;
- für unbekannte Real-Outcomes werden `recall`, `false_positive_rate`, `precision` ausdrücklich **null** ausgegeben. Das ist kein behauptetes 0-%-Fehler-/Trefferergebnis;
- eine separate rein mathematische Evaluationsfunktion verlangt *angegebene* verifizierte Quellen und zeitgerechte Entscheidungen vor den Ergebnislabels, und verweigert nachträgliche Entscheidungen oder winner-oracle-kontaminierte Labels. **Diese Flags sind kein eigenständiger kryptografischer Nachweis**; echte Markt-Recall/FPR bleiben unbekannt, solange unabhängige Ergebnis-/Entscheidungsbelege nicht vollständig verfügbar sind;
- der existierende Dot2-Runner archiviert nach einem tatsächlichen nächsten Capture eine `neutral-evaluation-population.json`, auch wenn es keine handelbaren Coins gibt. Es wird kein Kaufauftrag ausgelöst.

**SYS-12 bleibt PARTIAL**, da die ursprünglichen Anforderungen belastbare Recall-/FPR-Zähler und das spätere Ergebnislabeling der vollständig aufgenommenen Population verlangen. Ein positiver Test mit synthetischen Labels darf nicht als reale Trading-Trefferrate ausgewiesen werden.

## Ausgeführte Tests / reale Quellen

**Node22-GitHub-CI:** [Run #45054150056](https://github.com/127027/Sniperbot-/actions/runs/45054150056), Quellcommit `581f16c09c1914693722d09c951c22a8f9f38684`: **528/528 PASS, 0 FAIL, TEST_ONLY_NO_SIGNAL_WRITE 0**. Neue Testdateien:
- `test/v19-sys12-neutral-complete-population.test.mjs`: 409 reale Source-Pool-IDs, 65 ausschließlich spätere Evaluationsreferenzen, as-of-Kontrolle, fehlende Contractdaten, null Recall/FPR bei unvollständiger Wahrheit, synthetische TP/FP/TN/FN, unabhängiger Ergebnishorizont;
- `test/v19-sys11-replay-committed-http-on-restart.test.mjs`: Reparse aus committetem Original-HTTP200 mit SHA, Raw-URL, Originalzeit, unverändertem Chain-Cursor, Wiederholungs-Idempotenz, negative SHA/URL/429-Fälle sowie **wirkliche bereits archivierte GeckoTerminal-BSC-Originalbytes** aus `research/feeds/2026-11-22/45044300013/`. Es wurde weder eine neue API-Antwort erfunden noch ein neuer Provider-HTTP-Call ausgelöst;
- aktualisierte `test/v19-sys11-partial-capture-recovery.test.mjs`: originale HTTP-URLs im Journal.

**Keine neue echte Markt-API-Abfrage wurde in diesem Abschnitt gestartet.** Vorliegender echter ETH-Gecko-429-Cooldown aus `research/state/market-memory.json`: `retry_after_utc=2026-11-22T18:31:56.465Z`. Bis dahin darf keine neue Gecko-Abfrage stattfinden. Nach Ablauf steht die echte mehrstufige Source-Provider-Verifikation separat aus.

## Verbindliche neue Projektzählung

Ausgang vor diesen Änderungen: **12 PASS, 25 PARTIAL, 24 OPEN** von insgesamt 61 Originalaufgaben.

**Nach den ursprünglichen Abnahmekriterien:**
- **12/61 PASS = 19,7 %** (unverändert; keine neue echte Provider-/Handels-End-to-End-Abnahme)
- **26/61 PARTIAL = 42,6 %** (SYS-12 aus OPEN in PARTIAL)
- **23/61 OPEN = 37,7 %**
- **38/61 PASS+PARTIAL = 62,3 % technisch bearbeitet**. Diese 62,3 % **sind KEINE** „62,3 % vollständig wie gewollt erledigt“ und keine Trading-Reife.

Die frühere 50,8-%-Angabe bezog sich auf technisch bearbeitete Aufgaben, nicht das jetzige strenge `PASS`-Kriterium. **Keine frühere Codeänderung wurde wegen der geänderten Prozentzählung gelöscht.**

## Noch notwendige technische Arbeiten

1. Nach Ablauf der bestehenden Provider-Sperre einen kontrollierten neuen **research-only** GitHub-Capture erstellen und echten `provider-budget.json`-, `page-coverage.json`-, HTTP-Raw- und Replay-/Journal-Zustand prüfen. Keine Zusage eines erfolgreichen Sechs-Chain-HTTP200-Laufs vor tatsächlichem Beleg.
2. Einen zweiten tatsächlichen Resume-Lauf mit bewahrten offenen Seiten, ID-Konfliktprüfung und Quoten-Cooldown durchführen, statt synthetische Tests als Live-Provider-Dauernachweis zu zählen.
3. Für SYS-12 tatsächliche, nicht vorselektierte Outcome- und Review-/Trading-Belege sammeln. Ohne vollständig beobachtbare Referenzpopulation sind Recall/FPR ausdrücklich nicht berechenbar.
4. D1-04 echte zeitbasierte Markt-/Paper-Positionsbeobachtungen und die restlichen Dots erst mit separater Freigabe; **alle fünf Dots bleiben deaktiviert**.
