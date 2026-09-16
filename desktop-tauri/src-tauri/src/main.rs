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
            LogicalSize::new(220.0, 280.0)
        };
        let _ = window.set_size(Size::Logical(size));
    }
}

#[tauri::command]
fn set_click_through(app: AppHandle, enabled: bool) {
    apply_click_through(&app, enabled);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            open_chat_command,
            set_avatar_expanded,
            set_click_through
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
