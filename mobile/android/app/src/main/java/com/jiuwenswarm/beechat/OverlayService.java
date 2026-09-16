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
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.Nullable;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * A real floating bee: a transparent, draggable, interactive overlay window
 * ({@code TYPE_APPLICATION_OVERLAY}) that hosts the same web avatar view as the rest of
 * BeeChat. The window content is entirely the web view — dragging and the close button
 * are drawn by the page and forwarded here via {@code window.AndroidBee}, so it looks
 * like one piece rather than native chrome stacked on the UI.
 */
public class OverlayService extends Service {

    private static final String CHANNEL_ID = "bee_overlay";
    private static final int NOTIFICATION_ID = 42;

    private static final int COLLAPSED_WIDTH_DP = 200;
    private static final int COLLAPSED_HEIGHT_DP = 260;
    private static final int EXPANDED_WIDTH_DP = 360;
    private static final int EXPANDED_HEIGHT_DP = 560;

    /** Served origin; the web build is copied to {@code assets/public/}. */
    private static final String OVERLAY_URL = "https://localhost/public/index.html#avatar";

    private WindowManager windowManager;
    private WindowManager.LayoutParams params;
    private WebView root;
    private VoiceBridge voiceBridge;

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

        WebView webView = new WebView(this);
        webView.setBackgroundColor(Color.TRANSPARENT);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Serve the bundled web build ourselves, with correct MIME types.
        webView.setWebViewClient(
                new WebViewClient() {
                    @Override
                    public WebResourceResponse shouldInterceptRequest(
                            WebView view, WebResourceRequest request) {
                        Uri uri = request.getUrl();
                        if (uri == null || !"localhost".equals(uri.getHost())) return null;
                        String path = uri.getPath();
                        if (path == null || "/".equals(path)) path = "/public/index.html";
                        String assetPath = path.startsWith("/") ? path.substring(1) : path;
                        try {
                            InputStream stream =
                                    getAssets()
                                            .open(
                                                    assetPath,
                                                    android.content.res.AssetManager
                                                            .ACCESS_STREAMING);
                            Map<String, String> headers = new HashMap<>();
                            headers.put("Access-Control-Allow-Origin", "*");
                            return new WebResourceResponse(
                                    mimeFor(assetPath), null, 200, "OK", headers, stream);
                        } catch (IOException e) {
                            return new WebResourceResponse(
                                    "text/plain", "utf-8", 404, "Not Found", new HashMap<>(), null);
                        }
                    }
                });

        webView.addJavascriptInterface(new BeeBridge(), "AndroidBee");
        voiceBridge = new VoiceBridge(getApplicationContext(), webView);
        webView.addJavascriptInterface(voiceBridge, "AndroidVoice");
        webView.loadUrl(OVERLAY_URL);
        root = webView;

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
                                | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                        PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = dp(12);
        params.y = dp(120);

        windowManager.addView(root, params);
    }

    private static String mimeFor(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html") || p.endsWith(".htm")) return "text/html";
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".json") || p.endsWith(".map")) return "application/json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".webp")) return "image/webp";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".gif")) return "image/gif";
        if (p.endsWith(".ico")) return "image/x-icon";
        if (p.endsWith(".woff2")) return "font/woff2";
        if (p.endsWith(".woff")) return "font/woff";
        if (p.endsWith(".ttf")) return "font/ttf";
        if (p.endsWith(".wasm")) return "application/wasm";
        return "application/octet-stream";
    }

    private void applyWindowUpdate(Runnable mutation) {
        main.post(
                () -> {
                    mutation.run();
                    if (root != null && windowManager != null) {
                        windowManager.updateViewLayout(root, params);
                    }
                });
    }

    private void setExpanded(boolean expanded) {
        applyWindowUpdate(
                () -> {
                    params.width = dp(expanded ? EXPANDED_WIDTH_DP : COLLAPSED_WIDTH_DP);
                    params.height = dp(expanded ? EXPANDED_HEIGHT_DP : COLLAPSED_HEIGHT_DP);
                    // Only while expanded must the window take focus, so the keyboard can appear.
                    if (expanded) {
                        params.flags &= ~WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
                    } else {
                        params.flags |= WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE;
                    }
                });
    }

    private void moveBy(float dx, float dy) {
        applyWindowUpdate(
                () -> {
                    params.x += Math.round(dx);
                    params.y += Math.round(dy);
                });
    }

    @Override
    public void onDestroy() {
        if (voiceBridge != null) {
            voiceBridge.shutdown();
            voiceBridge = null;
        }
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
            OverlayService.this.setExpanded(expanded);
        }

        @JavascriptInterface
        public void moveBy(final float dx, final float dy) {
            OverlayService.this.moveBy(dx, dy);
        }

        @JavascriptInterface
        public void close() {
            main.post(OverlayService.this::stopSelf);
        }
    }
}
