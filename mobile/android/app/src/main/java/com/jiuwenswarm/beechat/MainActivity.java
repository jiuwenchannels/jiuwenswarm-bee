package com.jiuwenswarm.beechat;

import android.Manifest;
import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.util.Rational;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

/**
 * BeeChat avatar host.
 *
 * The app opens straight into the avatar view. When the user leaves it, the bee keeps
 * floating: as a fully interactive {@link OverlayService} window if the "display over
 * other apps" permission is granted, otherwise as a Picture-in-Picture fallback.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "BeeChat";

    private static boolean overlayPermissionRequested = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (tryLaunchOverlay()) return;

        // Missing the overlay or mic permission: keep the activity on screen so
        // the system dialogs can actually be answered, then close once granted.
        requestOverlayPermissionOnce();
        requestNotificationPermissionOnce();
        requestAudioPermissionOnce();
        installVoiceBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Catches the grant coming back from a dialog or the overlay-settings screen.
        tryLaunchOverlay();
    }

    /** Start the floating bee and close the activity, once we are allowed to. */
    private boolean tryLaunchOverlay() {
        boolean overlay = Settings.canDrawOverlays(this);
        boolean audio = hasAudioPermission();
        Log.d(TAG, "tryLaunchOverlay overlayPermission=" + overlay + " recordAudio=" + audio);
        if (!overlay || !audio) return false;
        if (!startOverlayService()) return false;
        Log.d(TAG, "launching avatar-only, finishing activity");
        finishAndRemoveTask();
        return true;
    }

    private boolean hasAudioPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED;
    }

    /** Expose native TTS + speech recognition to the web app as `window.AndroidVoice`. */
    private void installVoiceBridge() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.addJavascriptInterface(new VoiceBridge(this, webView), "AndroidVoice");
            }
        } catch (Exception ignored) {
            // Voice bridge is optional.
        }
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (Settings.canDrawOverlays(this) && startOverlayService()) {
            return;
        }
        enterPip();
    }

    private boolean startOverlayService() {
        try {
            Intent intent = new Intent(this, OverlayService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent);
            } else {
                startService(intent);
            }
            return true;
        } catch (Exception e) {
            // Android 12+ can refuse a background foreground-service start; use PiP then.
            return false;
        }
    }

    private void requestOverlayPermissionOnce() {
        if (overlayPermissionRequested || Settings.canDrawOverlays(this)) return;
        overlayPermissionRequested = true;
        try {
            Intent intent =
                    new Intent(
                            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        } catch (Exception ignored) {
            // PiP fallback still works without the permission.
        }
    }

    private void requestNotificationPermissionOnce() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this, new String[] {Manifest.permission.POST_NOTIFICATIONS}, 1001);
        }
    }

    private void requestAudioPermissionOnce() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this, new String[] {Manifest.permission.RECORD_AUDIO}, 1002);
        }
    }

    private void enterPip() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            PictureInPictureParams params =
                    new PictureInPictureParams.Builder()
                            .setAspectRatio(new Rational(3, 4))
                            .build();
            enterPictureInPictureMode(params);
        } catch (Exception ignored) {
            // PiP may be unavailable in some states/devices.
        }
    }
}
