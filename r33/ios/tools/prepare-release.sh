#!/usr/bin/env bash
# Local macOS release preparation only. No uploads, accounts, or secret material in repository.
set -euo pipefail
cd "$(dirname "$0")/../../.."
MODE="${1:-check}"
if [[ "$MODE" != check && "$MODE" != archive ]]; then echo "Usage: bash r33/ios/tools/prepare-release.sh [check|archive]" >&2; exit 2; fi
for cmd in xcodebuild xcodegen node python3; do command -v "$cmd" >/dev/null || { echo "Missing: $cmd" >&2; exit 2; }; done
if [[ "$MODE" == archive ]]; then
  : "${R33_APPLE_TEAM_ID:?Apple developer team ID required}"
  : "${R33_BUNDLE_ID:?Registered stable bundle ID required}"
  : "${R33_BUILD_NUMBER:?Increasing build number required}"
  [[ "$R33_APPLE_TEAM_ID" =~ ^[A-Z0-9]{10}$ && "$R33_BUNDLE_ID" =~ ^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$ && "$R33_BUILD_NUMBER" =~ ^[1-9][0-9]*$ ]] || { echo "Invalid team, bundle ID or build number" >&2; exit 2; }
fi
node r33/ios/tools/bundle-engine.mjs
node r33/ios/tools/bundle-smoke.mjs
python3 r33/ios/tools/icon.py
cd r33/ios
xcodegen generate
mkdir -p out
xcodebuild -version
xcrun --sdk iphoneos --show-sdk-version
if [[ "$MODE" == check ]]; then
  xcodebuild -project R33Paper.xcodeproj -scheme R33Paper -configuration Release -destination 'generic/platform=iOS' -derivedDataPath DerivedData CODE_SIGNING_ALLOWED=NO build
  echo "Unsigned physical-device architecture build only. NOT installable on an iPhone."
else
  # Developer already has an authorized local Xcode signing configuration.
  # Does not silently change provisioning or upload to Apple.
  xcodebuild -project R33Paper.xcodeproj -scheme R33Paper -configuration Release -destination 'generic/platform=iOS' -archivePath "$PWD/out/R33Paper.xcarchive" DEVELOPMENT_TEAM="$R33_APPLE_TEAM_ID" PRODUCT_BUNDLE_IDENTIFIER="$R33_BUNDLE_ID" CURRENT_PROJECT_VERSION="$R33_BUILD_NUMBER" CODE_SIGN_STYLE=Automatic archive
  APP="$PWD/out/R33Paper.xcarchive/Products/Applications/R33Paper.app"
  codesign --verify --deep --strict "$APP"
  /usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP/Info.plist"
  /usr/libexec/PlistBuddy -c 'Print :BGTaskSchedulerPermittedIdentifiers:0' "$APP/Info.plist"
  echo "Signed archive prepared. Open in Xcode Organizer for explicit App Store Connect upload."
fi
