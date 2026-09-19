use super::*;

#[test]
fn excludes_current_process_quotashift_ide_hosts_and_usage_probes() {
    assert!(!is_target_claude_process(42, 42, "claude", "claude"));
    assert!(!is_target_claude_process(
        43,
        42,
        "QuotaShift.exe",
        "QuotaShift.exe --claude-helper"
    ));
    assert!(!is_target_claude_process(
        44,
        42,
        "Code.exe",
        "Code.exe --extensionHost anthropic.claude-code"
    ));
    assert!(!is_target_claude_process(
        45,
        42,
        "claude.exe",
        "claude.exe -p /usage"
    ));
}

#[test]
fn recognizes_cli_agents_and_extension_backends() {
    assert!(is_target_claude_process(
        43,
        42,
        "node.exe",
        "node C:/tools/@anthropic-ai/claude-code/cli.js"
    ));
    assert!(is_target_claude_process(
        44,
        42,
        "claude-agent.exe",
        "claude-agent.exe"
    ));
    assert!(is_target_claude_process(
        45,
        42,
        "claude.exe",
        "C:/Users/me/.vscode/extensions/anthropic.claude-code/resources/native-binary/claude.exe --resume abc"
    ));
}

#[test]
fn suspend_result_serializes_account_scoped_counts() {
    let value = serde_json::to_value(ClaudeProcessSuspendResult {
        cli_suspended: 1,
        desktop_suspended: 1,
        agent_suspended: 0,
        ide_backend_suspended: 1,
        total_suspended: 3,
        already_suspended: 2,
        persistence_error: None,
    })
    .unwrap();
    assert_eq!(value["totalSuspended"], 3);
    assert_eq!(value["ideBackendSuspended"], 1);
    assert_eq!(value["alreadySuspended"], 2);
}

fn record(
    five_hour_triggered: bool,
    five_hour_reset_at: Option<i64>,
    weekly_triggered: bool,
    weekly_reset_at: Option<i64>,
    auto_resume: bool,
) -> SuspendedAccountRecord {
    SuspendedAccountRecord {
        config_dir: "C:/profiles/a".into(),
        processes: vec![SuspendedProcessRef {
            pid: 42,
            start_time: 1000,
        }],
        suspended_at: 50,
        auto_resume,
        five_hour_triggered,
        five_hour_reset_at,
        weekly_triggered,
        weekly_reset_at,
    }
}

#[test]
fn both_triggered_windows_require_the_later_reset() {
    let record = record(true, Some(100), true, Some(250), true);
    assert_eq!(record.auto_resume_deadline(), Some(250));
}

#[test]
fn missing_required_reset_disables_automatic_resume_for_that_record() {
    let record = record(true, None, true, Some(250), true);
    assert_eq!(record.auto_resume_deadline(), None);
}

#[test]
fn exact_process_identity_requires_pid_and_start_time() {
    let expected = SuspendedProcessRef {
        pid: 42,
        start_time: 1000,
    };
    assert!(expected.matches(42, 1000));
    assert!(!expected.matches(42, 1001));
    assert!(!expected.matches(43, 1000));
}

#[test]
fn journal_round_trip_preserves_process_identity_and_reset_windows() {
    let record = record(true, Some(100), true, Some(250), true);
    let encoded = serde_json::to_vec(&vec![record.clone()]).unwrap();
    let decoded: Vec<SuspendedAccountRecord> = serde_json::from_slice(&encoded).unwrap();
    assert_eq!(decoded, vec![record]);
}

#[test]
fn persistence_failure_is_reported_without_discarding_suspend_success() {
    let result = with_suspension_persistence(
        ClaudeProcessSuspendResult {
            total_suspended: 1,
            ..ClaudeProcessSuspendResult::default()
        },
        Err("disk full".to_string()),
    );

    assert_eq!(result.total_suspended, 1);
    assert_eq!(result.persistence_error.as_deref(), Some("disk full"));
}

#[test]
fn externally_resumed_process_is_dropped_but_unknown_state_is_retained_safely() {
    assert!(journal::should_keep_suspended_process(true, Some(true)));
    assert!(journal::should_keep_suspended_process(true, None));
    assert!(!journal::should_keep_suspended_process(true, Some(false)));
    assert!(!journal::should_keep_suspended_process(false, Some(true)));
}

#[test]
fn persistence_failure_is_reported_without_discarding_resume_success() {
    let result = journal::with_resume_persistence(
        ClaudeProcessResumeResult {
            total_resumed: 1,
            ..ClaudeProcessResumeResult::default()
        },
        Err("disk full".to_string()),
    );

    assert_eq!(result.total_resumed, 1);
    assert_eq!(result.persistence_error.as_deref(), Some("disk full"));
}
