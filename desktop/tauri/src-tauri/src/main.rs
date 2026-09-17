#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! BeeChat desktop avatar (Tauri v2).
//!
//! A single always-on-top, transparent, frameless window hosts the animated
//! character AND the inline chat bubble (`index.html#avatar`). The tray can
//! still open the full chat app in its own window on demand.

use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{
    AppHandle, LogicalSize, Manager, PhysicalPosition, Size, WebviewUrl, WebviewWindowBuilder,
    WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

static CLICK_THROUGH: AtomicBool = AtomicBool::new(false);

fn state_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join("window-state.json"))
}

fn save_position(app: &AppHandle, x: i32, y: i32) {
    if let Some(path) = state_path(app) {
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        let _ = fs::write(path, format!("{{\"x\":{x},\"y\":{y}}}"));
    }
}

fn load_position(app: &AppHandle) -> Option<(i32, i32)> {
    let path = state_path(app)?;
    let raw = fs::read_to_string(path).ok()?;
    let value: serde_json::Value = serde_json::from_str(&raw).ok()?;
    let x = value.get("x")?.as_i64()? as i32;
    let y = value.get("y")?.as_i64()? as i32;
    Some((x, y))
}

fn toggle_avatar(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("avatar") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
        }
    }
}

fn open_chat(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("chat") {
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }
    let _ = WebviewWindowBuilder::new(app, "chat", WebviewUrl::App("index.html".into()))
        .title("BeeChat")
        .inner_size(460.0, 720.0)
        .min_inner_size(360.0, 520.0)
        .build();
}

fn apply_click_through(app: &AppHandle, enabled: bool) {
    CLICK_THROUGH.store(enabled, Ordering::Relaxed);
    if let Some(window) = app.get_webview_window("avatar") {
        let _ = window.set_ignore_cursor_events(enabled);
    }
}

#[tauri::command]
fn open_chat_command(app: AppHandle) {
    open_chat(&app);
}

#[tauri::command]
fn set_avatar_expanded(app: AppHandle, expanded: bool) {
    if let Some(window) = app.get_webview_window("avatar") {
        let size = if expanded {
            LogicalSize::new(380.0, 620.0)
        } else {
            LogicalSize::new(300.0, 420.0)
        };
        let _ = window.set_size(Size::Logical(size));
    }
}

#[tauri::command]
fn set_click_through(app: AppHandle, enabled: bool) {
    apply_click_through(&app, enabled);
}

// --- Offline speech-to-text (whisper.cpp) --------------------------------
//
// Mirrors the Electron shell: the webview records a 16 kHz WAV, this command
// transcribes it with a local whisper.cpp CLI. Drop `whisper-cli[.exe]` + a
// `ggml-*.bin` model into the app-config `whisper/` folder (or set
// BEE_WHISPER_BIN / BEE_WHISPER_MODEL). Absent → the UI hides push-to-talk.
//
// NOTE: not compiled/verified here (no Rust toolchain); run `cargo build`.

#[derive(serde::Serialize)]
struct TranscribeResult {
    ok: bool,
    text: Option<String>,
    error: Option<String>,
}

fn whisper_paths(app: &AppHandle) -> (PathBuf, PathBuf) {
    let bin_name = if cfg!(windows) { "whisper-cli.exe" } else { "whisper-cli" };
    let bin_override = std::env::var("BEE_WHISPER_BIN").map(PathBuf::from).ok();
    let model_override = std::env::var("BEE_WHISPER_MODEL").map(PathBuf::from).ok();

    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(dir) = std::env::var("BEE_WHISPER_DIR") {
        candidates.push(PathBuf::from(dir));
    }
    // repo-local `whisper/` (dev), then the app-config folder.
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("..").join("..").join("whisper"));
    }
    if let Ok(dir) = app.path().app_config_dir() {
        candidates.push(dir.join("whisper"));
    }

    for dir in &candidates {
        let bin = bin_override.clone().unwrap_or_else(|| dir.join(bin_name));
        let model = model_override.clone().unwrap_or_else(|| dir.join("ggml-base.bin"));
        if bin.exists() && model.exists() {
            return (bin, model);
        }
    }
    let fallback = candidates.into_iter().next().unwrap_or_else(|| PathBuf::from("whisper"));
    (
        bin_override.unwrap_or_else(|| fallback.join(bin_name)),
        model_override.unwrap_or_else(|| fallback.join("ggml-base.bin")),
    )
}

