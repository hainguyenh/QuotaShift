# 06 — Settings and Configuration

**Audience:** engineers & AI agents · **Scope:** application configuration, storage keys, and defaults · **Verified against:** `1.1.0`

QuotaShift provides a centralized, accessible Settings dialog organized into a five-tab vertical sidebar navigation system.

## 1. Settings Navigation Architecture

```text
SettingsModal.tsx
  ├── Sidebar Navigation (Vertical Tabs)
  │     ├── Monitoring (Poll Rates, Adaptive Intervals, Guardrail Rate)
  │     ├── Appearance (App Theme, Card View Modes, Platform Visibility)
  │     ├── Keyboard Shortcuts (Overlay Toggle, Quota Refresh, Key Rebinding)
  │     ├── Data (Passphrase Encrypted Export & Import, Backup Reveal)
  │     └── Overlay (Overlay Toggle, Theme, UI Scale, Reset Geometry)
  └── Content Pane (Divided Rows with Segmented Switch Toggles)
```

## 2. Configuration Options & Defaults

| Section | Setting Key | Description | Type / Values | Default |
| --- | --- | --- | --- | --- |
| **Monitoring** | `poll_interval_tracked` | Polling frequency for the actively tracked account | integer (seconds) | `30` (30s) |
| **Monitoring** | `poll_interval_idle` | Background polling frequency for untracked accounts | integer (seconds) | `600` (10 min) |
| **Monitoring** | `claude_guardrail_poll_interval` | Dedicated polling rate when Claude guardrails are active | integer (seconds) | `20` (20s) |
| **Appearance** | `theme` | Application visual mode (Dark / Light) | `'dark' \| 'light'` | `'dark'` |
| **Appearance** | `card_layout_mode` | Account card density mode | `'compact' \| 'expanded'` | `'compact'` |
| **Appearance** | `platform_visibility` | Toggle visibility of provider tabs | Record<string, boolean> | `{ ag: true, codex: true, claude: true }` |
| **Shortcuts** | `shortcuts_overlay_toggle` | Global key binding to show/hide overlay | string shortcut | `CommandOrControl+Shift+O` |
| **Shortcuts** | `shortcuts_refresh_quota` | Global key binding to refresh monitored usage | string shortcut | `CommandOrControl+Shift+R` |
| **Shortcuts** | `shortcuts_enabled` | Per-binding registration switch | boolean | `true` |
| **Overlay** | `overlay_theme` | Overlay aesthetic HUD style | `'glassmorphism' \| 'blackwhite'` | `'glassmorphism'` |
| **Overlay** | `overlay_ui_scale` | Whole-surface overlay scale | float (0.8 to 2.0) | `1.0` (100%) |
| **Shell** | `main_window_zoom` | Native WebView zoom scale | float (0.7 to 1.9) | `1.0` (100%) |

## 3. Storage Hierarchy & Key Catalog

```text
Secure Vault (OS Keyring via Keyring Crate)
  ├── ag_accounts                  (Antigravity account sessions, refresh tokens)
  ├── codex_accounts               (Codex account tokens, workspace IDs)
  └── codex_pools                  (Loopback routing pools, member accounts)

localStorage (Non-Sensitive UI Preferences)
  ├── poll_interval_tracked        (Tracked poll rate in seconds)
  ├── poll_interval_idle           (Idle poll rate in seconds)
  ├── theme                        (Dark / light mode)
  ├── main_window_zoom             (Dashboard zoom factor)
  ├── card_layout_mode             (Compact / expanded view)
  ├── overlay_theme                (HUD visual theme)
  ├── overlay_ui_scale             (HUD scale percentage)
  ├── overlay_window_pos           (Last known X/Y screen coordinates)
  ├── shortcuts_config             (Custom key combination bindings)
  └── ag_card_order / codex_card_order (Custom drag-and-drop sort order)
```

## 4. UI Switch Component Contract

All boolean configuration controls utilize the custom `<Switch>` component:
- Segmented pill track with sliding circular thumb.
- Supports keyboard navigation (`Space` / `Enter` toggle).
- Accessible ARIA role `role="switch"` with `aria-checked` states.
- Clean white active pill styling on dark backgrounds with zero outline bleed.

**Related:** [`04-desktop-shell-and-overlay`](04-desktop-shell-and-overlay.md) · [`07-backup-and-recovery`](07-backup-and-recovery.md)

**Next →** [`07-backup-and-recovery`](07-backup-and-recovery.md)
