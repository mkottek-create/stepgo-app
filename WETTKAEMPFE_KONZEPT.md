# StepGo City – Konzept für Wochenligen und 1-gegen-1-Duelle
Stand: 07.11.2026 · ENTWURF / keine Live-Multiplayer-Funktion

## Grundidee
StepGo City wird eine Schritt-Wettkampf-App mit zwei Kernmodi und der bestehenden kleinen Comic-Stadt als freiwilligem Bonus. Die Schritte aus Alltag, Arbeit, Walking und Laufen zählen grundsätzlich gleichermaßen. Die Nutzung der Stadt darf keine Wettkämpfe verfälschen. Es gibt zum Start KEINE echten Geldpreise, Gutscheine, Einsätze oder auszahlbaren Coins.

## 1. Wochenligen
- Start Montag 00:00, Ende Sonntag 23:59:59, anfangs feste Wettkampf-Zeitzone Europe/Berlin für alle Teilnehmer einer Liga. Serverzeit bestimmt den Zeitraum.
- Ca. 20 Teilnehmer je Gruppe. Anzeigename/Pseudonym, Platzierung, gewertete Schritte, Fortschritt zur nächsten Position, verbleibende Zeit.
- Für die erste Version Bronze, Silber und Gold; später Platin. Der erste Wettbewerb wird vorläufig zugeteilt, nach ausreichender Aktivität anhand eines gleitenden Zeitraums angemessen eingestuft.
- Nach einer vollen Woche steigen die besten drei auf und die letzten drei ab (nur wenn genügend echte aktive Teilnehmer vorhanden). Neue oder inaktive Konten dürfen nicht automatisch vordere Plätze belegen.
- Gewertet werden ausschließlich freiwillig freigegebene, für den Zeitraum erfasste Schritte. Manuelle Demowerte aus localStorage dürfen niemals in die öffentliche Rangliste.
- Gleichstand: derselbe Rang, kein geheimer Zufallsentscheid; die Verteilung der Auszeichnung für Gleichstand wird vor der Implementierung festgelegt.
- Neue Spieler nach Wochenstart: für eine gerechte Wertung entweder erst in der nächsten vollen Woche teilnehmen oder ausdrücklich einer getrennten Einsteigergruppe mit gleicher Laufzeit zugeordnet werden; V1 startet am nächsten Montag.
- Wochenübersicht: Top 3, eigener Rang, Vorwoche, wöchentlicher Aktivitätsverlauf, opt-in öffentliche Teilnahme.

## 2. 1-gegen-1-Duelle
- Über Einladung / Freundescode, Annahme oder Ablehnung.
- Start erst mit Annahme; ein serverseitiger gemeinsamer UTC-Startzeitpunkt und 72 Stunden Laufzeit.
- Es zählen nur Schritte NACH diesem Startzeitpunkt, bis zum serverseitigen Endzeitpunkt – nicht die gesamten Schritte des Tages.
- Es braucht dafür eine zusätzliche HealthKit-Abfrage über benutzerdefinierte Zeitintervalle; die vorhandene Native-Bridge liefert bisher nur HEUTIGE Schritte.
- Ein gleichzeitig aktives Duell pro Spieler für V1, um Missbrauch und unübersichtliche Belohnungen zu reduzieren. Einladung ist zeitlich begrenzt.
- Liveanzeige des zuletzt synchronisierten Stands mit „Zuletzt aktualisiert“ (kein Versprechen von Echtzeit, wenn App nicht geöffnet ist).
- Sieger ist, wer mehr gültige Schritte im Duellzeitraum hat; bei Gleichstand unentschieden. Server friert Ergebnis nach festgelegter Nachprüfzeit ein und entscheidet genau einmal.
- Freundescode/Einladung ohne öffentliche Gesundheitsdaten, blockieren/melden und Einladungen abschalten können.

## 3. Stadt, Coins, Erfolge
- Die Stadt bleibt klein und freiwillig; Baupunkte bleiben von Coins getrennt.
- Wettbewerbsbelohnungen V1 nur virtuelle Abzeichen, Trophäen und besondere Deko. Keine zusätzlichen auszahlbaren Coins.
- Alle bisherigen Coins bleiben ausschließlich Demo/Spielwährung. Niemals daraus einen versprochenen Euro-/Gutscheinwert ableiten.
- Beispiel-Erfolge: erste Liga, erster Duellsieg, fünf aktive Wochen, persönliche Bestleistung. Keine riskanten Schrittziele fördern.

## 4. Navigation – fünf Tabs statt sechs
Start | Wettkämpfe | Stadt | Prämien | Profil.
Die bisherige Schritte-Detailansicht wird von „Start“ erreichbar; innerhalb von Wettkämpfe zwei Reiter: „Wochenliga“ und „Duelle“.
Wettkampftab soll freundlich und grün-golden bleiben, mit klarer Unterscheidung zwischen DEMO und echten Ranglisten.

