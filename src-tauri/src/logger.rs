use chrono::Local;
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

static LOG_MUTEX: Mutex<()> = Mutex::new(());

pub fn get_log_dir() -> Option<PathBuf> {
    crate::session::get_home_dir().map(|h| h.join(".quotashift"))
}

pub fn get_log_path() -> Option<PathBuf> {
    get_log_dir().map(|d| d.join("quotashift.log"))
}

fn is_redundant_info(tag: &str, message: &str) -> bool {
    match tag {
        "window" => {
            message.starts_with("main window Resized")
                || message.starts_with("main window Moved")
                || message.starts_with("open_main_window requested by")
                || message.starts_with("hide_main_window requested by")
                || message == "open_devtools command executed"
                || message.starts_with("Opening logs folder:")
        }
        "codex_router" => message.contains("event=forwarded"),
        "frontend:main:bootstrap" => true,
        "frontend:frontend:init" => message == "Frontend logger initialized",
        _ => false,
    }
}

pub fn write_log(level: &str, tag: &str, message: &str) {
    if level.eq_ignore_ascii_case("INFO") && is_redundant_info(tag, message) {
        return;
    }

    let now = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let line = format!("[{}] [{}] [{}] {}\n", now, level, tag, message);

    // Always output to stderr for CLI / dev visibility
    eprint!("{}", line);

    // Also persist to log file
    let _guard = LOG_MUTEX.lock().unwrap();
    if let Some(log_dir) = get_log_dir() {
        let _ = create_dir_all(&log_dir);
        let log_file = log_dir.join("quotashift.log");
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_file) {
            let _ = file.write_all(line.as_bytes());
            let _ = file.flush();
        }
    }
}

pub fn log_info(tag: &str, message: &str) {
    write_log("INFO", tag, message);
}

pub fn log_warn(tag: &str, message: &str) {
    write_log("WARN", tag, message);
}

pub fn log_error(tag: &str, message: &str) {
    write_log("ERROR", tag, message);
}

pub fn log_debug(tag: &str, message: &str) {
    write_log("DEBUG", tag, message);
}

#[cfg(test)]
mod tests {
    use super::is_redundant_info;

    #[test]
    fn suppresses_high_frequency_window_info() {
        assert!(is_redundant_info(
            "window",
            "main window Resized to 680x720"
        ));
        assert!(is_redundant_info(
            "window",
            "main window Moved to x=120 y=80"
        ));
        assert!(is_redundant_info(
            "window",
            "open_main_window requested by tray_click"
        ));
        assert!(is_redundant_info(
            "window",
            "hide_main_window requested by focus_lost"
        ));
    }

    #[test]
    fn suppresses_routine_success_traces() {
        assert!(is_redundant_info(
            "codex_router",
            "event=forwarded account_id=a model=gpt-5 status=200"
        ));
        assert!(is_redundant_info(
            "frontend:main:bootstrap",
            "React root.render() executed"
        ));
        assert!(is_redundant_info(
            "frontend:frontend:init",
            "Frontend logger initialized"
        ));
        assert!(is_redundant_info(
            "window",
            "open_devtools command executed"
        ));
        assert!(is_redundant_info(
            "window",
            "Opening logs folder: C:\\Users\\user\\.quotashift"
        ));
    }

    #[test]
    fn keeps_diagnostics_and_lifecycle_info() {
        assert!(!is_redundant_info(
            "codex_router",
            "event=precommit_failover account_id=a model=gpt-5 status=429"
        ));
        assert!(!is_redundant_info("lifecycle", "Tauri RunEvent::Exit"));
        assert!(!is_redundant_info(
            "window",
            "Failed to position main window: monitor unavailable"
        ));
    }
}
