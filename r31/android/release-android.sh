#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
: "${R40_SIGNING_KEYSTORE:?Persistent private keystore required}" "${R40_SIGNING_STORE_PASS:?}" "${R40_SIGNING_KEY_PASS:?}" "${R40_SIGNING_ALIAS:?}" "${R43_CERT_SHA256:?Pinned certificate SHA-256 required}"
[[ "$R43_CERT_SHA256" =~ ^[a-f0-9]{64}$ ]] || { echo INVALID_CERT_PIN; exit 1; }
[[ -f "$R40_SIGNING_KEYSTORE" ]] || { echo KEYSTORE_MISSING; exit 1; }
# Never fall back to an ephemeral test certificate in release mode.
R43_RELEASE=1 bash r31/android/build.sh
OUT=r31/android/out
BT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:?}}/build-tools/35.0.0"
"$BT/apksigner" verify --verbose --print-certs "$OUT/R31-Paper-Android.apk" > "$OUT/release-cert.txt"
actual="$(sed -n 's/^Signer #1 certificate SHA-256 digest: //p' "$OUT/release-cert.txt")"
[[ "$actual" == "$R43_CERT_SHA256" ]] || { echo SIGNER_MISMATCH; exit 1; }
[[ "$(grep -c '^Signer #[0-9]* certificate SHA-256 digest:' "$OUT/release-cert.txt")" == 1 ]] || { echo UNEXPECTED_SIGNER_COUNT; exit 1; }
node --input-type=module - "$OUT" "$actual" <<'NODE'
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const [out,cert]=process.argv.slice(2);
const apk=readFileSync(out+'/R31-Paper-Android.apk'),badging=readFileSync(out+'/badging.txt','utf8'),v=JSON.parse(readFileSync('r31/version.json','utf8'));
const match=badging.match(/^package: name='com\.r31\.paperbot' versionCode='([0-9]+)' versionName='([^']+)'/m);
if(!match||Number(match[1])!==v.version||v.mode!=='PAPER_ONLY')throw Error('RELEASE_PACKAGE_VERSION_MISMATCH');
writeFileSync(out+'/release-metadata.json',JSON.stringify({package:'com.r31.paperbot',version_code:v.version,version_name:match[2],sha256:createHash('sha256').update(apk).digest('hex'),bytes:apk.length,certificate_sha256:cert,mode:'PAPER_ONLY'},null,2)+'\n');
NODE
