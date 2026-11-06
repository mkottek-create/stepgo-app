# StepGo City auf dem eigenen iPhone installieren (TestFlight)

**Stand 06.11.2026:** Die iPhone-App wurde im GitHub-Cloud-Mac erfolgreich kompiliert, im iPhone-Simulator installiert und gestartet: [erfolgreicher Test](https://github.com/mkottek-create/stepgo-app/actions/runs/42288817938). Der Zugriff auf **echte** Apple-Health-Daten ist noch **nicht** auf einem iPhone getestet.

## 1. Was kostenlos und sofort möglich ist

Im GitHub-Repository `mkottek-create/stepgo-app`:

1. **Actions** öffnen.
2. **StepGo City - iPhone / TestFlight** auswählen.
3. **Run workflow** auswählen und **device-check** stehen lassen.
4. Den Lauf beobachten.

Dieser Modus erzeugt und prüft einen **unsignierten Build für echte iPhone-Hardware** in der GitHub-Cloud. Er wird **nicht** zu Apple hochgeladen. Ein unsignierter Build kann nicht auf deinem iPhone installiert werden.

**Die bisherige Home-Bildschirm-Web-App bleibt unverändert.**

## 2. Was für die Installation ohne eigenen Mac nötig ist

Für den direkten, bequemen Weg verwenden wir später **TestFlight**. Dafür ist eine Mitgliedschaft im **Apple Developer Program** erforderlich. Alternativ kann eine kostenlose Apple-ID nur mit Xcode auf einem Mac Apps lokal signieren und installieren; das ist bei ausschließlich iPhone-Nutzung kein praktikabler Weg.

Wir richten TestFlight **erst ein, wenn du die Mitgliedschaft selbst bewusst abgeschlossen hast**. Der Cloud-Build allein ersetzt Apples Signierung nicht.

Apple-Quellen:
- https://developer.apple.com/de/help/account/membership/programs-overview
- https://developer.apple.com/de/help/account/basics/about-your-developer-account/
- https://developer.apple.com/testflight/
- https://developer.apple.com/videos/play/wwdc2021/10204/

## 3. Apple-Konto und App einrichten, wenn du so weit bist

1. Beim Apple Developer Program anmelden.
2. Im Apple-Entwicklerportal einen eindeutigen App Identifier anlegen. Der bisherige Beispielwert `app.stepgocity.mobile` ist **noch nicht als deine registrierte Kennung bestätigt**. Dieser Wert muss in `capacitor.config.json` und im Apple-Portal **exakt übereinstimmen**. Bei einem anderen Identifier den Code zuerst anpassen.
3. Die **HealthKit**-Capability für die App-ID aktivieren (Lesen der Schrittzahl; kein Schreibzugriff).
4. In **App Store Connect** einen App-Eintrag mit **derselben** Bundle-ID erstellen. Das ist für spätere TestFlight-Uploads nötig.
5. In App Store Connect unter **Users and Access / Integrations / App Store Connect API** API-Zugriff aktivieren und einen **Team-API-Schlüssel** mit ausreichenden Rechten für Signierung und Upload erstellen. Den privaten `.p8`-Schlüssel gibt es nur einmal zum Download.
6. In deinem **privaten** GitHub-Bereich des Repositories unter **Settings → Secrets and variables → Actions** genau diese vier **Repository Secrets** hinterlegen:

| Secret | Inhalt |
|---|---|
| `APPLE_TEAM_ID` | Deine Apple Developer Team ID |
| `ASC_API_KEY_ID` | Key ID des App Store Connect Team-API-Schlüssels |
| `ASC_API_ISSUER_ID` | Issuer ID aus App Store Connect |
| `ASC_API_PRIVATE_KEY` | Vollständiger Inhalt der heruntergeladenen `.p8`-Datei inkl. BEGIN/END PRIVATE KEY |

**Niemals** Apple-ID-Passwort, .p8-Datei, Zertifikate, Tokens oder Secrets in den öffentlichen Repository-Code, Issues oder Chat kopieren. Die Angaben ausschließlich in den GitHub-Secrets speichern. Apple Developer verlangt ggf. weitere Freigaben oder Berechtigungen für die automatische Signierung; das ist noch ungetestet.

## 4. TestFlight-Upload starten (nur nach eigener Entscheidung)

1. **Actions → StepGo City - iPhone / TestFlight → Run workflow**.
2. Dieses Mal den Modus **testflight-upload** auswählen.
3. Nur wenn du die Veröffentlichung in die private Beta tatsächlich möchtest, auf **Run workflow** tippen.
4. GitHub erstellt das iPhone-Archiv mit Apple-Signierung und versucht die Übergabe an **App Store Connect**. Ohne passende Apple-Rechte und Secrets schlägt der Ablauf **ohne Upload** fehl.
5. Nach erfolgreicher Verarbeitung in **App Store Connect → TestFlight** dich als internen Tester eintragen. Externe Tester benötigen beim ersten Build normalerweise eine Apple-Beta-Prüfung.
6. Auf dem iPhone Apples **TestFlight**-App installieren, Einladung öffnen und StepGo City installieren.

**Auch ein erfolgreicher Upload bedeutet nicht sofortige TestFlight-Verfügbarkeit:** Apple muss den Build erst verarbeiten und kann weitere Angaben oder eine Beta-Prüfung verlangen.

## 5. Echte Apple-Health-Schritte prüfen

Beim ersten Start der **nativen TestFlight-App** in StepGo City Apple Health verbinden und den **Lesezugriff auf Schritte** freigeben. Danach vergleichen wir die heutigen Schritte in Apple Health und StepGo City, testen Sperren/Verweigern, Neustart und Tageswechsel. Dieser Test ist **noch offen**.

**Wichtig zur Datensicherung:** Die jetzige Home-Bildschirm-Web-App und die TestFlight-App nutzen **unterschiedliche lokale Speicher**. Test-Coins, bisherige Stadt und Schrittverlauf werden beim Umstieg **nicht automatisch übernommen**. Die vorhandene Web-App daher nicht löschen, bevor eine Datenmigration geprüft wurde. Es gibt weiterhin **nur Test-Coins, keine echten Prämien**.

## Technische Umsetzung

- Workflow: `.github/workflows/testflight.yml`
- Ablauf: `scripts/testflight-release.sh`
- iOS-Einrichtung: `scripts/configure-native-ios.rb`
- `device-check` baut ohne Signierung für **generic iOS device / arm64**.
- `testflight-upload` verwendet Apples automatische Cloud-Signierung mit einem temporären API-Schlüssel und den Xcode-Exportmodus `app-store-connect` mit `destination=upload`.
- Der Schlüssel liegt ausschließlich auf dem temporären Mac-Runner und wird beim regulären Ende entfernt. GitHub-Secrets sind ebenfalls geschützt, aber wie bei jedem CI-System muss der Zugriff auf Repository und Actions abgesichert werden.
- **Kein automatischer App-Upload bei Git-Push.** Nur die explizite manuelle Auswahl `testflight-upload` kann Apple kontaktieren.
