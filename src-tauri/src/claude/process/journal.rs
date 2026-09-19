use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::sync::{Mutex, OnceLock};
use sysinfo::{Pid, System};
use tauri::{AppHandle, Manager};

use super::native::is_process_still_suspended;
use crate::claude::accounts::normalize_config_dir_key;
use crate::claude::monitor::write_atomic;

const SUSPENSION_JOURNAL_FILE: &str = "claude-suspensions.json";

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub(super) struct SuspendedProcessRef {
    pub pid: u32,
    pub start_time: u64,
}

impl SuspendedProcessRef {
    pub(super) fn matches(&self, pid: u32, start_time: u64) -> bool {
        self.pid == pid && self.start_time == start_time
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub(super) struct SuspendedAccountRecord {
    pub config_dir: String,
    pub processes: Vec<SuspendedProcessRef>,
    pub suspended_at: i64,
    pub auto_resume: bool,
    pub five_hour_triggered: bool,
    pub five_hour_reset_at: Option<i64>,
    pub weekly_triggered: bool,
    pub weekly_reset_at: Option<i64>,
}

impl SuspendedAccountRecord {
    pub(super) fn auto_resume_deadline(&self) -> Option<i64> {
        if !self.auto_resume {
            return None;
        }

        let mut resets = Vec::with_capacity(2);
        if self.five_hour_triggered {
            resets.push(self.five_hour_reset_at?);
        }
        if self.weekly_triggered {
            resets.push(self.weekly_reset_at?);
        }
        if resets.is_empty() {
            return None;
        }
        resets.into_iter().max()
    }
}

static SUSPENDED_BY_CONFIG: OnceLock<Mutex<HashMap<String, SuspendedAccountRecord>>> =
    OnceLock::new();

pub(super) fn suspended_map() -> &'static Mutex<HashMap<String, SuspendedAccountRecord>> {
    SUSPENDED_BY_CONFIG.get_or_init(|| Mutex::new(HashMap::new()))
}

fn journal_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|dir| dir.join(SUSPENSION_JOURNAL_FILE))
        .map_err(|error| format!("Failed to resolve QuotaShift app data directory: {error}"))
}

pub(super) fn with_suspension_persistence(
    mut result: super::ClaudeProcessSuspendResult,
    persistence: Result<(), String>,
) -> super::ClaudeProcessSuspendResult {
    result.persistence_error = persistence.err();
    result
}

pub(super) fn with_resume_persistence(
    mut result: super::ClaudeProcessResumeResult,
    persistence: Result<(), String>,
) -> super::ClaudeProcessResumeResult {
    result.persistence_error = persistence.err();
    result
}

pub(super) fn should_keep_suspended_process(
    identity_matches: bool,
    suspended_state: Option<bool>,
) -> bool {
    identity_matches && suspended_state != Some(false)
}

pub(super) fn records_snapshot() -> HashMap<String, SuspendedAccountRecord> {
    suspended_map()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .clone()
}

pub(super) fn persist_suspensions(app: &AppHandle) -> Result<(), String> {
    let mut records = records_snapshot().into_values().collect::<Vec<_>>();
    records.sort_by(|left, right| left.config_dir.cmp(&right.config_dir));
    let bytes = serde_json::to_vec_pretty(&records)
        .map_err(|error| format!("Failed to serialize Claude suspension journal: {error}"))?;
    write_atomic(&journal_path(app)?, &bytes)
}

pub fn restore_claude_suspension_journal(app: &AppHandle) -> Result<(), String> {
    let path = journal_path(app)?;
    if !path.exists() {
        suspended_map()
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .clear();
        return Ok(());
    }

    let raw = fs::read(&path)
        .map_err(|error| format!("Failed to read Claude suspension journal: {error}"))?;
    let records: Vec<SuspendedAccountRecord> = serde_json::from_slice(&raw)
        .map_err(|error| format!("Claude suspension journal is invalid JSON: {error}"))?;
    let system = System::new_all();
    let mut restored = HashMap::new();

    for mut record in records {
        record.processes.retain(|item| {
            let identity_matches = system
                .process(Pid::from_u32(item.pid))
                .is_some_and(|process| item.matches(item.pid, process.start_time()));
            should_keep_suspended_process(identity_matches, is_process_still_suspended(item.pid))
        });
        if record.processes.is_empty() {
            continue;
        }
        let key = normalize_config_dir_key(std::path::Path::new(&record.config_dir));
        restored.insert(key, record);
    }

    *suspended_map()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner()) = restored;
    persist_suspensions(app)
}
