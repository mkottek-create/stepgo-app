#!/usr/bin/env bash
# Nur Cloud-Simulator; keine signierte iPhone-Installation.
set -euo pipefail

APP_PATH="${RUNNER_TEMP:-/tmp}/stepgo-derived/Build/Products/Debug-iphonesimulator/App.app"
SCREENSHOT="${RUNNER_TEMP:-/tmp}/stepgo-city-simulator.png"

if [[ ! -d "$APP_PATH" ]]; then
  echo "::error::Kompilierte App.app fehlt: $APP_PATH"
  exit 10
fi

echo "Info.plist der fertigen App:"
plutil -p "$APP_PATH/Info.plist" | head -80

APP_ID=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$APP_PATH/Info.plist")
if [[ -z "$APP_ID" ]]; then
  echo "::error::Bundle Identifier konnte nicht gelesen werden."
  exit 11
fi
echo "StepGo Bundle: $APP_ID"

echo "Verfuegbare iPhone-Simulatoren:"
xcrun simctl list devices available

SIMULATOR_ID=$(xcrun simctl list -j devices available | python3 -c '
import json,sys
data=json.load(sys.stdin)
devices=[d for group in data.get("devices",{}).values() for d in group
         if "iPhone" in d.get("name","") and d.get("isAvailable",True)]
if not devices:
    raise SystemExit("Kein verwendbarer iPhone-Simulator auf Cloud-Mac")
first=next((d for d in devices if d.get("state")=="Booted"),devices[0])
print(first["udid"])
')
echo "Gewaehlter Simulator: $SIMULATOR_ID"

if ! xcrun simctl list devices booted | grep -q "$SIMULATOR_ID"; then
  echo "Simulator starten ..."
  xcrun simctl boot "$SIMULATOR_ID"
fi
xcrun simctl bootstatus "$SIMULATOR_ID" -b

echo "StepGo City auf simuliertem iPhone installieren ..."
xcrun simctl install "$SIMULATOR_ID" "$APP_PATH"
echo "Installationsort:"
xcrun simctl get_app_container "$SIMULATOR_ID" "$APP_ID" app

echo "App im Simulator starten ..."
xcrun simctl launch "$SIMULATOR_ID" "$APP_ID"

echo "Startbildschirm erfassen ..."
sleep 7
xcrun simctl io "$SIMULATOR_ID" screenshot "$SCREENSHOT"
test -s "$SCREENSHOT"
echo "Screenshot unter: $SCREENSHOT"
echo "TESTINSTALLATION UND APP-START IM SIMULATOR ERFOLGREICH"
