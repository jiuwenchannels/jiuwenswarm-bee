package com.jiuwenswarm.beechat;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

/**
 * A real floating bee: a transparent, draggable, interactive overlay window
 * ({@code TYPE_APPLICATION_OVERLAY}) that hosts the same web avatar view as the rest of
 * BeeChat. Unlike Picture-in-Picture, the window is fully interactive — the inline chat
 * and soft keyboard work — so the bee behaves like the desktop pet.
 */
public class OverlayService extends Service {

    private static final String CHANNEL_ID = "bee_overlay";
    private static final int NOTIFICATION_ID = 42;

    private static final int COLLAPSED_WIDTH_DP = 200;
    private static final int COLLAPSED_HEIGHT_DP = 260;
    private static final int EXPANDED_WIDTH_DP = 360;
    private static final int EXPANDED_HEIGHT_DP = 560;

    private WindowManager windowManager;
    private WindowManager.LayoutParams params;
    private LinearLayout root;
    private WebView webView;

    private final Handler main = new Handler(Looper.getMainLooper());

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        startForegroundNotification();
        createOverlay();
    }

    private void startForegroundNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel =
                    new NotificationChannel(
                            CHANNEL_ID, "BeeChat overlay", NotificationManager.IMPORTANCE_LOW);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }

        PendingIntent contentIntent =
                PendingIntent.getActivity(
                        this,
                        0,
                        new Intent(this, MainActivity.class),
                        PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Notification.Builder builder =
                (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                        ? new Notification.Builder(this, CHANNEL_ID)
                        : new Notification.Builder(this);
        Notification notification =
                builder.setContentTitle("BeeChat")
                        .setContentText("Buzz is floating")
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentIntent(contentIntent)
                        .setOngoing(true)
                        .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private int dp(int value) {
        return (int)
                TypedValue.applyDimension(
                        TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics());
    }

    private void createOverlay() {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        // Native drag handle with a close affordance (the web grip can't drag on Android).
        FrameLayout handle = new FrameLayout(this);
        GradientDrawable handleBg = new GradientDrawable();
        handleBg.setColor(0x33000000);
        handleBg.setCornerRadii(new float[] {dp(12), dp(12), dp(12), dp(12), 0, 0, 0, 0});
        handle.setBackground(handleBg);

        TextView close = new TextView(this);
        close.setText("\u00d7");
        close.setTextColor(Color.WHITE);
        close.setTextSize(16);
        close.setPadding(dp(10), 0, dp(12), 0);
        handle.addView(
                close,
                new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.WRAP_CONTENT,
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        Gravity.END | Gravity.CENTER_VERTICAL));
        close.setOnClickListener(v -> stopSelf());

        root.addView(
                handle,
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, dp(28)));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.TRANSPARENT);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Serve the bundled web build at https://localhost/public/... (Capacitor's scheme).
        final WebViewAssetLoader assetLoader =
                new WebViewAssetLoader.Builder()
                        .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                        .build();
        webView.setWebViewClient(
                new WebViewClientCompat() {
                    @Override
                    public WebResourceResponse shouldInterceptRequest(
                            WebView view, WebResourceRequest request) {
                        return assetLoader.shouldInterceptRequest(request.getUrl());
                    }
                });
        webView.addJavascriptInterface(new BeeBridge(), "AndroidBee");
        webView.loadUrl("https://localhost/public/index.html#avatar");

        root.addView(
                webView,
                new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));

        int overlayType =
                (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE;

        params =
                new WindowManager.LayoutParams(
                        dp(COLLAPSED_WIDTH_DP),
                        dp(COLLAPSED_HEIGHT_DP),
                        overlayType,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                        PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = dp(12);
        params.y = dp(120);

        windowManager.addView(root, params);

        handle.setOnTouchListener(
                new View.OnTouchListener() {
                    private int startX;
                    private int startY;
                    private float touchX;
                    private float touchY;

                    @Override
                    public boolean onTouch(View v, MotionEvent event) {
                        switch (event.getActionMasked()) {
                            case MotionEvent.ACTION_DOWN:
                                startX = params.x;
                                startY = params.y;
                                touchX = event.getRawX();
                                touchY = event.getRawY();
                                return true;
                            case MotionEvent.ACTION_MOVE:
                                params.x = startX + (int) (event.getRawX() - touchX);
                                params.y = startY + (int) (event.getRawY() - touchY);
                                windowManager.updateViewLayout(root, params);
                                return true;
                            default:
                                return false;
                        }
                    }
                });
    }

    private void setExpanded(boolean expanded) {
        params.width = dp(expanded ? EXPANDED_WIDTH_DP : COLLAPSED_WIDTH_DP);
        params.height = dp(expanded ? EXPANDED_HEIGHT_DP : COLLAPSED_HEIGHT_DP);
        // Only while expanded must the window take focus, so the soft keyboard can appear.
        if (expanded) {
            params.flags &= ~WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
        } else {
            params.flags |= WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
        }
        windowManager.updateViewLayout(root, params);
    }

    @Override
    public void onDestroy() {
        if (root != null && windowManager != null) {
            windowManager.removeView(root);
            root = null;
        }
        super.onDestroy();
    }

    /** Exposed to the web app as {@code window.AndroidBee} (see platform/desktop.ts). */
    private class BeeBridge {
        @JavascriptInterface
        public void setExpanded(final boolean expanded) {
            main.post(() -> OverlayService.this.setExpanded(expanded));
        }

        @JavascriptInterface
        public void close() {
            main.post(OverlayService.this::stopSelf);
        }
    }
}
