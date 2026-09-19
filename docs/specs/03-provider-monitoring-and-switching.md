# 03 — Provider Monitoring and Switching

**Audience:** engineers & AI agents · **Scope:** Antigravity, Codex, and Claude provider subsystems · **Verified against:** `1.1.0`

QuotaShift integrates three distinct AI coding ecosystems, each with unique quota structures, authentication protocols, and switching capabilities.

## Provider Architecture Matrix

| Capability | Google Antigravity | OpenAI Codex | Claude Code |
| --- | --- | --- | --- |
| **Quota Pools** | 5-Hour & Weekly Pools | Primary & Secondary (Weekly) Windows | 5-Hour & Weekly Limit Windows |
| **Account Switching** | Full (OAuth & Session Injection) | Full (Loopback Router & Session Write) | Monitor Only (Zero Mutation) |
| **Discovery Method** | Language Server & Cloud API | CLI `auth.json` & OAuth Flow | `CLAUDE_CONFIG_DIR` Profiles |
| **Local Active Detection** | IDE Process Inspection & PID scan | `~/.codex/auth.json` Monitoring | Active CLI Process PID scan |
| **Routing / Failover** | Manual Switching / "Best" Quota | Local Proxy Routing Pools | Threshold Guardrail Suspension |

---

## 1. Google Antigravity Subsystem

### Quota Polling Architecture
- **Dual Pipeline**: Quota is collected either via direct Google Cloud `retrieveUserQuota` API calls using fresh OAuth tokens or via an isolated background language server worker.
- **Worker Isolation**: The language server worker runs in an independent temporary profile (`--user-data-dir`) so it never contends for database locks or interrupts active Antigravity IDE sessions.
- **Quota Buckets**: Automatically parses both 5-hour and weekly quota pools, calculating absolute local reset timestamps (`Resets at: HH:MM`, `Tomorrow at HH:MM`).

### Account Switching Flow
1. User clicks **Apply** on an Antigravity account card.
2. Rust backend verifies and refreshes the OAuth access token using the stored refresh token.
3. Backend safely injects the updated session into the Antigravity IDE configuration database.
4. Active IDE helper processes are gracefully recycled to apply new session state without requiring an IDE restart.
5. "Best" account algorithm allows one-click selection of the account card with the highest remaining quota across visible windows.

---

## 2. OpenAI Codex Subsystem

### Account & Workspace Discovery
- **Multi-Workspace OAuth**: Browser login flow connects with OpenAI OAuth. Accounts with multiple organizations or workspaces are split into dedicated cards with workspace name suffixes.
- **Tier Detection**: Automatically classifies subscription tiers (`Free`, `Plus`, `Pro`, `Team`, `Enterprise`), showing only applicable quota windows (e.g. Plus tiers hide legacy monthly limits).

### Loopback Proxy Router & Model Pools
- **Local Loopback**: Spawns an internal HTTP server on `127.0.0.1:0` protected by 32-byte OsRng bearer tokens.
- **Model Catalog Auto-Discovery**: Probes configured accounts to discover active model availability (`o1`, `gpt-4o`, `o3-mini`, etc.).
- **Account Pools**: Users can group multiple accounts into a pool. When an active account exhausts its 5-hour or weekly limits, the router seamlessly fails over to the next eligible account in the pool.
- **`config.toml` Synchronization**: Automatically synchronizes local `~/.codex/config.toml` with proxy endpoint settings on startup and restores exact byte-for-byte configuration upon app exit, tray quit, or crash recovery.

---

## 3. Claude Code Subsystem

### Multi-Profile Discovery
- **Config Directory Keying**: Monitored profiles are identified by their `CLAUDE_CONFIG_DIR` paths (e.g. `~/.claude.json`, or isolated project configs) without altering local credentials.
- **Auto-Discovery**: Scans standard paths and running processes for active configuration roots.
- **Manual Addition**: Users can add custom config directories via `ClaudeAddAccountModal`.

### Visual & Functional Parity
- Claude cards share full visual alignment with Antigravity and Codex:
  - Account Card Header with copyable configuration path button.
  - Subscription tier badge and usage tone indicators (`success`, `warning`, `critical`).
  - Clear 5-hour and weekly usage progress bars with formatted countdowns.
  - Direct **Reauthenticate** button if tokens become expired or invalid.

### Error Handling & Polling Suspension
- If Claude telemetry returns `401 Unauthorized` or `403 Forbidden`, `useAccountPollSuspension` halts polling for that profile, shows an error banner, and prompts for reauthentication instead of entering infinite polling retry loops.

**Related:** [`02-security-and-credentials`](02-security-and-credentials.md) · [`05-claude-guardrails-and-process-lifecycle`](05-claude-guardrails-and-process-lifecycle.md)

**Next →** [`04-desktop-shell-and-overlay`](04-desktop-shell-and-overlay.md)
