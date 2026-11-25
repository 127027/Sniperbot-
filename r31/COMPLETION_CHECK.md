# R31 Abschlussprüfung
Stand: Android 0.2. Keine neuen Produktfunktionen. Aktiver R30-Handel bleibt unverändert; R31-Feed zunächst NOT_PUBLISHING, fünf Dots konfiguriert.
- End-to-end-Test verbindet Publisher (exakte serialisierte Bytes und echte Blob-SHA), mobilen Raw-Feed und Desktop-Feed mit separaten Paper-Konten. Kauf, HOLD, Verkauf, späterer Einstieg, Neustart, abgelaufene Signale und wiederholte Exit-Entscheidung. Ausschließlich synthetische Fixtures, nie in aktiven Feed veröffentlichen.
- Android-Emulator-Smoke: tatsächliche APK installieren, WebView-UI und Kontoerstellung prüfen, Dienst starten, Bildschirm sperren, Dienststatus prüfen, Neustart und unveränderte lokale Konto-ID prüfen. Kein Langzeit-/physischer Gerätetest.
- Live-Nachweis erst, wenn Dot5 ein echtes gültiges R31-Signal auf dem aktiven Branch publiziert und ein separates Paper-Konto es tatsächlich verarbeitet. Nicht durch künstliche Daten ersetzen. Echtgeld/PayPal bleiben gesperrt.
