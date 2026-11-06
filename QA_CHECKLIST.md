# StepGo City – Prüfplan vor öffentlicher Veröffentlichung

Stand: 06.11.2026 · Prototyp, noch keine Echtgeld-Prämien.

## Bereits nachweisbar geprüft

- [x] Automatische JavaScript-Syntaxprüfung auf GitHub Actions (Workflow erfolgreich).
- [x] 11 automatische Funktionstests auf GitHub Actions erfolgreich (Run 42274935198).
- [x] Schritt-Coins für 4.642 Schritte und 10.000 Schritte.
- [x] Tagesziel-Bonus, Meilenstein-Boni und Obergrenzen bei 100.000 Schritten.
- [x] Einmalige Tagesbestätigung, keine doppelte Gutschrift desselben Tages.
- [x] Baupunkte für bestätigte Schritte, Gebäudekauf ohne Coin-Verbrauch, Kauf nicht doppelt möglich.
- [x] Manuelle Health-Eingabe: gültige und ungültige Schritte.
- [x] Neue Schrittzahl nach Tagesbestätigung führt nicht zu weiteren Coins.
- [x] Löschen aller Testdaten setzt jetzt auch die Stadt zurück (Fehler korrigiert).
- [x] Tageswechsel erhält Guthaben und Stadt, setzt die heutigen Schritte auf 0.
- [x] Alte Bestätigungen können weiterhin angezeigt werden.
- [x] Einfache Quelltextprüfung nach privaten Schlüsseln im GitHub-Workflow. **Kein vollständiger Geheimnis- oder Sicherheitsscan.**

## Kritische Punkte – vor echten Belohnungen unbedingt lösen

- [ ] Nutzerkonten / Authentifizierung und sichere Wiederherstellung nach Gerätewechsel.
- [ ] Serverseitiges, manipulationsgeschütztes Buchungssystem für Coins und Auszahlungen.
- [ ] Missbrauchsschutz gegen Fake-Schritte, manipulierte lokale Daten und Mehrfachkonten.
- [ ] Sauberes Geschäftsmodell, nachvollziehbarer Coin-Wert, Auszahlungs- und Gutscheinbedingungen.
- [ ] Datenschutzkonzept, Einwilligungen, Datenminimierung und Datenschutzerklärung; insbesondere Gesundheitsdaten.
- [ ] Sichere API-Kommunikation, Rate-Limits, Zugriffsberechtigungen, serverseitige Validierung und Protokollierung.
- [ ] Abhängigkeiten prüfen, Sicherheitsupdates und eine professionelle Sicherheitsprüfung.
- [ ] Datensicherung, Migration vom Web-App-Speicher zur nativen iPhone-App und Wiederherstellung.

## Technische / praktische Tests – noch offen

- [ ] macOS-iOS-Simulator-Build erfolgreich (Cloud-Build derzeit noch nicht bestätigt).
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

**Keine echten Geld-/Gutschein-Prämien und kein öffentlicher Launch**, solange die kritischen Punkte nicht erledigt sind. Auch nach automatischen Tests ist Sicherheit nicht garantiert; eine zusätzliche manuelle und möglichst unabhängige Sicherheitsprüfung ist erforderlich.

Prüfnachweis: https://github.com/mkottek-create/stepgo-app/actions/runs/42274935198
