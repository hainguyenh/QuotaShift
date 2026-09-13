use serde_json::{Map, Value};
use std::cmp::Ordering;

use super::super::AntigravityRuntimeState;

const ACCESS_TOKEN_KEY: &str = "antigravityUnifiedStateSync.oauthToken";

fn has_access_token(map: &Map<String, Value>) -> bool {
    map.get(ACCESS_TOKEN_KEY)
        .and_then(Value::as_str)
        .is_some_and(|token| !token.trim().is_empty())
}

fn modified_at(map: &Map<String, Value>) -> f64 {
    map.get("_mtime").and_then(Value::as_f64).unwrap_or(0.0)
}

pub(crate) fn select_antigravity_session_map(
    runtime: &AntigravityRuntimeState,
    credential_manager: Option<Map<String, Value>>,
    vscdb: Option<Map<String, Value>>,
    adc: Option<Map<String, Value>>,
) -> Map<String, Value> {
    if runtime.cli_detected {
        return credential_manager
            .filter(has_access_token)
            .unwrap_or_default();
    }

    if runtime.ide_detected {
        return vscdb.filter(has_access_token).unwrap_or_default();
    }

    [credential_manager, vscdb, adc]
        .into_iter()
        .flatten()
        .filter(has_access_token)
        .max_by(|left, right| {
            modified_at(left)
                .partial_cmp(&modified_at(right))
                .unwrap_or(Ordering::Equal)
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn source(token: &str, mtime: f64) -> Map<String, Value> {
        let mut map = Map::new();
        map.insert(ACCESS_TOKEN_KEY.to_string(), json!(token));
        map.insert("_mtime".to_string(), json!(mtime));
        map
    }

    #[test]
    fn running_cli_prefers_cli_keyring_even_when_ide_state_is_newer() {
        let runtime = AntigravityRuntimeState {
            ide_detected: true,
            cli_detected: true,
            ide_executable: None,
        };

        let selected = select_antigravity_session_map(
            &runtime,
            Some(source("cli-account", 10.0)),
            Some(source("ide-account", 30.0)),
            Some(source("adc-account", 40.0)),
        );

        assert_eq!(selected[ACCESS_TOKEN_KEY], "cli-account");
    }

    #[test]
    fn running_ide_prefers_ide_state_when_cli_is_not_running() {
        let runtime = AntigravityRuntimeState {
            ide_detected: true,
            cli_detected: false,
            ide_executable: None,
        };

        let selected = select_antigravity_session_map(
            &runtime,
            Some(source("stale-cli-account", 40.0)),
            Some(source("ide-account", 10.0)),
            Some(source("adc-account", 50.0)),
        );

        assert_eq!(selected[ACCESS_TOKEN_KEY], "ide-account");
    }

    #[test]
    fn inactive_runtime_falls_back_to_most_recent_valid_source() {
        let runtime = AntigravityRuntimeState::default();

        let selected = select_antigravity_session_map(
            &runtime,
            Some(source("cli-account", 10.0)),
            Some(source("ide-account", 20.0)),
            Some(source("adc-account", 30.0)),
        );

        assert_eq!(selected[ACCESS_TOKEN_KEY], "adc-account");
    }

    #[test]
    fn running_cli_does_not_fall_back_to_unrelated_ide_state() {
        let runtime = AntigravityRuntimeState {
            ide_detected: false,
            cli_detected: true,
            ide_executable: None,
        };
        let mut empty_cli = source("", 50.0);
        empty_cli.insert("antigravity.refreshToken".to_string(), json!("refresh-only"));

        let selected = select_antigravity_session_map(
            &runtime,
            Some(empty_cli),
            Some(source("ide-account", 20.0)),
            None,
        );

        assert!(selected.is_empty());
    }
}
