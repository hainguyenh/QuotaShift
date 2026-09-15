//! Process termination for Claude Code CLI, Claude Desktop, and Claude-owned IDE backends.

use super::ide_process::{is_claude_ide_backend_process, is_ide_host_process};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use sysinfo::{ProcessesToUpdate, System};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeProcessKillResult {
    pub cli_killed: bool,
    pub desktop_killed: bool,
    pub agent_killed: bool,
    pub ide_backend_killed: bool,
    pub ide_backend_restarted: bool,
    pub total_killed: usize,
}

fn process_base_name(name: &str) -> String {
    let lower_name = name.to_ascii_lowercase();
    std::path::Path::new(&lower_name)
        .file_name()
        .and_then(|n| n.to_str())
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
    if norm_cmd.split('/').any(|seg| {
        let clean = seg.trim_matches(|c: char| c == '"' || c == '\'' || c == ',' || c == ';');
        let tok = clean.trim_end_matches(".exe");
        tok == "claude" || tok == "claude-code"
    }) {
        return true;
    }
    lower_cmd.split_whitespace().any(|token| {
        let clean = token.trim_matches(|c: char| c == '"' || c == '\'' || c == ',' || c == ';');
        let tok_base = std::path::Path::new(clean)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or(clean)
            .trim_end_matches(".exe");
        tok_base == "claude" || tok_base == "claude-code"
    })
}

pub fn is_claude_desktop_process(name: &str, cmdline: &str) -> bool {
    let lower_name = name.to_ascii_lowercase();
    let lower_cmd = cmdline.to_ascii_lowercase();
    let base = process_base_name(name);

    if base == "claude" && (lower_cmd.contains("claude.app") || lower_cmd.contains("anthropic")) {
        return true;
    }
    lower_cmd.contains("claude.app")
        || lower_cmd.contains("claude desktop")
        || (lower_name.contains("claude") && lower_cmd.contains("electron"))
}

pub fn is_claude_agent_process(name: &str, cmdline: &str) -> bool {
    let lower_cmd = cmdline.to_ascii_lowercase();
    let base = process_base_name(name);
    if matches!(
        base.as_str(),
        "claude-agent" | "claude-language-server" | "claude-ls" | "claude-lsp"
    ) {
        return true;
    }
    lower_cmd.contains("claude-agent")
        || lower_cmd.contains("claude-language-server")
        || lower_cmd.contains("claude-ls")
        || lower_cmd.contains("claude-lsp")
}

pub fn is_target_claude_process(pid: u32, current_pid: u32, name: &str, cmdline: &str) -> bool {
    if pid == current_pid || pid == 0 {
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

fn process_command(process: &sysinfo::Process) -> String {
    process
        .cmd()
        .iter()
        .map(|s| s.to_string_lossy())
        .collect::<Vec<_>>()
        .join(" ")
}

#[tauri::command]
pub async fn kill_claude_processes() -> Result<ClaudeProcessKillResult, String> {
    let mut result = ClaudeProcessKillResult::default();
    let current_pid = std::process::id();
    let mut killed_ide_pids = HashSet::new();
    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All);

    for (&pid, process) in sys.processes() {
        let pid_u32 = pid.as_u32();
        let name = process.name().to_string_lossy();
        let cmd = process_command(process);
        if !is_target_claude_process(pid_u32, current_pid, &name, &cmd) {
            continue;
        }

        let is_ide_backend = is_claude_ide_backend_process(&name, &cmd);
        let is_desktop = is_claude_desktop_process(&name, &cmd);
        let is_cli = !is_ide_backend && !is_desktop && is_claude_cli_process(&name, &cmd);
        let is_agent = !is_ide_backend && is_claude_agent_process(&name, &cmd);

        if process.kill() {
            result.ide_backend_killed |= is_ide_backend;
            result.desktop_killed |= is_desktop;
            result.cli_killed |= is_cli;
            result.agent_killed |= is_agent;
            result.total_killed += 1;
            if is_ide_backend {
                killed_ide_pids.insert(pid_u32);
            }
        }
    }

    if result.ide_backend_killed {
        wait_for_ide_backend_restart(&mut sys, &killed_ide_pids, &mut result).await;
    } else {
        tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    }
    Ok(result)
}

async fn wait_for_ide_backend_restart(
    sys: &mut System,
    killed_pids: &HashSet<u32>,
    result: &mut ClaudeProcessKillResult,
) {
    // The IDE owns this backend. Never kill the IDE/shared extension host; wait for the
    // extension to observe the exit and spawn a fresh Claude-owned backend process.
    for _ in 0..5 {
        tokio::time::sleep(tokio::time::Duration::from_millis(400)).await;
        sys.refresh_processes(ProcessesToUpdate::All);
        let restarted = sys.processes().iter().any(|(&pid, process)| {
            if killed_pids.contains(&pid.as_u32()) {
                return false;
            }
            let name = process.name().to_string_lossy();
            let cmd = process_command(process);
            is_claude_ide_backend_process(&name, &cmd)
        });
        if restarted {
            result.ide_backend_restarted = true;
            break;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn target_filter_never_matches_current_process_or_quotashift() {
        assert!(!is_target_claude_process(42, 42, "claude", "claude"));
        assert!(!is_target_claude_process(
            43,
            42,
            "QuotaShift.exe",
            "QuotaShift.exe --claude-helper"
        ));
    }

    #[test]
    fn target_filter_matches_cli_agent_and_ide_backend() {
        assert!(is_target_claude_process(
            43,
            42,
            "node.exe",
            "node C:/tools/@anthropic-ai/claude-code/cli.js"
        ));
        assert!(is_target_claude_process(44, 42, "claude-agent.exe", "claude-agent.exe"));
        assert!(is_target_claude_process(
            45,
            42,
            "claude.exe",
            "C:/Users/me/.vscode/extensions/anthropic.claude-code-2.1.181/resources/native-binary/claude.exe --resume abc"
        ));
    }

    #[test]
    fn target_filter_never_matches_ide_host() {
        assert!(!is_target_claude_process(
            46,
            42,
            "Code.exe",
            "Code.exe --extensionHost C:/Users/me/.vscode/extensions/anthropic.claude-code/extension.js"
        ));
    }

    #[test]
    fn kill_result_serializes_for_frontend_camel_case_contract() {
        let value = serde_json::to_value(ClaudeProcessKillResult {
            cli_killed: true,
            desktop_killed: false,
            agent_killed: true,
            ide_backend_killed: true,
            ide_backend_restarted: true,
            total_killed: 3,
        })
        .expect("serialize ClaudeProcessKillResult");
        assert_eq!(value["cliKilled"], true);
        assert_eq!(value["agentKilled"], true);
        assert_eq!(value["ideBackendKilled"], true);
        assert_eq!(value["ideBackendRestarted"], true);
        assert_eq!(value["totalKilled"], 3);
    }
}
