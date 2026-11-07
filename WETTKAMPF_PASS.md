# StepGo City – Wettkampf-Pass, Stadtmünzen und Probeabo (Konzept)
Stand: 07.11.2026 · Entscheidung für den Prototyp, **noch kein echtes Abo buchbar**

## Produktentscheidung
- **Kostenlos:** Schritte anzeigen/sammeln, persönliche Ziele, Stadtmünzen verdienen, Comic-Stadt bauen, bisherige Stadt verwalten.
- **Wettkampf-Pass:** für aktive Teilnahme an Online-Wochenligen, 1-gegen-1-Duellen, später ggf. Turnieren.
- **Preisvorschlag Deutschland:** 1 Monat kostenloser Einstieg für laut Apple berechtigte Neukunden, danach **6,99 € pro Monat**, automatische Verlängerung bis zur Kündigung.
- **Aktueller Stand:** ausschließlich **informationsorientierte Abo-Vorschau** im Wettkampf-Tab. Kein Start-Button, keine Zahlung, keine echte Berechtigungsprüfung, keine Bank-/Kreditkartenabfrage und keine realen Online-Wettkämpfe.
- **Prämien und Auszahlungen:** aus Navigation und App-Oberfläche entfernt. Keine echten Preise oder Geldauszahlungen geplant, solange dazu keine neue ausdrückliche Entscheidung vorliegt. Keine Umtauschbarkeit der Münzen.

## Umstellung der Stadtwährung
- Bisherige Coin-Wallet wird als **Stadtmünzen** verwendet.
- Gebäude kosten künftig nur noch Stadtmünzen. Separate Baupunkte verschwinden aus der Benutzeroberfläche und werden für neue Käufe nicht verwendet.
- Alte gespeicherte Coins und bereits gebaute Gebäude bleiben bei der Umstellung erhalten. Bereits gekaufte Gebäude werden **nicht rückwirkend mit Coins belastet**.
- 1 Münze pro 100 bestätigte Schritte, maximal 200 Grundmünzen pro Tag; zusätzlich bestehende Tagesziel- und Meilensteinboni.
- Münzen bleiben lokal manipulierbare reine Demo-/Spielwährung und **dürfen nicht** zum Nachweis zahlungspflichtiger Abo-Rechte dienen.
- Alte Tageshistorie bleibt lesbar; aus dem früheren Punktemodell werden nicht zusätzlich Münzen gutgeschrieben (kein Double-Claim).

## Späterer Apple-Aboprozess (noch nicht umgesetzt)
1. Apple Developer Program und App Store Connect für native iPhone-App einrichten.
2. Abonnementgruppe sowie ein monatliches automatisch verlängerndes **StoreKit**-Abonnement mit Produkt-ID erstellen.
3. Kostenloses **einmonatiges Einführungsangebot** in App Store Connect für *berechtigte* Nutzer anlegen. Apple erlaubt nur ein Einführungsangebot pro Abonnementgruppe und Person; Berechtigung vor der Anzeige im Kaufdialog prüfen.
4. Vor dem Kauf klare, lokalisierte Preis-/Dauer-/Verlängerungsbedingungen, Datenschutzerklärung und Nutzungsbedingungen zeigen. **6,99 €** ist der gewünschte deutsche Zielpreis, noch kein von Apple bestätigter Live-Preis.
5. Apple StoreKit 2 für In-App-Kauf, Kündigungs-/Aboverwaltung und „Käufe wiederherstellen“ integrieren. Der kostenlose Monat wird nur über Apples bestätigten Kauf-/Einführungsangebotsstatus gewährt, **niemals über eine selbst gesetzte Handy-Uhr oder localStorage**.
6. Sicheres Backend mit Nutzerkonto, serverseitig bestätigtem Abostatus, App Store Server API + Benachrichtigungen, Ausfall-/Refund-/Widerruf-Behandlung. Wettkampf-Teilnahme für Nichtberechtigte serverseitig verweigern.
7. Freie Funktionen (Stadt und Schritte) **weiterhin ohne Kauf** erreichbar lassen. Teilnehmer können nach Abo-Ende ihre Stadt behalten.
8. Sandbox-Test, TestFlight-Test und Apple Review; automatische Verlängerung, Ende des Probeabos, Kündigung, Ablauf und „Käufe wiederherstellen“ auf echtem Gerät verifizieren.

## Rechtlich / Sicherheitsregeln
- Für digitale Wettkampf-Funktionen in der iPhone-App grundsätzlich Apples In-App-Kauf verwenden (keine unsichere externe Bezahl-URL).
- Keine über HealthKit ausgelesenen Gesundheitsdaten für Werbe-Targeting, kein Verkauf von Schrittwerten.
- Konten, Ranglisten, Schritte und Abo-Status datenschutzrechtlich getrennt betrachten; Einwilligungen und DSGVO prüfen.
- Auch für Premiumwettkämpfe keine Geldgewinnspiele, Einsätze oder Auszahlungen ohne eigenständige juristische und finanzielle Bewertung.
- Ein Abo-Button darf **erst dann als kaufbar** angezeigt werden, wenn StoreKit und Berechtigung technisch korrekt umgesetzt und geprüft sind.

## Prüfpunkte vor Einführung
- [x] Prämienreiter entfernt; Wettkampf-Demo weiter sichtbar.
- [x] Stadtmünzen statt Baupunkte für neue Gebäude verwendet; bestehender Fortschritt bleibt.
- [x] Abo-Vorschau mit 1 kostenlosem Monat und 6,99 €/Monat deutlich als **in Planung** erkennbar.
- [x] Keine Zahlung und kein Probeabo-Start in der Vorschau.
- [ ] Echte HealthKit-Daten auf iPhone testen.
- [ ] Backend für Konten, Abostatus, Ranglisten und Duelle.
- [ ] Apple-Developer- und App-Store-Connect-Einrichtung.
- [ ] StoreKit-Käufe, Trial-Berechtigung, Kündigung/Wiederherstellung und Servervalidierung.
- [ ] TestFlight/Produktprüfungen, Datenschutz- und Nutzungsbedingungen, Steuerprüfung.

## Apple-Dokumentation
- Abo-Einführungsangebote: https://developer.apple.com/help/app-store-connect/manage-subscriptions/set-up-introductory-offers-for-auto-renewable-subscriptions/
- Abo-Anforderungen: https://developer.apple.com/app-store/subscriptions/
- App Review / In-App Purchase: https://developer.apple.com/app-store/review/guidelines/
