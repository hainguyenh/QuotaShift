use tauri::{AppHandle, Emitter, Manager};

use crate::types::FullStatus;
use crate::{get_state, logger};

pub fn format_tooltip(status: &FullStatus) -> String {
    if let Some(codex) = &status.monitored_codex {
        let mut line = format!("Codex\n{}", codex.label);
        if let Some(p) = codex.primary_percent {
            line.push_str(&format!(": {}%", p));
            if let Some(s) = codex.secondary_percent {
                line.push_str(&format!("/{}%", s));
            }
        } else {
            line.push_str(": —");
        }
        line
    } else {
        let gemini = status
            .quotas
            .iter()
            .find(|q| q.model.contains("Gemini") || q.model.to_lowercase().contains("google"));
        let claude_openai = status.quotas.iter().find(|q| {
            q.model.contains("Claude")
                || q.model.contains("OpenAI")
                || q.model.to_lowercase().contains("gpt")
        });

        let mut lines = vec!["Antigravity".to_string()];

        match gemini {
            Some(q) => {
                let fh = q
                    .five_hour_percent
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "?".to_string());
                let wk = q
                    .weekly_percent
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "?".to_string());
                lines.push(format!("Google Gemini: {}%/{}%", fh, wk));
            }
            None => {
                lines.push("Google Gemini: —".to_string());
            }
        }

        match claude_openai {
            Some(q) => {
                let fh = q
                    .five_hour_percent
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "?".to_string());
                let wk = q
                    .weekly_percent
                    .map(|v| v.to_string())
                    .unwrap_or_else(|| "?".to_string());
                lines.push(format!("Claude & OpenAI: {}%/{}%", fh, wk));
            }
            None => {
                lines.push("Claude & OpenAI: —".to_string());
            }
        }

        lines.join("\n")
    }
}

pub async fn poll_and_update_tray(app_handle: &tauri::AppHandle) -> Result<(), String> {
    let res = crate::quota::fetch_full_status_internal().await;
    match res {
        Ok(mut status) => {
            let monitored_codex = {
                let state = get_state().lock().unwrap();
                state.monitored_codex.clone()
            };
            status.monitored_codex = monitored_codex;
            {
                let mut state = get_state().lock().unwrap();
                state.last_status = Some(status.clone());
            }
            let _ = app_handle.emit("status-updated", &status);
            let tooltip = format_tooltip(&status);
            if let Some(tray) = app_handle.tray_by_id("main") {
                let _ = tray.set_tooltip(Some(tooltip));
            }
            Ok(())
        }
        Err(_) => {
            let monitored_codex = {
                let state = get_state().lock().unwrap();
                state.monitored_codex.clone()
            };
            let status = FullStatus {
                credits: None,
                quotas: Vec::new(),
                plan_tier: None,
                recently_used_model: None,
                monitored_codex,
                email: None,
                online: false,
                source: None,
                accuracy: None,
            };
            let _ = app_handle.emit("status-updated", &status);
            if let Some(tray) = app_handle.tray_by_id("main") {
                let tooltip = if status.monitored_codex.is_some() {
                    format_tooltip(&status)
                } else {
                    "QuotaShift: offline\n⚠️ Language server not reachable.".to_string()
                };
                let _ = tray.set_tooltip(Some(tooltip));
            }
            Err("Offline".to_string())
        }
    }
}

pub fn update_tray_only(app_handle: &tauri::AppHandle) {
    let (status_opt, monitored_codex) = {
        let state = get_state().lock().unwrap();
        (state.last_status.clone(), state.monitored_codex.clone())
    };

    let mut status = status_opt.unwrap_or(FullStatus {
        credits: None,
        quotas: Vec::new(),
        plan_tier: None,
        recently_used_model: None,
        monitored_codex: monitored_codex.clone(),
        email: None,
        online: false,
        source: None,
        accuracy: None,
    });
    status.monitored_codex = monitored_codex;

    let tooltip = format_tooltip(&status);
    if let Some(tray) = app_handle.tray_by_id("main") {
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

pub fn open_main_window(app: &AppHandle, _source: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.emit("window-shown", true);
    } else {
        logger::log_error(
            "window",
            "open_main_window: WebviewWindow 'main' not found!",
        );
    }
}

pub fn hide_main_window(app: &AppHandle, _source: &str) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    } else {
        logger::log_error(
            "window",
            "hide_main_window: WebviewWindow 'main' not found!",
        );
    }
}

pub fn quit_application(app: &AppHandle, source: &str) {
    logger::log_info(
        "app",
        &format!("quit_application requested by '{}'", source),
    );
    let router = app.state::<crate::codex_router::CodexRouterManager>();
    let _ = tauri::async_runtime::block_on(router.stop_listener());
    let manager = app.state::<crate::antigravity_worker::AntigravityWorkerManager>();
    let _ = manager.stop_all();
    app.exit(0);
}

pub fn restore_router_config_on_exit(source: &str) {
    match crate::codex_sync::restore_codex_router_config() {
        Ok(()) => logger::log_info(
            "codex_router",
            &format!("[{source}] Codex provider config restored on exit"),
        ),
        Err(error) => logger::log_warn(
            "codex_router",
            &format!("[{source}] Failed to restore Codex provider config on exit: {error}"),
        ),
    }
}
