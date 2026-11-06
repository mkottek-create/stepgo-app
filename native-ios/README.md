# StepGo City – direkte Apple-Health-Verbindung für iPhone

## Entwicklung ausschließlich vom iPhone: GitHub-Cloud-Mac

Ein eigener Mac ist für einen **technischen Simulator-Build-Test** nicht nötig. Ein GitHub-Actions-Workflow erzeugt auf einem Mac-Rechner in der Cloud das Capacitor-iOS-Projekt, fügt den HealthKit-Code hinzu und versucht einen Build **ohne Apple-Signatur**.

1. Vom iPhone aus das GitHub-Repository öffnen.
2. Den Reiter **Actions** auswählen.
3. **StepGo City - iOS Build-Check** öffnen und die Ausführung ansehen.
4. Bei Bedarf über **Run workflow** einen neuen Build-Test starten.

Workflow-Datei: `.github/workflows/ios-build-check.yml`.

**Der Build-Test ist KEINE installierbare iPhone-App.** Er kompiliert zunächst nur für den iOS-Simulator. Erst mit passender Apple-Signierung, Provisioning, eindeutigem App-Identifier und TestFlight-/Distributions-Setup kann daraus ein auf dem eigenen iPhone installierbarer Build werden. Ein Apple Developer Program ist für TestFlight/öffentliche Verteilung erforderlich.

Die Home-Bildschirm-Web-App bleibt unverändert. Vor einem späteren Umstieg müssen gespeicherte lokale Daten migriert oder explizit neu gestartet werden.

### Technische Notiz

Das Ruby-Skript `scripts/configure-native-ios.rb` bindet die beiden HealthKit-Swift-Klassen in das frische Xcode-Projekt ein, setzt die HealthKit-Entitlement und die Datenschutz-Beschreibung. Die native JavaScript-Oberfläche verwendet `window.Capacitor.Plugins.StepGoHealth`, nur wenn der Plugin-Proxy im nativen Container vorhanden ist.


## Status

HealthKit-Code und die JavaScript-Schnittstelle sind im Repository vorbereitet. Es ist noch **keine native iOS-App gebaut oder installiert**. Die GitHub-Pages-Webseite kann Apple Health nicht selbst lesen.

## Voraussetzung

- Ein Mac mit Xcode, Node.js und npm.
- Ein iPhone mit Schrittaufzeichnungen in Apple Health.
- Eine Apple-ID für Entwicklung; für App Store/TestFlight später Apple Developer Program.
- HealthKit-Capability und Lesen-Berechtigung für Schrittzahlen.

## Schritt 1: iOS-Projekt erzeugen

Vom Repository-Stamm im Terminal:

    npm install
    npm run ios:init
    npm run ios:open

Nach Änderungen an Web-Dateien:

    npm run ios:sync

## Schritt 2: In Xcode konfigurieren

1. Die beiden Dateien native-ios/StepGoHealthPlugin.swift und native-ios/StepGoBridgeViewController.swift dem App-Target in Xcode hinzufügen (Target Membership prüfen).
2. Im Start-ViewController unter ios/App/App/Base.lproj/Main.storyboard den Klassennamen von CAPBridgeViewController auf StepGoBridgeViewController und das Modul auf App (bzw. den tatsächlichen Modulnamen) ändern.
3. Im App-Target unter Signing & Capabilities die HealthKit-Capability hinzufügen.
4. Im App-Target unter Info die Zeichenkette NSHealthShareUsageDescription hinzufügen, z. B.: StepGo City liest deine heutigen Schritte, damit du deinen Fortschritt, Test-Coins und Baupunkte sehen kannst.
5. Die temporäre Bundle-ID app.stepgocity.mobile in capacitor.config.json und im Xcode-Target auf eine eigene eindeutige Bundle-ID anpassen.
6. Signing-Team wählen, echtes iPhone anschließen/auswählen und die App installieren.
7. In der nativen StepGo-City-App auf Apple Health verbinden tippen und Lesen von Schritten erlauben.

## Was danach passiert

- Der Nutzer erteilt einmalig in iOS die Erlaubnis. Danach werden die Schritte beim Öffnen der nativen App und nach einem Wechsel zurück zur App aktualisiert.
- Es ist kein Kurzbefehl, kein Kopieren und kein Einfügen nötig.
- Der Zugriff beschränkt sich auf die Zahl der Schritte des aktuellen Kalendertags. Kein Puls, kein Standort und kein Schreibzugriff.
- Bei ausbleibender Lesefreigabe darf HealthKit aus Datenschutzgründen keine präzise Information darüber geben, dass abgelehnt wurde. Eine Abfrage kann dann 0 zurückgeben. Deshalb überschreibt die App vorhandene Schritte nicht mit unerwarteten 0.
- Die Berechnung von Test-Coins und Baupunkten bleibt wie zuvor. Bereits bestätigte Tage werden nicht doppelt gutgeschrieben.
- Die native App und die bisherige Home-Bildschirm-Web-App haben **getrennte lokale Datenspeicher**. Bestehende Test-Coins werden deshalb bei einer Neuinstallation der nativen App nicht automatisch übertragen. Vor einem späteren Wechsel zur produktiven App ist ein Migrations- oder Benutzerkonto-Konzept nötig.
- Es gibt weiterhin keine echten Prämien oder Auszahlungen. Für geldwerte Auszahlungen braucht das Projekt insbesondere Serverprüfung, Missbrauchsschutz, Konten und rechtliche Prüfung.

## Referenzen

- HealthKit: https://developer.apple.com/documentation/healthkit
- Capacitor iOS: https://capacitorjs.com/docs/ios
- Capacitor iOS eigener nativer Code: https://capacitorjs.com/docs/ios/custom-code

## Wichtig

Die Seite https://mkottek-create.github.io/stepgo-app/ bleibt eine Web-App. Sie erhält durch die hier vorbereiteten Dateien **keine** direkte Apple-Health-Berechtigung. Dafür muss die iOS-Version in Xcode gebaut, signiert und auf dem iPhone installiert werden.
