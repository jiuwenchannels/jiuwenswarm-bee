package com.jiuwenswarm.beechat;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.util.ArrayList;

/**
 * Native voice, exposed to the web app as {@code window.AndroidVoice}:
 * Android {@link TextToSpeech} for replies and {@link SpeechRecognizer} for dictation.
 * Results are pushed back to the page via the {@code window.__beeVoice} callbacks
 * (see {@code bee/src/platform/nativeVoice.ts}).
 */
public class VoiceBridge {

    private final Context context;
    private final WebView webView;
    private final Handler main = new Handler(Looper.getMainLooper());

    private TextToSpeech tts;
    private boolean ttsReady = false;
    private SpeechRecognizer recognizer;

    public VoiceBridge(Context context, WebView webView) {
        this.context = context.getApplicationContext();
        this.webView = webView;
        this.tts =
                new TextToSpeech(
                        this.context,
                        status -> {
                            ttsReady = status == TextToSpeech.SUCCESS;
                            if (ttsReady) attachTtsListener();
                        });
    }

    private void attachTtsListener() {
        if (tts == null) return;
        tts.setOnUtteranceProgressListener(
                new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {
                        speechEvent("start");
                    }

                    @Override
                    public void onDone(String utteranceId) {
                        speechEvent("end");
                    }

                    @Override
                    public void onError(String utteranceId) {
                        speechEvent("end");
                    }

                    @Override
                    public void onRangeStart(String utteranceId, int start, int end, int frame) {
                        speechEvent("boundary");
                    }
                });
    }

    private void callJs(String js) {
        main.post(
                () -> {
                    if (webView != null) webView.evaluateJavascript(js, null);
                });
    }

    private static String quote(String value) {
        try {
            return JSONObject.quote(value == null ? "" : value);
        } catch (Exception e) {
            return "\"\"";
        }
    }

    private void speechEvent(String state) {
        callJs(
                "window.__beeVoice && window.__beeVoice.onSpeech && window.__beeVoice.onSpeech("
                        + quote(state)
                        + ")");
    }

    private void transcriptEvent(String text, boolean isFinal) {
        callJs(
                "window.__beeVoice && window.__beeVoice.onTranscript && window.__beeVoice.onTranscript("
                        + quote(text)
                        + ", "
                        + (isFinal ? "true" : "false")
                        + ")");
    }

    private void listeningEvent(String state) {
        callJs(
                "window.__beeVoice && window.__beeVoice.onListening && window.__beeVoice.onListening("
                        + quote(state)
                        + ")");
    }

    @JavascriptInterface
    public boolean available() {
        return true;
    }

    @JavascriptInterface
    public void speak(String text) {
        if (!ttsReady || tts == null || text == null || text.isEmpty()) return;
        tts.speak(text, TextToSpeech.QUEUE_ADD, null, "bee-" + System.currentTimeMillis());
    }

    @JavascriptInterface
    public void stopSpeaking() {
        if (tts != null) tts.stop();
    }

    @JavascriptInterface
    public void startListening(String lang) {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            listeningEvent("error");
            return;
        }
        main.post(
                () -> {
                    if (recognizer == null) {
                        recognizer = SpeechRecognizer.createSpeechRecognizer(context);
                        recognizer.setRecognitionListener(new Listener());
                    }
                    Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                    intent.putExtra(
                            RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                            RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                    intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                    if (lang != null && !lang.isEmpty()) {
                        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
                    }
                    try {
                        recognizer.startListening(intent);
                        listeningEvent("start");
                    } catch (Exception e) {
                        listeningEvent("error");
                    }
                });
    }

    @JavascriptInterface
    public void stopListening() {
        main.post(
                () -> {
                    if (recognizer != null) {
                        try {
                            recognizer.stopListening();
                        } catch (Exception ignored) {
                            // ignore
                        }
                    }
                    listeningEvent("end");
                });
    }

    /** Release TTS + recognizer when the host goes away. */
    public void shutdown() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
            tts = null;
        }
        if (recognizer != null) {
            recognizer.destroy();
            recognizer = null;
        }
    }

    private class Listener implements RecognitionListener {
        @Override
        public void onReadyForSpeech(Bundle params) {}

        @Override
        public void onBeginningOfSpeech() {}

        @Override
        public void onRmsChanged(float rmsdB) {}

        @Override
        public void onBufferReceived(byte[] buffer) {}

        @Override
        public void onEndOfSpeech() {}

        @Override
        public void onError(int error) {
            listeningEvent("error");
        }

        @Override
        public void onResults(Bundle results) {
            ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            String text = (matches != null && !matches.isEmpty()) ? matches.get(0) : "";
            transcriptEvent(text, true);
            listeningEvent("end");
        }

        @Override
        public void onPartialResults(Bundle partialResults) {
            ArrayList<String> matches =
                    partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            if (matches != null && !matches.isEmpty()) transcriptEvent(matches.get(0), false);
        }

        @Override
        public void onEvent(int eventType, Bundle params) {}
    }
}
