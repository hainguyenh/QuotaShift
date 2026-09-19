//! Claude Code subscription-account discovery keyed by CLAUDE_CONFIG_DIR.

mod discovery;
mod metadata;
mod types;

pub use discovery::{candidate_dirs, candidate_dirs_at};
pub use metadata::{normalize_config_dir_key, scan_claude_accounts_at};
pub use types::{ClaudeAccount, ClaudeAccountUsageStatus};

use std::path::PathBuf;

use super::monitor::ClaudeUsageScheduler;
use super::process::suspended_process_counts_for_configs;

pub(super) fn account_home_dir() -> Result<PathBuf, String> {
    crate::session::get_home_dir()
        .ok_or_else(|| "Could not locate the user home directory".to_string())
}

pub(super) fn candidate_dirs_with_extra(
    extra_config_dirs: Option<Vec<String>>,
) -> Result<Vec<PathBuf>, String> {
    let mut dirs = candidate_dirs()?;
    for raw in extra_config_dirs.unwrap_or_default() {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            continue;
        }
        let path = PathBuf::from(trimmed);
        let key = normalize_config_dir_key(&path);
        if !dirs
            .iter()
            .any(|candidate| normalize_config_dir_key(candidate) == key)
        {
            dirs.push(path);
        }
    }
    Ok(dirs)
}

pub fn scan_claude_accounts() -> Result<Vec<ClaudeAccount>, String> {
    let home = account_home_dir()?;
    Ok(scan_claude_accounts_at(&home, candidate_dirs()?))
}

#[tauri::command]
pub fn get_claude_account_statuses(
    scheduler: tauri::State<'_, ClaudeUsageScheduler>,
    force: bool,
    max_age_secs: Option<u64>,
    extra_config_dirs: Option<Vec<String>>,
) -> Result<Vec<ClaudeAccountUsageStatus>, String> {
    let home = account_home_dir()?;
    let accounts = scan_claude_accounts_at(&home, candidate_dirs_with_extra(extra_config_dirs)?);
    let config_dirs = accounts
        .iter()
        .map(|account| PathBuf::from(&account.config_dir))
        .collect::<Vec<_>>();
    let suspended_counts = suspended_process_counts_for_configs(&config_dirs);
    let max_age_secs = max_age_secs.unwrap_or(60).clamp(1, 1200);

    scheduler.request_profiles(&config_dirs, max_age_secs, force);

    Ok(accounts
        .into_iter()
        .map(|account| {
            let config_dir = PathBuf::from(&account.config_dir);
            let (usage, usage_fresh) = scheduler.snapshot_for(&config_dir, max_age_secs);
            let key = normalize_config_dir_key(&config_dir);
            let suspended_process_count = suspended_counts.get(&key).copied().unwrap_or(0);
            ClaudeAccountUsageStatus {
                account,
                five_hour: usage.five_hour,
                seven_day: usage.seven_day,
                usage_fresh,
                usage_fetched_at: usage.fetched_at,
                suspended: suspended_process_count > 0,
                suspended_process_count,
                error: usage.error,
            }
        })
        .collect())
}

#[cfg(test)]
mod tests;
