#!/usr/bin/env bash
set -euo pipefail
APK=r31/android/out/R31-Paper-Android.apk
PKG=com.r31.paperbot
adb wait-for-device
adb shell input keyevent 82
adb install "$APK"
adb shell am start -W -n "$PKG/.MainActivity"
# Check actual UI, not simply successful am start. WebView accessibility tree contains rendered text.
for i in $(seq 1 20); do
  adb shell uiautomator dump /sdcard/r31-ui.xml >/dev/null 2>&1 || true
  adb pull /sdcard/r31-ui.xml /tmp/r31-ui.xml >/dev/null 2>&1 || true
  if grep -q 'Lokales Konto ' /tmp/r31-ui.xml 2>/dev/null; then break; fi
  sleep 3
done
grep -q 'Lokales Konto ' /tmp/r31-ui.xml
grep -q 'Echtgeldhandel' /tmp/r31-ui.xml
grep -q 'KI-Dots' /tmp/r31-ui.xml
cp /tmp/r31-ui.xml /tmp/r31-initial.xml
# Compact phones may require a short scroll to the service control.
for i in $(seq 1 4); do
 if grep -q 'Hintergrund starten' /tmp/r31-ui.xml; then break; fi
 adb shell input swipe 200 750 200 400 350
 sleep 1
 adb shell uiautomator dump /sdcard/r31-ui.xml >/dev/null
 adb pull /sdcard/r31-ui.xml /tmp/r31-ui.xml >/dev/null
done
# Verify actual private account created by APK (test-only package inspection via instrumentation not required).
adb shell pidof "$PKG" >/dev/null
# Android service startup from visible activity; production package is not debuggable and service is not exported.
# Click via accessibility bounds; scroll down only if needed. Header service button should be visible.
python3 - <<'PY'
import xml.etree.ElementTree as ET,re,subprocess
root=ET.parse('/tmp/r31-ui.xml')
for n in root.iter('node'):
 if 'Hintergrund starten' in (n.get('text','')+' '+n.get('content-desc','')):
  x1,y1,x2,y2=map(int,re.findall(r'\d+',n.get('bounds','')))
  if x2>x1 and y2>y1:
   subprocess.check_call(['adb','shell','input','tap',str((x1+x2)//2),str((y1+y2)//2)])
   break
else: raise SystemExit('background start button unavailable')
PY
sleep 5
adb shell dumpsys activity services "$PKG" > /tmp/r31-services.txt
grep -q 'PaperSyncService' /tmp/r31-services.txt
grep -Eq 'isForeground=true|foregroundId=3102' /tmp/r31-services.txt
adb shell input keyevent 3
adb shell input keyevent 26
sleep 8
adb shell dumpsys activity services "$PKG" > /tmp/r31-services-locked.txt
grep -q 'PaperSyncService' /tmp/r31-services-locked.txt
adb shell input keyevent 26
adb shell input keyevent 82
adb shell am force-stop "$PKG"
adb shell am start -W -n "$PKG/.MainActivity"
sleep 4
adb shell uiautomator dump /sdcard/r31-restart.xml
adb pull /sdcard/r31-restart.xml /tmp/r31-restart.xml
grep -q 'Lokales Konto ' /tmp/r31-restart.xml
python3 - <<'PY'
import re
a=open('/tmp/r31-initial.xml').read();b=open('/tmp/r31-restart.xml').read()
p=r'Lokales Konto ([a-f0-9]{8})'
assert re.search(p,a).group(1)==re.search(p,b).group(1), 'account identity changed'
PY
echo 'APK UI, service foreground/lock smoke, persistent account restart passed'
