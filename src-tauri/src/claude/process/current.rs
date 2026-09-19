use std::path::PathBuf;
use sysinfo::System;

use super::classify::{process_command, resolve_process_profiles};
use super::is_target_claude_process;
use crate::claude::accounts::{candidate_dirs_with_extra, normalize_config_dir_key};

#[tauri::command]
pub fn get_current_claude_config_dir(
    extra_config_dirs: Option<Vec<String>>,
) -> Result<Option<String>, String> {
    let home = crate::session::get_home_dir()
        .ok_or_else(|| "Could not locate the user home directory".to_string())?;
    let default_config = home.join(".claude");
    let candidates = candidate_dirs_with_extra(extra_config_dirs)?;
    let system = System::new_all();
    let profiles = resolve_process_profiles(&system, &candidates, &default_config);

    let current_key = system
        .processes()
        .iter()
        .filter_map(|(&pid, process)| {
            let pid_u32 = pid.as_u32();
            let name = process.name().to_string_lossy();
            let command = process_command(process);
            if !is_target_claude_process(pid_u32, std::process::id(), &name, &command) {
                return None;
            }
            profiles
                .get(&pid_u32)
                .cloned()
                .map(|key| (process.start_time(), pid_u32, key))
        })
        .max_by_key(|(start_time, pid, _)| (*start_time, *pid))
        .map(|(_, _, key)| key);

    let Some(current_key) = current_key else {
        return Ok(None);
    };
    let path = candidates
        .iter()
        .find(|candidate| normalize_config_dir_key(candidate) == current_key)
        .cloned()
        .unwrap_or_else(|| PathBuf::from(current_key));
    Ok(Some(path.to_string_lossy().to_string()))
}
