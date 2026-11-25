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
cp r31/android/index.html r31/android/app.js r31/android/mobile-runtime.mjs r31/android/mobile-feed.mjs "$OUT/assets/"
cp r31/web/style.css r31/policy.mjs r31/paper-engine.mjs r31/broadcast.mjs "$OUT/assets/"
sed "s/import {randomUUID} from 'node:crypto';/const randomUUID=()=>crypto.randomUUID();/" r31/device-account.mjs > "$OUT/assets/device-account.mjs"
"$BT/aapt2" link --manifest r31/android/AndroidManifest.xml -I "$PLATFORM" -A "$OUT/assets" -o "$OUT/base.apk"
javac -encoding UTF-8 -source 8 -target 8 -classpath "$PLATFORM" -d "$OUT/classes" r31/android/MainActivity.java
"$BT/d8" --min-api 26 --lib "$PLATFORM" --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')
(cd "$OUT/dex" && zip -q "$OUT/base.apk" classes.dex)
"$BT/zipalign" -f 4 "$OUT/base.apk" "$OUT/aligned.apk"
keytool -genkeypair -keystore "$OUT/test-signing.jks" -storepass android -keypass android -alias r31paper -keyalg RSA -keysize 2048 -validity 3650 -dname "CN=R31 Paper Test" >/dev/null 2>&1
"$BT/apksigner" sign --ks "$OUT/test-signing.jks" --ks-pass pass:android --key-pass pass:android --out "$OUT/R31-Paper-Android.apk" "$OUT/aligned.apk"
"$BT/apksigner" verify --verbose "$OUT/R31-Paper-Android.apk"
"$BT/aapt2" dump badging "$OUT/R31-Paper-Android.apk" | head -12
sha256sum "$OUT/R31-Paper-Android.apk" > "$OUT/SHA256SUMS.txt"
