#!/usr/bin/env bash
# StepGo City: iOS-Geraete-Archiv pruefen oder bewusst an TestFlight senden.
# "device-check" kostet keine Apple-Mitgliedschaft; erzeugt kein installierbares IPA.
# "testflight-upload" erfordert ein Apple-Developer-Team und vier GitHub-Secrets.
set -euo pipefail
umask 077

MODE="${1:-}"
case "$MODE" in
  device-check|testflight-upload) ;;
  *) echo "::error::Ungueltiger Modus: $MODE"; exit 2 ;;
esac

TEMP="${RUNNER_TEMP:-/tmp}"
ARCHIVE="$TEMP/stepgo-device.xcarchive"
PACKAGE_DIR="$TEMP/stepgo-device-packages"
BUILD_NO="${GITHUB_RUN_NUMBER:-1}"

xcodebuild -version
echo "StepGo-Modus: $MODE, Buildnummer: $BUILD_NO"

python3 scripts/run_xcode_stage.py device-resolve 420 \
  xcodebuild \
    -project ios/App/App.xcodeproj \
    -scheme App \
    -clonedSourcePackagesDirPath "$PACKAGE_DIR" \
    -resolvePackageDependencies

AUTH_ARGS=(-quiet) # Bash 3.2 + set -u kann leere Arrays nicht sicher expandieren.
KEY_DIR=""
if [[ "$MODE" == "testflight-upload" ]]; then
  for name in ASC_API_KEY_ID ASC_API_ISSUER_ID ASC_API_PRIVATE_KEY APPLE_TEAM_ID; do
    if [[ -z "${!name:-}" ]]; then
      echo "::error::GitHub-Secret $name fehlt. Nichts wird hochgeladen."
      exit 3
    fi
  done
  if [[ "$ASC_API_PRIVATE_KEY" != *"BEGIN PRIVATE KEY"* ]]; then
    echo "::error::ASC_API_PRIVATE_KEY muss den vollstaendigen Inhalt der Apple-.p8-Datei enthalten."
    exit 3
  fi
  KEY_DIR=$(mktemp -d "$TEMP/stepgo-apple-key.XXXXXX")
  trap 'rm -rf "$KEY_DIR"' EXIT
  KEY_PATH="$KEY_DIR/AuthKey_${ASC_API_KEY_ID}.p8"
  printf '%s\n' "$ASC_API_PRIVATE_KEY" > "$KEY_PATH"
  chmod 600 "$KEY_PATH"

  AUTH_ARGS=(
    -allowProvisioningUpdates
    -authenticationKeyPath "$KEY_PATH"
    -authenticationKeyID "$ASC_API_KEY_ID"
    -authenticationKeyIssuerID "$ASC_API_ISSUER_ID"
  )
  echo "Apples automatische Signierung mit temporaerem API-Schluessel."
  SIGNING_ARGS=(
    "DEVELOPMENT_TEAM=$APPLE_TEAM_ID"
    "CODE_SIGN_STYLE=Automatic"
  )
else
  SIGNING_ARGS=(
    "CODE_SIGNING_ALLOWED=NO"
  )
  echo "Kostenloser Geraete-Build ohne Apple-Signatur; nicht auf iPhones installierbar."
fi

python3 scripts/run_xcode_stage.py device-archive 780 \
  xcodebuild \
    -project ios/App/App.xcodeproj \
    -scheme App \
    -configuration Release \
    -sdk iphoneos \
    -destination 'generic/platform=iOS' \
    -archivePath "$ARCHIVE" \
    -clonedSourcePackagesDirPath "$PACKAGE_DIR" \
    -disableAutomaticPackageResolution \
    -jobs 2 \
    "CURRENT_PROJECT_VERSION=$BUILD_NO" \
    "${SIGNING_ARGS[@]}" \
    "${AUTH_ARGS[@]}" \
    archive

APP_IN_ARCHIVE="$ARCHIVE/Products/Applications/App.app"
if [[ ! -d "$APP_IN_ARCHIVE" ]]; then
  echo "::error::Kein iPhone-App-Bundle im Xcode-Archiv gefunden."
  exit 4
fi
ARCHIVE_BUNDLE=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP_IN_ARCHIVE/Info.plist")
if [[ -z "$ARCHIVE_BUNDLE" ]]; then
  echo "::error::iPhone-Archiv hat keine App-Kennung."
  exit 4
fi
echo "iPhone-Archiv geprueft: $ARCHIVE_BUNDLE"

if [[ "$MODE" == "device-check" ]]; then
  echo "GERAETE-KOMPILIERUNG ERFOLGREICH. Keine App signiert und nichts zu Apple gesendet."
  exit 0
fi

# Ein Upload findet nur bei manueller Auswahl des Modus testflight-upload statt.
EXPORT_OPTIONS="$TEMP/StepGoExportOptions.plist"
python3 - "$EXPORT_OPTIONS" <<'PY'
import os, plistlib, sys
options = {
    "method": "app-store-connect",
    "destination": "upload",
    "teamID": os.environ["APPLE_TEAM_ID"],
    "signingStyle": "automatic",
    "manageAppVersionAndBuildNumber": False,
    "uploadSymbols": True,
}
with open(sys.argv[1], "wb") as f:
    plistlib.dump(options, f)
print("Export-Einstellungen fuer TestFlight-Upload vorbereitet.")
PY

python3 scripts/run_xcode_stage.py testflight-upload 780 \
  xcodebuild \
    -exportArchive \
    -archivePath "$ARCHIVE" \
    -exportOptionsPlist "$EXPORT_OPTIONS" \
    -exportPath "$TEMP/stepgo-export" \
    "${AUTH_ARGS[@]}"

echo "APP AN APP STORE CONNECT UEBERGEBEN. Apple muss den Build noch verarbeiten."
