//! Detection helpers for Claude IDE integrations.
//!
//! IDE hosts and shared extension-host processes are explicitly excluded. QuotaShift may
//! recycle only Claude-owned backend children spawned from an Anthropic extension/plugin.

fn process_base_name(name: &str) -> String {
    let lower_name = name.to_ascii_lowercase();
    std::path::Path::new(&lower_name)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(&lower_name)
        .trim_end_matches(".exe")
        .to_string()
}

pub fn is_ide_host_process(name: &str, cmdline: &str) -> bool {
    let base = process_base_name(name);
    let lower_name = name.to_ascii_lowercase();
    let lower_cmd = cmdline.to_ascii_lowercase();

    let known_ide_host = matches!(
        base.as_str(),
        "code"
            | "code-insiders"
            | "cursor"
            | "windsurf"
            | "vscodium"
            | "codium"
            | "zed"
            | "devenv"
            | "idea"
            | "idea64"
            | "webstorm"
            | "webstorm64"
            | "pycharm"
            | "pycharm64"
            | "rider"
            | "rider64"
            | "clion"
            | "clion64"
            | "goland"
            | "goland64"
            | "datagrip"
            | "datagrip64"
            | "phpstorm"
            | "phpstorm64"
            | "rubymine"
            | "rubymine64"
            | "rustrover"
            | "rustrover64"
    );

    known_ide_host
        || lower_name.contains("code helper")
        || lower_name.contains("cursor helper")
        || lower_name.contains("windsurf helper")
        || lower_name.contains("vscodium helper")
        || lower_name.contains("codium helper")
        || (lower_cmd.contains("extensionhost") && !base.starts_with("claude"))
}

pub fn is_claude_ide_backend_process(name: &str, cmdline: &str) -> bool {
    if is_ide_host_process(name, cmdline) {
        return false;
    }

    let base = process_base_name(name);
    let norm_cmd = cmdline.to_ascii_lowercase().replace('\\', "/");
    let from_claude_extension = norm_cmd.contains("anthropic.claude-code")
        || norm_cmd.contains("anthropic.claude")
        || norm_cmd.contains("/extensions/claude")
        || norm_cmd.contains("/extensions/anthropic")
        || norm_cmd.contains("/plugins/claude")
        || norm_cmd.contains("/plugins/anthropic");
    let claude_owned = base.starts_with("claude")
        || norm_cmd.contains("resources/native-binary/claude")
        || norm_cmd.contains("@anthropic-ai/claude-code");

    from_claude_extension && claude_owned
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ide_hosts_are_never_claude_backend_targets() {
        let vscode = "Code.exe --extensionHost C:/Users/me/.vscode/extensions/anthropic.claude-code-2.1.181/extension.js";
        assert!(is_ide_host_process("Code.exe", vscode));
        assert!(!is_claude_ide_backend_process("Code.exe", vscode));

        let cursor = "Cursor.exe --extensionHost anthropic.claude-code";
        assert!(is_ide_host_process("Cursor.exe", cursor));
        assert!(!is_claude_ide_backend_process("Cursor.exe", cursor));
    }

    #[test]
    fn claude_extension_backend_is_recyclable() {
        let cmd = "C:/Users/me/.vscode/extensions/anthropic.claude-code-2.1.181-win32-x64/resources/native-binary/claude.exe --resume abc";
        assert!(is_claude_ide_backend_process("claude.exe", cmd));
    }
}
