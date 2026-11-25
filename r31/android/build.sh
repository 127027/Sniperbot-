#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:?Android SDK fehlt}}"
PLATFORM="$SDK/platforms/android-35/android.jar"
if [ ! -f "$PLATFORM" ]; then sdkmanager "platforms;android-35" "build-tools;35.0.0"; fi
BT="$SDK/build-tools/35.0.0"
if [ ! -x "$BT/aapt2" ]; then sdkmanager "build-tools;35.0.0"; fi
OUT="$PWD/r31/android/out"
mkdir -p "$OUT/assets" "$OUT/classes" "$OUT/dex"
cp r31/android/index.html r31/android/app.js r31/android/mobile-runtime.mjs r31/android/mobile-feed.mjs r31/android/worker.html r31/android/worker.mjs "$OUT/assets/"
cp r31/telemetry.mjs r31/performance.mjs r31/web/style.css r31/policy.mjs r31/paper-engine.mjs r31/broadcast.mjs "$OUT/assets/"
sed "s/import {randomUUID} from 'node:crypto';/const randomUUID=()=>crypto.randomUUID();/" r31/device-account.mjs > "$OUT/assets/device-account.mjs"
"$BT/aapt2" link --manifest r31/android/AndroidManifest.xml -I "$PLATFORM" -A "$OUT/assets" -o "$OUT/base.apk"
javac -encoding UTF-8 -source 8 -target 8 -classpath "$PLATFORM" -d "$OUT/classes" r31/android/MainActivity.java r31/android/LocalStore.java r31/android/WebShell.java r31/android/PaperSyncService.java r31/android/UpdateBridge.java r31/android/UpdateProvider.java
"$BT/d8" --min-api 26 --lib "$PLATFORM" --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')
(cd "$OUT/dex" && zip -q "$OUT/base.apk" classes.dex)
"$BT/zipalign" -f 4 "$OUT/base.apk" "$OUT/aligned.apk"
if [ -n "${R40_SIGNING_KEYSTORE:-}" ]; then
  : "${R40_SIGNING_STORE_PASS:?missing store password}" "${R40_SIGNING_KEY_PASS:?missing key password}" "${R40_SIGNING_ALIAS:?missing alias}"
  SIGN="$R40_SIGNING_KEYSTORE"; STORE="$R40_SIGNING_STORE_PASS"; KEY="$R40_SIGNING_KEY_PASS"; ALIAS="$R40_SIGNING_ALIAS"
else
  SIGN="$OUT/test-signing.jks"; STORE=android; KEY=android; ALIAS=r31paper
  if [ ! -f "$SIGN" ]; then keytool -genkeypair -keystore "$OUT/test-signing.jks" -storepass android -keypass android -alias r31paper -keyalg RSA -keysize 2048 -validity 3650 -dname "CN=R31 Paper Test" >/dev/null 2>&1; fi
fi
export STORE KEY
"$BT/apksigner" sign --ks "$SIGN" --ks-key-alias "$ALIAS" --ks-pass env:STORE --key-pass env:KEY --out "$OUT/R31-Paper-Android.apk" "$OUT/aligned.apk"
"$BT/apksigner" verify --verbose "$OUT/R31-Paper-Android.apk"
"$BT/aapt2" dump badging "$OUT/R31-Paper-Android.apk" > "$OUT/badging.txt"
head -12 "$OUT/badging.txt"
(cd "$OUT" && sha256sum R31-Paper-Android.apk > SHA256SUMS.txt)
