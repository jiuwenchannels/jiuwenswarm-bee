# BeeChat Android (Capacitor)

The floating **bee avatar** on Android, wrapping the existing web build in a native
WebView. This folder is the mobile shell only; all UI, chat, gateway, and voice logic
live in [`../bee`](../bee).

## What it does

- Loads `../bee/dist` and **opens straight into the avatar view** (`#avatar`).
- **Picture-in-Picture**: pressing Home (or the PiP button) shrinks the avatar into a
  small always-on-top window over other apps — the Android equivalent of the desktop pet.
- Talks to the JiuwenSwarm product gateway over the LAN: `ws://<pc-ip>:19000/ws`.

## Prerequisites (one-time)

Capacitor 7 needs:

- **Node 20+** (you have this)
- **JDK 21** — Capacitor 7 compiles with `sourceCompatibility 21`, so a JDK 17 default
  will fail with `invalid source release: 21`. Point `JAVA_HOME` at a JDK 21 for builds:
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
  ```
- **Android SDK** (Platform 35, Build-Tools) + **Android Studio**

Install Android Studio, then in it: SDK Manager → install *Android SDK Platform 35* and
*Android SDK Build-Tools*, and set `ANDROID_HOME` (Studio usually does this).

## Build and run

```bash
# 1. Build the web app (from the repo root)
cd bee && npm install && npm run build

# 2. Install the mobile shell deps
cd ../mobile && npm install

# 3. Copy the web build into the Android project and open it
npm run sync
npm run open            # opens Android Studio; press Run ▸

# or run directly on a connected device
npm run run:android
```

`npm run sync` = `cap sync android`, which copies `bee/dist` into
`android/app/src/main/assets/public`.

### Build an APK from the command line

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
cd mobile/android
.\gradlew.bat assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

Install it on a device / emulator:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r `
  "app\build\outputs\apk\debug\app-debug.apk"
```

Or copy the `.apk` to the phone and tap it (enable *Install unknown apps* for the
file manager).

## Gateway URL

The app connects to whatever `VITE_JIUWENSWARM_URL` was at **web build time** (set in
[`../bee/.env`](../bee/.env), e.g. `ws://192.168.86.25:19000/ws`). If your PC's IP
changes, rebuild (`npm run build:web && npm run sync`). A runtime gateway setting is a
planned follow-up so this is configurable on the device.

## Where the PiP lives

- `android/app/src/main/AndroidManifest.xml` — `android:supportsPictureInPicture="true"`
  and `android:usesCleartextTraffic="true"` on the main activity.
- `android/app/src/main/java/com/jiuwenswarm/beechat/MainActivity.java` — enters PiP on
  `onUserLeaveHint` (when the user presses Home).

## Notes / limits

- **Cleartext** is required because the gateway is `ws://` on the LAN.
- **Voice**: Web Speech synthesis is unreliable in Android WebView; native TTS is a
  follow-up.
- PiP is a system window (rounded, size-limited); it is not a free-floating overlay.
  A true transparent always-on-top overlay would need `SYSTEM_ALERT_WINDOW` and a
  foreground service.
