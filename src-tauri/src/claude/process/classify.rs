use std::collections::HashMap;
use std::path::{Path, PathBuf};
use sysinfo::System;

use super::super::accounts::normalize_config_dir_key;
use super::super::ide_process::{is_claude_ide_backend_process, is_ide_host_process};

#[derive(Debug, Clone, Copy)]
pub(super) struct ProcessCategory {
    pub cli: bool,
    pub desktop: bool,
    pub agent: bool,
    pub ide_backend: bool,
}

fn process_base_name(name: &str) -> String {
    let lower_name = name.to_ascii_lowercase();
    std::path::Path::new(&lower_name)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(&lower_name)
        .trim_end_matches(".exe")
        .to_string()
}

pub fn is_claude_cli_process(name: &str, cmdline: &str) -> bool {
    let lower_cmd = cmdline.to_ascii_lowercase();
    let norm_cmd = lower_cmd.replace('\\', "/");
    let base = process_base_name(name);

    if base == "claude" || base == "claude-code" {
        return true;
    }
    if norm_cmd.contains("@anthropic-ai/claude-code")
        || norm_cmd.contains("claude-code")
        || norm_cmd.contains("/claude ")
        || norm_cmd.ends_with("/claude")
        || norm_cmd.contains("claude.exe")
    {
        return true;
    }
    lower_cmd.split_whitespace().any(|token| {
        let clean =
            token.trim_matches(|character: char| matches!(character, '"' | '\'' | ',' | ';'));
        let token_base = std::path::Path::new(clean)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or(clean)
            .trim_end_matches(".exe");
        token_base == "claude" || token_base == "claude-code"
    })
}

pub fn is_claude_desktop_process(name: &str, cmdline: &str) -> bool {
    let lower_name = name.to_ascii_lowercase();
    let lower_cmd = cmdline.to_ascii_lowercase();
    let base = process_base_name(name);
    (base == "claude" && (lower_cmd.contains("claude.app") || lower_cmd.contains("anthropic")))
        || lower_cmd.contains("claude.app")
        || lower_cmd.contains("claude desktop")
        || (lower_name.contains("claude") && lower_cmd.contains("electron"))
}

pub fn is_claude_agent_process(name: &str, cmdline: &str) -> bool {
    let lower_cmd = cmdline.to_ascii_lowercase();
    let base = process_base_name(name);
    matches!(
        base.as_str(),
        "claude-agent" | "claude-language-server" | "claude-ls" | "claude-lsp"
    ) || lower_cmd.contains("claude-agent")
        || lower_cmd.contains("claude-language-server")
        || lower_cmd.contains("claude-ls")
        || lower_cmd.contains("claude-lsp")
}

pub fn is_claude_usage_probe(cmdline: &str) -> bool {
    let normalized = cmdline
        .to_ascii_lowercase()
        .replace('\\', "/")
        .replace('"', "");
    normalized.contains("-p /usage")
        || normalized.contains("--print /usage")
        || normalized.contains("claude -p /usage")
}

pub fn is_target_claude_process(pid: u32, current_pid: u32, name: &str, cmdline: &str) -> bool {
    if pid == current_pid || pid == 0 || is_claude_usage_probe(cmdline) {
        return false;
    }
    let lower_name = name.to_ascii_lowercase();
    let lower_cmd = cmdline.to_ascii_lowercase();
    if lower_name.contains("quotashift") || lower_cmd.contains("quotashift") {
        return false;
    }
    if is_ide_host_process(name, cmdline) {
        return false;
    }
    is_claude_ide_backend_process(name, cmdline)
        || is_claude_cli_process(name, cmdline)
        || is_claude_desktop_process(name, cmdline)
        || is_claude_agent_process(name, cmdline)
}

pub(super) fn process_command(process: &sysinfo::Process) -> String {
    process
        .cmd()
        .iter()
        .map(|part| part.to_string_lossy())
        .collect::<Vec<_>>()
        .join(" ")
}

fn config_from_environment(process: &sysinfo::Process) -> Option<PathBuf> {
    process.environ().iter().find_map(|entry| {
        let value = entry.to_string_lossy();
        let (key, config) = value.split_once('=')?;
        key.eq_ignore_ascii_case("CLAUDE_CONFIG_DIR")
            .then(|| PathBuf::from(config))
    })
}

fn config_from_command(cmdline: &str, candidates: &[PathBuf]) -> Option<PathBuf> {
    let normalized_cmd = if cfg!(windows) {
        cmdline.replace('\\', "/").to_ascii_lowercase()
    } else {
        cmdline.replace('\\', "/")
    };
    candidates.iter().find_map(|candidate| {
        let key = normalize_config_dir_key(candidate);
        normalized_cmd.contains(&key).then(|| candidate.clone())
    })
}

pub(super) fn resolve_process_profiles(
    system: &System,
    candidates: &[PathBuf],
    default_config: &Path,
) -> HashMap<u32, String> {
    let mut resolved = HashMap::<u32, String>::new();

    for (&pid, process) in system.processes() {
        let command = process_command(process);
        if let Some(config_dir) =
            config_from_environment(process).or_else(|| config_from_command(&command, candidates))
        {
            resolved.insert(pid.as_u32(), normalize_config_dir_key(&config_dir));
        }
    }

    let default_key = normalize_config_dir_key(default_config);
    for (&pid, process) in system.processes() {
        let pid = pid.as_u32();
        if resolved.contains_key(&pid) {
            continue;
        }
        let name = process.name().to_string_lossy();
        let command = process_command(process);
        let default_cli = is_claude_cli_process(&name, &command)
            && !is_claude_ide_backend_process(&name, &command);
        if is_claude_desktop_process(&name, &command) || default_cli {
            resolved.insert(pid, default_key.clone());
        }
    }

    let mut changed = true;
    while changed {
        changed = false;
        for (&pid, process) in system.processes() {
            let pid = pid.as_u32();
            if resolved.contains_key(&pid) {
                continue;
            }
            let Some(parent) = process.parent() else {
                continue;
            };
            if let Some(profile) = resolved.get(&parent.as_u32()).cloned() {
                resolved.insert(pid, profile);
                changed = true;
            }
        }
    }

    resolved
}

pub(super) fn process_category(name: &str, command: &str) -> ProcessCategory {
    let ide_backend = is_claude_ide_backend_process(name, command);
    let desktop = is_claude_desktop_process(name, command);
    ProcessCategory {
        cli: !ide_backend && !desktop && is_claude_cli_process(name, command),
        desktop,
        agent: !ide_backend && is_claude_agent_process(name, command),
        ide_backend,
    }
}
