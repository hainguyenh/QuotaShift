use super::transcript::is_subagent_transcript;
use super::{
    format_claude_model_name, ClaudeSessionSnapshot, LocalTranscriptRecord, LocalUsageFields,
    ObservedUsageRecord,
};
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{BufRead, BufReader, Seek, SeekFrom};
use std::path::Path;
use std::time::UNIX_EPOCH;

#[derive(Debug, Clone)]
pub(super) struct LatestUsage {
    pub(super) timestamp: DateTime<Utc>,
    pub(super) session_id: String,
    pub(super) cwd: Option<String>,
    pub(super) version: Option<String>,
    pub(super) model: Option<String>,
    pub(super) usage: LocalUsageFields,
}

#[derive(Debug, Clone, Default)]
pub(super) struct CachedTranscriptFile {
    pub(super) parsed_len: u64,
    pub(super) file_len: u64,
    pub(super) modified_ms: u128,
    pub(super) first_timestamp: Option<DateTime<Utc>>,
    pub(super) latest_usage: Option<LatestUsage>,
    pub(super) messages: HashMap<String, ObservedUsageRecord>,
}

fn update_record(
    cached: &mut CachedTranscriptFile,
    record: LocalTranscriptRecord,
    now: DateTime<Utc>,
    is_main: bool,
) {
    let Some(timestamp) = record
        .timestamp
        .as_deref()
        .and_then(|value| DateTime::parse_from_rfc3339(value).ok())
        .map(|value| value.with_timezone(&Utc))
    else {
        return;
    };
    if timestamp > now {
        return;
    }

    if is_main {
        cached.first_timestamp = Some(
            cached
                .first_timestamp
                .map(|current| current.min(timestamp))
                .unwrap_or(timestamp),
        );
    }

    let Some(message) = record.message else {
        return;
    };
    let Some(usage) = message.usage else {
        return;
    };

    if is_main {
        if let Some(session_id) = record
            .session_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        {
            let should_replace = cached
                .latest_usage
                .as_ref()
                .map(|current| current.timestamp < timestamp)
                .unwrap_or(true);
            if should_replace {
                cached.latest_usage = Some(LatestUsage {
                    timestamp,
                    session_id: session_id.to_string(),
                    cwd: record.cwd.clone(),
                    version: record.version.clone(),
                    model: message.model.clone(),
                    usage: usage.clone(),
                });
            }
        }
    }

    let Some(message_id) = message.id.map(|value| value.trim().to_string()) else {
        return;
    };
    if message_id.is_empty() {
        return;
    }
    match cached.messages.get_mut(&message_id) {
        Some(existing) if existing.timestamp < timestamp => {
            *existing = ObservedUsageRecord { timestamp, usage };
        }
        None => {
            cached
                .messages
                .insert(message_id, ObservedUsageRecord { timestamp, usage });
        }
        _ => {}
    }
}

pub(super) fn refresh_file(
    path: &Path,
    previous: Option<CachedTranscriptFile>,
    now: DateTime<Utc>,
) -> Option<CachedTranscriptFile> {
    let metadata = fs::metadata(path).ok()?;
    let len = metadata.len();
    let modified = metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_millis())
        .unwrap_or(0);
    let can_append = previous
        .as_ref()
        .is_some_and(|cached| cached.file_len < len && cached.parsed_len <= cached.file_len);
    let unchanged = previous
        .as_ref()
        .is_some_and(|cached| cached.file_len == len && cached.modified_ms == modified);
    if unchanged {
        return previous;
    }

    let mut cached = if can_append {
        previous.unwrap_or_default()
    } else {
        CachedTranscriptFile::default()
    };
    let start = if can_append { cached.parsed_len } else { 0 };
    let mut file = File::open(path).ok()?;
    if start > 0 && file.seek(SeekFrom::Start(start)).is_err() {
        cached = CachedTranscriptFile::default();
        let _ = file.seek(SeekFrom::Start(0));
    }

    let is_main = !is_subagent_transcript(path);
    let mut reader = BufReader::new(file);
    let mut parsed_len = start;
    loop {
        let mut line = Vec::new();
        let read = reader.read_until(b'\n', &mut line).ok()?;
        if read == 0 {
            break;
        }
        if !line.ends_with(b"\n") {
            break;
        }
        parsed_len = parsed_len.saturating_add(read as u64);
        let Ok(record) = serde_json::from_slice::<LocalTranscriptRecord>(&line) else {
            continue;
        };
        update_record(&mut cached, record, now, is_main);
    }

    let final_metadata = fs::metadata(path).ok()?;
    cached.parsed_len = parsed_len;
    cached.file_len = final_metadata.len();
    cached.modified_ms = final_metadata
        .modified()
        .ok()
        .and_then(|value| value.duration_since(UNIX_EPOCH).ok())
        .map(|value| value.as_millis())
        .unwrap_or(modified);
    Some(cached)
}

pub(super) fn session_from_cached(file: &CachedTranscriptFile) -> Option<ClaudeSessionSnapshot> {
    let latest = file.latest_usage.as_ref()?;
    let input = latest.usage.input_tokens.unwrap_or(0);
    let output = latest.usage.output_tokens.unwrap_or(0);
    let cache_create = latest.usage.cache_creation_input_tokens.unwrap_or(0);
    let cache_read = latest.usage.cache_read_input_tokens.unwrap_or(0);
    let total_input = input
        .saturating_add(cache_create)
        .saturating_add(cache_read);
    let started = file.first_timestamp.unwrap_or(latest.timestamp);
    let duration_ms = latest
        .timestamp
        .signed_duration_since(started)
        .num_milliseconds()
        .max(0) as u64;

    Some(ClaudeSessionSnapshot {
        session_id: latest.session_id.clone(),
        session_name: None,
        model_id: latest.model.clone(),
        model_display_name: latest.model.as_deref().map(format_claude_model_name),
        claude_code_version: latest.version.clone(),
        current_dir: latest.cwd.clone(),
        project_dir: latest.cwd.clone(),
        captured_at_ms: latest.timestamp.timestamp_millis().max(0) as u64,
        total_cost_usd: None,
        total_duration_ms: Some(duration_ms),
        total_api_duration_ms: None,
        total_input_tokens: Some(total_input),
        total_output_tokens: Some(output),
        context_window_size: None,
        context_used_percentage: None,
        context_remaining_percentage: None,
        current_input_tokens: Some(input),
        current_output_tokens: Some(output),
        cache_creation_input_tokens: Some(cache_create),
        cache_read_input_tokens: Some(cache_read),
        five_hour: None,
        seven_day: None,
    })
}
