package com.jiuwenswarm.beechat;

import android.Manifest;
import android.app.PictureInPictureParams;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Rational;

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

    private static boolean overlayPermissionRequested = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestOverlayPermissionOnce();
        requestNotificationPermissionOnce();
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
