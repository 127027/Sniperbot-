# R18: historische Quellen zeitlich gesperrt – fünf Dots

Stand 14.11.2026. Keine Live-/Echtgeld-/Paperkonto-Transaktionen.

## Zweck

Erster Testzeitraum ist 2023-03-14T00:00:00Z bis 2023-05-14T23:59:59Z (62 Tage). Alle fünf Rollen scout, social, onchain, security und qa erhalten ausschließlich den jeweils aktuell veröffentlichten Tages- oder Stundenframe aus dem neutralen Replay. Die Ergebnisse anderer Zeitpunkte, PEPE als verstecktes Ziel und zukünftige Gewinner/ATH bleiben für den Evaluator reserviert.

Der historische PEPE-Altbestand wurde nachträglich um den bekannten Gewinner gebaut. Die fünf bestehenden Agentenchats sind nachweislich mit PEPE vorinformiert. Beide sind für einen echten Blindtest ungeeignet, bleiben aber als DIAGNOSTIC-Fall erhalten.

## Datenquellen und Zeitfilter

asof-feed.mjs nimmt ein vorbereitetes neutrales asof_corpus.v1 entgegen. Zu jeder Quelle gehören: ID, Kandidaten-ID, Ereignisart, UTC-Ereigniszeit, Originalinhalt mit überprüfbarer SHA-256, Provenienz und belegte historische Verfügbarkeit. Erlaubte Ereignisarten: POOL, SOCIAL, MARKET, SECURITY.

Blockchain: historische Ereignis-/Blockzeit und attestierter Original-Ledgernachweis; MARKET nur mit attestiertem historischen Poolzustand und ausführbarer Quote; SECURITY nur mit historischer Blockzustandsprüfung. Social-/News-Archive: Originalkopie plus nachvollziehbares Publikations- und Erfassungsdatum; konservativ darf der Inhalt erst ab nachgewiesenem Archiv-Erfassungszeitpunkt in die Dot-Ansicht. Eine 2026 abgerufene, auf 2023 datierte Seite allein reicht nicht. Daten vor/nach dem Zeitfenster oder ohne genügende Herkunft werden ausgeschlossen und als Datenlücke protokolliert.

Alle Quellenbelege und Original-URLs bleiben in der PRIVATEN Audit-Tabelle. Die Dot-Ansicht enthält ausschließlich neutrale Quell-IDs (asof:...), nur zeitlich sichtbare Ereignisse und den bis dahin simulierten Portfoliozustand. Nachträgliche Hype-/Kurslabels und bekannte Gewinner gelangen nicht hinein. Der Compiler behauptet keine Quellenverifikation: seine proof-Felder sind externe Attestierungen, die unabhängig bestätigt werden müssen.

## Strenger Ablauf

temporal-session.mjs bietet Befehle prepare, init, publish, status, advance. prepare erzeugt das PRIVATE dataset.private.json und audit.private.json; diese beiden Dateien niemals an Dots oder in öffentliche GitHub-Branches übertragen. init startet einen neuen isolierten Controller. publish gibt ausschließlich den aktuellen Frame nach PUBLIC_ROOT/frames/000NN/input.json frei. Jeder Dot schreibt seine eigene, zum input_hash passende Rolle unter PUBLIC_ROOT/frames/000NN/decisions/rolle.json. Eine leere Entscheidung ist erlaubt, wenn keine Ereignisse sichtbar sind. Nur QA darf hypothetische Orders vorschlagen; die vorhandene Trading-Simulation prüft alle fünf Stimmen, Sicherheitsnachweise, Marktpreis und Slippage. advance akzeptiert nur fünf übereinstimmende Rollen-Dateien und versiegelt sie. Die nächste öffentliche Eingabe wird erst mit einem späteren publish freigegeben.

Beispiel ohne echte Konten:

    node research/replay-controller/temporal-session.mjs prepare neutral-corpus.json /tmp/private-replay day
    node research/replay-controller/temporal-session.mjs init neutral-2023-01 /tmp/private-replay/dataset.private.json DIAGNOSTIC
    node research/replay-controller/temporal-session.mjs publish neutral-2023-01 /tmp/role-frames
    node research/replay-controller/temporal-session.mjs status neutral-2023-01 /tmp/role-frames
    node research/replay-controller/temporal-session.mjs advance neutral-2023-01 /tmp/role-frames

Stündliche Auflösung ist möglich (1.488 Frames); schnelle Bewegungen erfordern eventuell weitere minutengenaue Ereignisse. Der Start einer neuen neutralen historischen Simulation hat Vorrang gegenüber bloßem Umbauen der alten PEPE-Tagessuche.

## Was noch NICHT erreicht ist

- Kein neutraler, unabhängig belegter, vollständiger historischer Mehr-Coin-Korpus inklusive verpasster und fehlgeschlagener Token.
- Keine unabhängig verifizierten fünf neuen, mit PEPE NICHT kontaminierten Modellinstanzen.
- Kein fertiger automatischer GPT-Agentenadapter für 62 chronologische Tages- oder 1.488 Stundenframes.
- Keine ausreichenden historischen Kauf-/Verkaufs-Ausführungsdaten für einen echten Strategie-Erfolgsnachweis.
- Kein tatsächlicher erfolgreicher PEPE-Blindtest; kein echter Paper-Kauf/-Verkauf durch diesen Code.

Darum setzt der Compiler Vollständigkeit und Agentenkontext bewusst NICHT selbst auf geprüft. Der Controller verweigert weiterhin BLIND, solange die Voraussetzungen fehlen. Die vorhandene historische Ergebnisliste darf ausschließlich nach Abschluss aller versiegelten Agentenentscheidungen von einem unabhängigen Evaluator verwendet werden.


## Schutz gegen vortrainiertes Wissen über Gewinner

Ein neuer Modellchat ist NICHT automatisch blind: GPT kann PEPE aus seinem Training kennen. Die temporale Datenfreigabe garantiert nur zeitgerechte EINGABEN, nicht die Löschung vortrainierten Wissens. Das optionale Modul pseudonymize.mjs ersetzt deshalb stabile Coin-IDs, Token-/Pooladressen und ausdrücklich aufgeführte Namen/Aliase vor dem Modellkontakt durch neutrale IDs. Die private Zuordnungstabelle darf nicht an Rollen oder in deren GitHub-Verzeichnisse gelangen. Anschließend MUSS ein unabhängiger Reviewer prüfen, ob unbekannte Namen, Bilder, Narrative oder indirekte Hinweise weiterhin Gewinner verraten.

role-task.mjs stellt für jede der fünf Rollen einen auf einen einzigen öffentlichen Frame beschränkten Arbeitsauftrag für eine neue, externe, speicherfreie Modellinstanz zusammen. Das Modul startet KEIN GPT-Modell und kann Memory oder Pretraining nicht selbst deaktivieren.

Für einen zeitfenstergebundenen BLIND-Modus verlangt die Readiness-Prüfung daher zusätzlich eine echte externe Attestierung der Pseudonymisierung und Untersuchung potenzieller Vortrainings-Leaks. Der Compiler setzt diese Freigabe bewusst nicht selbst. Dies ist kein Beweis, dass jede bekannte 2013–2026-Memecoin-Geschichte aus den Modellgewichten entfernt wäre.

Die tatsächliche erste PEPE-Diagnose läuft getrennt unter codex/dots-pepe-replay-20261113. Ihr aktuelles Resultat darf nicht als unabhängiger Blindtreffer bezeichnet werden.