## 5. Technische Architektur / Datenschutz
1. Vor LIVE-Multiplayer: Nutzerkonten, sicherer Login, serverseitiger Speicher (z.B. verwalteter Auth-/Datenbankanbieter), API mit Zugriffsregeln. Noch nicht implementiert.
2. In nativer iOS-App HealthKit nur nach Einwilligung lesen; Wettkampfteilnahme und Veröffentlichung des Anzeigenamens/Schritttotals getrennt und freiwillig zustimmen lassen. Datenschutzkonzept, Löschmöglichkeit, Rollen und Berechtigungen.
3. Schritte pro Wettbewerbsfenster synchronisieren. Server stellt Wettbewerbszeitraum, Mitgliedschaften, Rangfolge und Ergebnis fest. Ausschließlich lokale Werte sind manipulierbar.
4. Nicht blind auf HealthKit vertrauen: Nutzer können Datenquellen verändern und teils manuell Werte hinzufügen. Plausibilitätskontrollen, Quelle/Metadaten soweit technisch und datenschutzrechtlich möglich, Dubletten-/Korrekturbehandlung, Sperr-/Einspruchsprozess. Kein vermeintlich „betrugssicheres“ Versprechen.
5. iPhone und Apple Watch nicht doppelt zählen; HealthKit hat eigene Aggregationsmechanismen, Datenquellen und nachträgliche Korrekturen. Keine freie manuelle Eingabe in Ranglisten oder Duelle.
6. Vor Server- oder Entwicklerkosten erst lokale DEMO-Oberfläche/Regellogik mit simulierten anonymen Beispieldaten testen; KEINE erfundenen echten Mitspieler.
7. Beim Umstieg von PWA zur nativen iPhone-App lokale Datenmigration oder ausdrücklichen Neuanfang planen.
8. Für eventuelle gesponserte reale Preise später: Finanzierung im Voraus sichern, Regeln/Altersanforderungen/Steuern/Datenschutz sowie Apple App Review 5.3 prüfen. V1 komplett ohne Echtgeld.

## 6. Entitäten – später serverseitig
- Users: id, pseudonym, creation_timestamp, privacy_settings, account_status
- StepSummaries: user_id, interval_start/end UTC, steps, validation_status, updated_at; keine Roh-HealthKit-Samples länger speichern als nötig
- LeagueSeasons: id, week_start/end UTC, timezone_id, tier, group_size, status
- LeagueMemberships: user_id, league_id, score, rank, opt_in
- DuelInvites: sender_id, receiver_id, status, expires_at
- Duels: id, player_a, player_b, start/end UTC, two validated scores, status, result
- Achievements: user_id, achievement_id, earned_at
- Audit: serverseitig auswertbare, datensparsame Änderungen an Wertungsständen und Gewinnen

## 7. Konkrete erste Freigabe-Kriterien
- Ligenstart/-ende korrekt, inklusive Sommerzeitwechsel; Serverzeit statt manipuliertem Handyzeitpunkt.
- Rangliste bei Gleichstand, neuem Spieler, 0 Schritten, späten Korrekturen und mehreren Geräten konsistent.
- Duellstart nur nach Annahme, Schritte vor Start zählen nicht, Ergebnis nur einmal zu vergeben.
- Ablehnen/Blockieren/Datenschutzauswahl funktioniert.
- Keine Geldprämie, keine echte Rangliste mit Demodaten, keine Gesundheitsdaten an Werbenetzwerke.
- App-Performance und iPhone-Bedienbarkeit auf kleinen Displays geprüft.

## 8. Umsetzungsreihenfolge
Phase A – Design-Mock: eigener Wettkampftab, Demo-Rangliste und ein Demo-Duell mit **klar gekennzeichneten Beispieldaten**; keine Live-Gegner.
Phase B – reale native Apple-Health-Verbindung auf echtem iPhone prüfen, inklusive Intervallabfragen.
Phase C – Backend, sichere Profile, Zustimmung, Freunde und Einladungssystem.
Phase D – serverseitige Ligawertungen und Duelle, technische Missbrauchsbegrenzung und Integrationstests.
Phase E – geschlossene Beta, Auswertung und später evtl. gesponserte Belohnungen.

## Quellen und Leitplanken
- Apple HealthKit: https://developer.apple.com/documentation/healthkit
- Apple HKStatisticsCollectionQuery: https://developer.apple.com/documentation/healthkit/hkstatisticscollectionquery
- Apple Datenschutz: https://developer.apple.com/documentation/healthkit/protecting-user-privacy
- Apple App-Review-Regeln 5.3: https://developer.apple.com/app-store/review/guidelines/

Dieses Dokument ist ein Plan, nicht der Nachweis einer bereits umgesetzten Multiplayer-/Serverfunktion.
