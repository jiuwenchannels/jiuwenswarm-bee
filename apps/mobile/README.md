# BeeChat Android (Capacitor)

The floating **bee avatar** on Android, wrapping the existing web build in a native
WebView. This folder is the mobile shell only; all UI, chat, gateway, and voice logic
live in [`../web`](../web).

## What it does

- Loads `../web/dist` and **opens straight into the avatar view** (`#avatar`).
- **Floating overlay** (the real pet): when you leave the app, a transparent, draggable,
  fully interactive bee window stays on top of other apps. Tap the bee to expand the
  inline chat (with the soft keyboard). This is a `TYPE_APPLICATION_OVERLAY` window
  hosted by a foreground service — not a WebView-in-an-app.
- **Picture-in-Picture fallback**: if overlay permission isn't granted, leaving the app
  uses the system PiP window instead (view-only; you can't type in it).
- Talks to the JiuwenSwarm product gateway over the LAN: `ws://<pc-ip>:19000/ws`.

The first launch asks for **"Display over other apps"** (required for the overlay); deny
it and the app still works with the PiP fallback.

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
cd apps/web && npm install && npm run build

# 2. Install the mobile shell deps
cd ../mobile && npm install

# 3. Copy the web build into the Android project and open it
npm run sync
npm run open            # opens Android Studio; press Run ▸

# or run directly on a connected device
npm run run:android
```

`npm run sync` = `cap sync android`, which copies `apps/web/dist` into
`android/app/src/main/assets/public`.

### Build an APK from the command line

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.11.10-hotspot"
cd apps/mobile/android
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
[`../web/.env`](../web/.env), e.g. `ws://192.168.86.25:19000/ws`). If your PC's IP
changes, rebuild (`npm run build:web && npm run sync`). A runtime gateway setting is a
planned follow-up so this is configurable on the device.

## Where the floating window lives

- `android/app/src/main/java/com/jiuwenswarm/beechat/OverlayService.java` — the
  foreground service that adds a transparent `TYPE_APPLICATION_OVERLAY` window hosting a
  WebView at `https://localhost/public/index.html#avatar`. It resizes between collapsed
  and expanded via `window.AndroidBee.setExpanded(...)` (see `apps/web/src/platform/desktop.ts`)
  and drags by a native handle.
- `MainActivity.java` — requests the overlay + notification permissions; on
  `onUserLeaveHint` it starts `OverlayService` (if allowed) or falls back to PiP.
- `AndroidManifest.xml` — `SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE(_SPECIAL_USE)`,
  `POST_NOTIFICATIONS`, `usesCleartextTraffic`, the `specialUse` service declaration, and
  `supportsPictureInPicture` on the activity.

## Voice

`VoiceBridge.java` exposes native voice to the web app as `window.AndroidVoice`:

- **TTS** — Android `TextToSpeech`; `onRangeStart` drives the avatar's mouth. Used
  instead of the (unreliable) Web Speech synthesis in the WebView.
- **Speech recognition** — Android `SpeechRecognizer` for dictation, with partial
  results. Used instead of Web Speech recognition.

It's installed on both the main activity's WebView (`MainActivity`) and the overlay
WebView (`OverlayService`), and pushes events back through `window.__beeVoice`
(see `apps/web/src/platform/nativeVoice.ts`). The web modules `speech.ts` and
`recognition.ts` prefer it automatically when present, so the same UI gets browser
speech on the web and native speech on Android.

Requires the `RECORD_AUDIO` permission (requested on first launch).

## Notes / limits

- **Cleartext** is required because the gateway is `ws://` on the LAN.
- **Voice**: Web Speech is unreliable in the Android WebView; native TTS is a follow-up.
- The overlay needs **"Display over other apps"** and shows a **persistent notification**
  (foreground service). Play Store scrutinizes overlay apps; sideloading is fine.
- The overlay WebView is a plain WebView (no Capacitor bridge); it loads the avatar view
  directly, so Capacitor plugins aren't available there.
