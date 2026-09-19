# QuotaShift Software Specifications

For engineers and AI agents. Each file answers one question in ≤ 2 minutes. Verified against `1.1.0`.

| #   | File                                                                                     | Answers the question                                                                                |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 01  | [system-overview](01-system-overview.md)                                                 | What are the moving parts, runtime planes, and central invariants?                                  |
| 02  | [security-and-credentials](02-security-and-credentials.md)                               | How are credentials encrypted, isolated in storage, and protected from leakage?                     |
| 03  | [provider-monitoring-and-switching](03-provider-monitoring-and-switching.md)             | How do Google Antigravity, OpenAI Codex, and Claude Code quota tracking and switching work?        |
| 04  | [desktop-shell-and-overlay](04-desktop-shell-and-overlay.md)                             | How do borderless desktop window controls, native WebView zoom, and the overlay HUD work?           |
| 05  | [claude-guardrails-and-process-lifecycle](05-claude-guardrails-and-process-lifecycle.md) | How do Claude Code profile discovery, threshold guardrails, and safe process suspension operate?   |
| 06  | [settings-and-configuration](06-settings-and-configuration.md)                           | What preferences exist, where are they persisted, and what are their defaults?                      |
| 07  | [backup-and-recovery](07-backup-and-recovery.md)                                         | How does encrypted backup export/import work across operating systems?                              |

## Authoritative As-Built Specification

- [v1.1.0 As-Built Specification](../superpowers/specs/2026-09-19-v1-1-0-as-built-sync.md)

**Reading order:** top to bottom. **User manual & setup:** [`../../GUIDELINE.md`](../../GUIDELINE.md).

Start: [01-system-overview](01-system-overview.md) →
