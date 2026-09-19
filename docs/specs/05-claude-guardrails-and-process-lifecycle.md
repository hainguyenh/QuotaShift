# 05 — Claude Guardrails and Process Lifecycle

**Audience:** engineers & AI agents · **Scope:** Claude Code guardrails, process supervision, and auto-resume · **Verified against:** `1.1.0`

QuotaShift provides automated protection against Claude Code overage and rate-limit exhaustion through configurable quota guardrails and safe process lifecycle management.

## 1. Threshold Configuration & Monitoring Loop

Claude Code guardrails operate per-profile with independent controls:

```text
Claude Account Card
  ├── Master Guardrail Switch (ON / OFF)
  ├── 5-Hour Limit Threshold Switch (Default: 80%)
  └── Weekly Limit Threshold Switch (Default: 90%)
```

- **Dedicated Guardrail Poll Interval**: When guardrails are enabled and an account is actively monitored, polling shifts to an aggressive dedicated rate (default 20 seconds) to catch rapid token consumption before hard limits trip.
- **Collapsed Summary Display**: When the guardrails card section is collapsed, a dynamic status line reflects the active rate and configured thresholds (e.g. `20s poll · 5h: 80% · Wk: 90%`).

## 2. One-Shot Suspension Lifecycle

When a monitored profile's usage crosses either configured threshold:

```text
Usage >= Threshold
       │
       ▼
1. Scan Process Tree for CLAUDE_CONFIG_DIR matches
       │
       ▼
2. Record Process Identity (PID, Start Time, Config Directory)
       │
       ▼
3. Issue SIGSTOP / NtSuspendProcess to Target Processes
       │
       ▼
4. Disable Guardrail Switches (One-Shot Safety Invariant)
       │
       ▼
5. Post In-App Warning Banner & Native OS Notification
```

### Safety Invariants:
1. **One-Shot Auto-Disable**: Guardrail switches turn off immediately after suspension. This prevents repeated suspension loops or oscillation if the user temporarily resumes work.
2. **Zero In-IDE Crashes**: If Claude Code runs within VS Code or JetBrains IDEs, QuotaShift suspends only the underlying Node.js CLI process worker, leaving the IDE interface responsive.
3. **Cross-Platform Notifications**: Emits native desktop notifications via `tauri-plugin-notification` alongside persistent dashboard alerts.

## 3. Process Resumption & Verification

QuotaShift provides two recovery paths: **Manual Resume** and **Auto-Resume at Quota Reset**.

### Manual Resume Flow
- User clicks "Resume" on the alert banner or card action.
- The backend verifies that the PID is still alive and matches the recorded start time before sending `SIGCONT` / `NtResumeProcess`.

### Auto-Resume at Quota Reset
Auto-resume is **disabled by default**. When enabled by the user:

- The process identity is held in memory along with the reset window timestamps.
- **Fail-Closed Reset Verification**:
  - Auto-resume triggers **only** when **all** quota windows that crossed thresholds have reached their reset timestamp.
  - If reset timestamp data is missing, stale, errored, or unverified, QuotaShift keeps the process suspended.
  - If the process exited or was killed externally during suspension, QuotaShift clears the state cleanly without throwing errors.

**Related:** [`03-provider-monitoring-and-switching`](03-provider-monitoring-and-switching.md) · [`06-settings-and-configuration`](06-settings-and-configuration.md)

**Next →** [`06-settings-and-configuration`](06-settings-and-configuration.md)
