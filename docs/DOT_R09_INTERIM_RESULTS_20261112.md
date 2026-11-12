# R09 – Zwischenbewertung des erneuten Zwei-Monats-Tests

**Stand:** 12.11.2026, Experiment R09, ausschließlich Forschungs-Dots, keine Trades.

## Zentrale Frage
Verbessert sich nach R08 die Fähigkeit, **überhaupt** Meme-Ereignisse und Tokenidentitäten im Zeitfenster 2024-09-10 bis 2024-11-09 zu lokalisieren, bevor Contract-Sicherheit und ausführbare Kauf-/Verkaufspreise geprüft sind?

## Messbare Ergebnisse

| Art des Nachweises | Ergebnis | Aussagekraft |
|---|---:|---|
| GitHub CI | **162/162** Tests erfolgreich, Run 43283312356 | Software-Regressionsschutz |
| Zeitfenster | 61 Tage | Korrekte UTC-Tagesgrenzen |
| Eingegebene, 2026 zusammengetragene datierte Originalplattform-Posts | 10 | **nicht** alle Posts aus zwei Monaten |
| Verschiedene Kalendertage mit Stichprobenquellen | 7 | 54 Tage im Stichprobenkorpus ohne Quelle |
| Aus Quellen vorläufig erkennbare Memecoin-Symbole | 7 | Inhalt kann später editiert worden sein |
| Aus Quellen vorläufig erkennbare Solana-Mint-Adressen | 2 | Noch **kein** unabhängig zeitlich belegter Pool |
| Originaltexte aus 2024 unverändert nachgewiesen | 0 | As-of-Prädiktionsleistung nicht beweisbar |
| 2024-verifizierte Kauf-/Verkaufsquotes | 0 | Keine historische Kaufempfehlung möglich |
| Belegte autonome 5-Dot-Trefferquote | **nicht berechenbar** | Nichts als 95% o. ä. behaupten |

### Erste tatsächlich eigenständig abgegebene R09-Rolle

`research/historical/R09/onchain_liquidity.json`: **COMPLETED**, liest **10/10** Datumsbeiträge. Dokumentiert provisional HORSEMEAT mit Solana Mint ab 2024-10-09; POPCAT und RETARDIO als bloße Erwähnungen; KENDU/SLOTH/BRETT als teils Werbe- oder Large-Cap-Hinweise am 2024-10-13; MAU mit Solana Mint/DEX-Pair-Hinweis 2024-11-05; HORSEMEAT wiederholt. Der Dot fand außerdem selbstständig relevante Negativkontrollen zu damals scheiternden Memecoin-Starts. Er weist korrekterweise **0** streng nachweisbare Mint+Pool-Daten und **0** qualifizierte Buy-Advisories aus.

Die anderen vier Rollen haben ihre eigenen `research/historical/R09/<role>.json`-PENDING-Resultate zum Zeitpunkt dieser Zwischenbewertung noch nicht als unabhängig abgeschlossen bestätigt. `run_now` initiierte in dieser Chat-Sitzung Inline-Durchläufe und ist **kein** Nachweis von vier extern abgeschlossenen Cloud-Läufen. Ihr nächster regulärer Lauf soll R09 nur bei PENDING einmalig abarbeiten und dann normale Live-Forschung fortsetzen.

## Was R08 gegenüber R07 tatsächlich verbessert

R07 verwendete ein Alles-oder-Nichts-Schema: Ohne unabhängige Quellenarchivierung **und** 2024-Sellquote meldeten alle fünf Rollen nur BLOCKED und es gab null unterscheidbare frühe Beobachtungen. Das konnte weder belegen, dass sie einen Coin rechtzeitig gefunden hätten, noch dass sie ihn übersehen hätten.

R09 trennt:
1. `ORIGINAL_PLATFORM_MENTION_PROVISIONAL` – zuerst auf einer heute sichtbaren datierten Plattformmeldung genannt (kein Nachweis unveränderten Originaltexts).
2. `MINT_CLAIM_PROVISIONAL` – gemeldete Tokenadresse; darf niemals einem anderen Symbol im selben Reddit-Thread zugeordnet werden.
3. `TOKEN_POOL_ASOF_VERIFIED` – unabhängig belegte tatsächliche Historie von Chain/Mint/Pool/Blockzeit (derzeit 0).
4. `PAPER_BUY_ADVISORY_ASOF_VERIFIED` – zusätzlich damalige Sicherheits- und Größen-/Sell-Quotes (derzeit 0).

Diese Trennung macht die **Forschungsdiagnose** besser. Sie beweist noch keine Verbesserung einer nicht kalibrierten KI-Kursprognose und keine früheren Gewinne.

## Untersuchte Datenbeschaffungswege
Historische Solana-DEX-Daten sind nach Anbieter-Dokumentation grundsätzlich ab Mitte 2024 vorhanden:
https://docs.bitquery.io/docs/graphql/data-coverage-retention/
https://docs.bitquery.io/docs/blockchain/Solana/solana-dextrades/

**Noch kein authentifizierter Bitquery-GraphQL-2024-Abruf, kein geprüfter Zugang oder vollständiges 2024-Marktarchiv.** Nicht öffentlich verfügbare Archivdaten oder kostenpflichtige Zugriffe werden nicht als beschafft bezeichnet.

## Noch fehlend
- Ganze historische Quellen- und Startkohorte (einschließlich übersehener und gescheiterter Coins), nicht nur 10 von 2026 ausgewählte Beispiele.
- Originale Social-Nachrichtenstände mit damaligem Capture/Dateihash sowie verifizierte immutable Onchain-Mint-/Pool-Transaktionen.
- Zeitgerechte 2024-Preis-, Liquiditäts- und Sell-Quotes für 50/100/1000/10000 Test-USDC.
- Vier noch nicht abgeschlossene eigenständige R09-Rollenberichte.
- Ein unabhängiger und vorab festgelegter Bewertungsdatensatz ohne bekannte Gewinnerlabels im Forschungsinput.

## Projektgrenze
Diese Arbeiten betreffen nur Forschungs-Dots, Zeitkapsel-Research und Testing. Keinerlei Änderung an Bot/Trading-Engine/Wallet/PayPal/Paper-Beständen/Real-Orders. Echtgeld bleibt gesperrt.
