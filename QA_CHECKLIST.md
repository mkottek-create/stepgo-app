# StepGo City – Prüfplan vor öffentlicher Veröffentlichung

Stand: 07.11.2026 · Wettkampf- und Stadt-Prototyp, keine Echtgeld-Prämien und keine echte Abo-Abrechnung.

## Bereits nachweisbar geprüft

- [x] Automatische JavaScript-Syntaxprüfung auf GitHub Actions (Workflow erfolgreich).
- [x] 11 automatische Funktionstests auf GitHub Actions erfolgreich (Run 42274935198).
- [x] Schritt-Coins für 4.642 Schritte und 10.000 Schritte.
- [x] Tagesziel-Bonus, Meilenstein-Boni und Obergrenzen bei 100.000 Schritten.
- [x] Einmalige Tagesbestätigung, keine doppelte Gutschrift desselben Tages.
- [x] Stadtmünzen als einzige Bauwährung: Gebäude ziehen Münzen ab, kein doppelter Kauf, kein negativer Kontostand; bereits gebaute Gebäude bleiben.
- [x] Manuelle Health-Eingabe: gültige und ungültige Schritte.
- [x] Neue Schrittzahl nach Tagesbestätigung führt nicht zu weiteren Coins.
- [x] Löschen aller Testdaten setzt jetzt auch die Stadt zurück (Fehler korrigiert).
- [x] Tageswechsel erhält Guthaben und Stadt, setzt die heutigen Schritte auf 0.
- [x] Alte Bestätigungen können weiterhin angezeigt werden.
- [x] Einfache Quelltextprüfung nach privaten Schlüsseln im GitHub-Workflow. **Kein vollständiger Geheimnis- oder Sicherheitsscan.**

## Kritische Punkte – vor echten Online-Wettkämpfen oder Abos unbedingt lösen

- [ ] Nutzerkonten / Authentifizierung und sichere Wiederherstellung nach Gerätewechsel.
- [ ] Serverseitige, manipulationsgeschützte Schritte-/Wettkampfwertungen und sichere Abonnementsberechtigung.
- [ ] Missbrauchsschutz gegen Fake-Schritte, manipulierte lokale Daten und Mehrfachkonten.
- [ ] Monatlichen Wettkampf-Pass mit Apple StoreKit einführen: 1 Monat Probezeit für berechtigte Personen, danach gewünschter Preis von 6,99 €/Monat, inklusive Verwaltung/Wiederherstellung und Servervalidierung.
- [ ] Datenschutzkonzept, Einwilligungen, Datenminimierung und Datenschutzerklärung; insbesondere Gesundheitsdaten.
- [ ] Sichere API-Kommunikation, Rate-Limits, Zugriffsberechtigungen, serverseitige Validierung und Protokollierung.
- [ ] Abhängigkeiten prüfen, Sicherheitsupdates und eine professionelle Sicherheitsprüfung.
- [ ] Datensicherung, Migration vom Web-App-Speicher zur nativen iPhone-App und Wiederherstellung.

- [x] Prämien- und Auszahlungsbereich aus der App entfernt; Stadtmünzen statt Baupunkte für neue Gebäudekäufe.
- [x] Wettkampf-Pass ist eine reine Informationsvorschau; kein Probeabo oder Kauf wird ausgelöst.
- [x] 20 Web-Funktionstests bestanden (Run 42361450123).
- [ ] TestFlight: Apple-In-App-Kauf, Probezeit, Preisanzeige, Abo-Ende, Kündigung und Wiederherstellung auf echtem iPhone testen.

## Technische / praktische Tests – noch offen

- [x] iOS-Simulator-Build erfolgreich (GitHub-Lauf 42288817938).
- [x] App im iPhone-Simulator installiert, gestartet und Screenshot gesichert (Lauf 42288817938).
- [x] Unsignierten Release-Build fuer echtes iPhone (arm64) erfolgreich kompiliert (GitHub-Lauf 42296727114). Zusatzpruefung des Archiv-Bundles folgt separat.
- [ ] Apple-signiertes Archiv zu TestFlight hochladen; erfordert Apple-Developer-Mitgliedschaft und App-Store-Connect-Einrichtung.
- [ ] Installation und Start auf einem echten iPhone.
- [ ] HealthKit-Zugriff erstmals erlauben, verweigern, später widerrufen und erneut erlauben.
- [ ] Health-Schritte bei mehrfachen Geräten/Quellen, nach Mitternacht, nach Zeitzonenwechsel und bei 0 Schritten.
- [ ] Prüfen, ob die im Health-Widget angezeigte Schrittzahl mit der StepGo-City-Zahl übereinstimmt.
- [ ] Test mit echten Schritten über mehrere Tage, offline/online, App schließen und wieder öffnen.
- [ ] Leistungsaufnahme, Ladezeit, Akkubelastung und Speicherverbrauch auf älteren iPhones.
- [ ] Bedienbarkeit, Schriftgrößen, VoiceOver, Barrierefreiheit, kleine Displays und Fehlerhinweise.
- [ ] Installation, Updates, Löschung, Datenspeicherung und Wiederherstellung auf iPhone.
- [ ] Test mit weiteren Testpersonen und strukturiertes Fehlerprotokoll.
- [ ] End-to-End-Prüfung der echten Belohnungen erst nach späterer sicherer Serveranbindung.

## Veröffentlichungs-Gate

**Aktuell ausschließlich Demo ohne echte Online-Wettkämpfe, Abo-Buchung oder Geldpreise.** Vor einem öffentlichen Online-Start müssen Konten, Serverseite und Aboberechtigungen funktionieren. Sicherheit ist durch automatisierte Tests nicht garantiert; weitere manuelle und möglichst unabhängige Prüfungen sind erforderlich.

Prüfnachweis: https://github.com/mkottek-create/stepgo-app/actions/runs/42274935198