#[tauri::command]
fn voice_available(app: AppHandle) -> bool {
    let (bin, model) = whisper_paths(&app);
    bin.exists() && model.exists()
}

#[tauri::command]
fn transcribe(app: AppHandle, bytes: Vec<u8>, lang: Option<String>) -> TranscribeResult {
    let (bin, model) = whisper_paths(&app);
    if !bin.exists() || !model.exists() {
        return TranscribeResult {
            ok: false,
            text: None,
            error: Some("voice-unavailable".into()),
        };
    }
    let mut wav = std::env::temp_dir();
    wav.push(format!("bee-voice-{}.wav", std::process::id()));
    if std::fs::write(&wav, &bytes).is_err() {
        return TranscribeResult {
            ok: false,
            text: None,
            error: Some("write-failed".into()),
        };
    }
    let wav_path = wav.to_string_lossy().to_string();
    let txt_path = format!("{wav_path}.txt");

    let threads = std::thread::available_parallelism()
        .map(|n| (n.get() / 2).max(1))
        .unwrap_or(2);
    let threads = threads.to_string();

    let mut command = std::process::Command::new(&bin);
    command.args([
        "-m",
        model.to_string_lossy().as_ref(),
        "-f",
        &wav_path,
        "-l",
        lang.as_deref().unwrap_or("auto"),
        "-t",
        threads.as_str(),
        "-bs",
        "1",
        "-nt",
        "-otxt",
    ]);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    let output = command.output();

    let text = std::fs::read_to_string(&txt_path).ok();
    let _ = std::fs::remove_file(&wav);
    let _ = std::fs::remove_file(&txt_path);

    match output {
        Ok(result) if result.status.success() => match text {
            Some(value) if !value.trim().is_empty() => TranscribeResult {
                ok: true,
                text: Some(value.trim().to_string()),
                error: None,
            },
            _ => TranscribeResult {
                ok: false,
                text: None,
                error: Some("empty".into()),
            },
        },
        Ok(result) => TranscribeResult {
            ok: false,
            text: None,
            error: Some(String::from_utf8_lossy(&result.stderr).to_string()),
        },
        Err(error) => TranscribeResult {
            ok: false,
            text: None,
            error: Some(error.to_string()),
        },
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            open_chat_command,
            set_avatar_expanded,
            set_click_through,
            voice_available,
            transcribe
        ])
        .setup(|app| {
            if let Some((x, y)) = load_position(app.handle()) {
                if let Some(window) = app.get_webview_window("avatar") {
                    let _ = window.set_position(PhysicalPosition::new(x, y));
                }
            }

            let avatar_item = MenuItem::with_id(app, "avatar", "Show / hide assistant", true, None::<&str>)?;
            let chat_item = MenuItem::with_id(app, "chat", "Open full chat window", true, None::<&str>)?;
            let click_item = MenuItem::with_id(app, "click-through", "Toggle click-through", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[
                    &avatar_item,
                    &chat_item,
                    &click_item,
                    &PredefinedMenuItem::separator(app)?,
                    &quit_item,
                ],
            )?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("BeeChat")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "avatar" => toggle_avatar(app),
                    "chat" => open_chat(app),
                    "click-through" => {
                        let next = !CLICK_THROUGH.load(Ordering::Relaxed);
                        apply_click_through(app, next);
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            let hide_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyH);
            let chat_shortcut = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyB);
            let gs = app.global_shortcut();
            let _ = gs.on_shortcut(hide_shortcut, |app, _shortcut, _event| toggle_avatar(app));
            let _ = gs.on_shortcut(chat_shortcut, |app, _shortcut, _event| open_chat(app));

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "avatar" {
                if let WindowEvent::Moved(position) = event {
                    save_position(window.app_handle(), position.x, position.y);
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running the BeeChat desktop application");
}
