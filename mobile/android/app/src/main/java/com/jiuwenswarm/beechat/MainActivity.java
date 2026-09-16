package com.jiuwenswarm.beechat;

import android.app.PictureInPictureParams;
import android.os.Build;
import android.util.Rational;

import com.getcapacitor.BridgeActivity;

/**
 * BeeChat avatar host.
 *
 * The app opens straight into the avatar view (see the web app's native default) and
 * shrinks into a Picture-in-Picture window when the user leaves it, so the bee keeps
 * floating over other apps.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        enterPip();
    }

    private void enterPip() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        try {
            // Tall, portrait window to match the avatar character.
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
