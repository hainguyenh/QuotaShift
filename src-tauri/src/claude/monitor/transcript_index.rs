use super::transcript::{add_usage, collect_recent_transcript_files};
use super::transcript_cache::{refresh_file, session_from_cached, CachedTranscriptFile};
use super::{
    ClaudeObservedUsage, ClaudeObservedUsageWindow, ClaudeSessionSnapshot, LocalTranscriptScan,
    ObservedUsageRecord,
};
use chrono::{DateTime, Duration as ChronoDuration, Utc};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

type ProjectTranscriptIndex = HashMap<PathBuf, CachedTranscriptFile>;
static TRANSCRIPT_INDEXES: OnceLock<Mutex<HashMap<String, ProjectTranscriptIndex>>> =
    OnceLock::new();

fn indexes() -> &'static Mutex<HashMap<String, ProjectTranscriptIndex>> {
    TRANSCRIPT_INDEXES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn root_key(root: &Path) -> String {
    let normalized = fs::canonicalize(root).unwrap_or_else(|_| root.to_path_buf());
    let raw = normalized.to_string_lossy().replace('\\', "/");
    if cfg!(windows) {
        raw.to_ascii_lowercase()
    } else {
        raw.to_string()
    }
}

pub fn scan_incremental_transcripts(
    projects_root: &Path,
    now: DateTime<Utc>,
) -> LocalTranscriptScan {
    if !projects_root.is_dir() {
        return LocalTranscriptScan::default();
    }

    let mut files = Vec::new();
    collect_recent_transcript_files(projects_root, now - ChronoDuration::days(8), &mut files);
    let current_paths = files.iter().cloned().collect::<HashSet<_>>();
    let key = root_key(projects_root);
    let mut index = indexes()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .remove(&key)
        .unwrap_or_default();

    for path in files {
        let previous = index.remove(&path);
        if let Some(updated) = refresh_file(&path, previous, now) {
            index.insert(path, updated);
        }
    }
    index.retain(|path, _| current_paths.contains(path));

    let seven_day_cutoff = now - ChronoDuration::days(7);
    let five_hour_cutoff = now - ChronoDuration::hours(5);
    let retention_cutoff = now - ChronoDuration::days(8);
    let mut unique_messages: HashMap<String, ObservedUsageRecord> = HashMap::new();
    let mut latest_main_session: Option<ClaudeSessionSnapshot> = None;

    for cached in index.values_mut() {
        cached
            .messages
            .retain(|_, record| record.timestamp >= retention_cutoff);
        if let Some(session) = session_from_cached(cached) {
            if latest_main_session
                .as_ref()
                .is_none_or(|current| current.captured_at_ms < session.captured_at_ms)
            {
                latest_main_session = Some(session);
            }
        }
        for (message_id, record) in &cached.messages {
            if record.timestamp < seven_day_cutoff {
                continue;
            }
            match unique_messages.get_mut(message_id) {
                Some(existing) if existing.timestamp < record.timestamp => {
                    *existing = record.clone();
                }
                None => {
                    unique_messages.insert(message_id.clone(), record.clone());
                }
                _ => {}
            }
        }
    }

    let observed_usage = if unique_messages.is_empty() {
        None
    } else {
        let mut five_hour = ClaudeObservedUsageWindow::default();
        let mut seven_day = ClaudeObservedUsageWindow::default();
        for record in unique_messages.values() {
            add_usage(&mut seven_day, &record.usage);
            if record.timestamp >= five_hour_cutoff {
                add_usage(&mut five_hour, &record.usage);
            }
        }
        Some(ClaudeObservedUsage {
            five_hour,
            seven_day,
            captured_at_ms: now.timestamp_millis().max(0) as u64,
        })
    };

    indexes()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
        .insert(key, index);

    LocalTranscriptScan {
        latest_main_session,
        observed_usage,
    }
}
