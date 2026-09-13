# QuotaShift

[![License: MIT](https://img.shields.io/badge/License-MIT-black?style=flat-square&labelColor=black)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri-v2-black?style=flat-square&labelColor=black&logo=tauri&logoColor=white)](https://tauri.app/)
[![Built from GHA](https://img.shields.io/badge/Built%20from%20GHA-%E2%9C%93-black?style=flat-square&labelColor=black&logo=githubactions&logoColor=white)](https://github.com/the-long-ride/QuotaShift/actions/workflows/publish.yml)
[![Downloads](https://img.shields.io/github/downloads/the-long-ride/QuotaShift/total?style=flat-square&labelColor=black&color=black&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDE2IDE2Ij48cGF0aCBmaWxsPSJ3aGl0ZSIgZD0iTTIuNzUgMTRBMS43NSAxLjc1IDAgMCAxIDEgMTIuMjV2LTIuNWEuNzUuNzUgMCAwIDEgMS41IDB2Mi41YzAgLjEzOC4xMTIuMjUuMjUuMjVoMTAuNWEuMjUuMjUgMCAwIDAgLjI1LS4yNXYtMi41YS43NS43NSAwIDAgMSAxLjUgMHYyLjVBMS43NSAxLjc1IDAgMCAxIDEzLjI1IDE0WiIvPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJNNy4yNSA3LjY4OVYyYS43NS43NSAwIDAgMSAxLjUgMHY1LjY4OWwxLjk3LTEuOTY5YS43NDkuNzQ5IDAgMSAxIDEuMDYgMS4wNmwtMy4yNSAzLjI1YS43NDkuNzQ5IDAgMCAxLTEuMDYgMEw0LjIyIDYuNzhhLjc0OS43NDkgMCAxIDEgMS4wNi0xLjA2bDEuOTcgMS45NjlaIi8+PC9zdmc+&label=)](https://github.com/the-long-ride/QuotaShift/releases/latest)
[![Antigravity](https://img.shields.io/badge/Antigravity-black?style=flat-square&labelColor=black&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1NDAgNTQwIiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTI2NSw4NEwyODIsODVMMjkzLDg4TDMwNSw5NEwzMjAsMTA2TDMzMCwxMThMMzM5LDEzMkwzNDgsMTUwTDM1OSwxNzhMMzY4LDIwNkwzOTQsMzAwTDQxMSwzNDhMNDE4LDM2Mkw0MTgsMzY0TDQzMiwzOTBMNDQ3LDQxMUw0NjQsNDI5TDQ2OSw0MzhMNDcwLDQ0M0w0NjgsNDQ5TDQ2Myw0NTNMNDQ5LDQ1NEw0MzYsNDQ5TDQxOCw0MzZMMzk5LDQxOEwzODIsMzk3TDM2OCwzNzZMMzM5LDMyNkwzMjYsMzA5TDMxMywyOTdMMjk4LDI4OEwyODksMjg1TDI3MywyODNMMjYxLDI4M0wyNDYsMjg2TDIyNSwyOTdMMjA5LDMxM0wyMDAsMzI1TDE2OSwzNzhMMTUxLDQwNEwxNDEsNDE2TDExOSw0MzdMOTksNDUxTDg1LDQ1NUw3OSw0NTVMNzEsNDUyTDY3LDQ0NUw2OSw0MzdMNzQsNDI5TDkzLDQwOUwxMDcsMzg5TDEyNCwzNTZMMTQzLDMwNEwxNDMsMzAxTDE0NywyOTFMMTQ3LDI4OEwxNTcsMjU2TDE1OCwyNDlMMTY0LDIzMUwxNjcsMjE3TDE4MCwxNzZMMTg5LDE1M0wyMDAsMTMxTDIxMywxMTJMMjMwLDk2TDI0Myw4OUwyNTIsODZMMjY0LDg1TDI2NSw4NFoiLz48L3N2Zz4=)](https://antigravity.google/)
[![OpenAI Codex](https://img.shields.io/badge/OpenAI%20Codex-black?style=flat-square&labelColor=black&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIiBmaWxsPSJ3aGl0ZSI+PHBhdGggZD0iTTQ3NC4xMjMgMjA5LjgxYzExLjUyNS0zNC41NzcgNy41NjktNzIuNDIzLTEwLjgzOC0xMDMuOTA0LTI3LjY5Ni00OC4xNjgtODMuNDMzLTcyLjk0LTEzNy43OTQtNjEuNDE0YTEyNy4xNCAxMjcuMTQgMCAwMC05NS40NzUtNDIuNDljLTU1LjU2NCAwLTEwNC45MzYgMzUuNzgxLTEyMi4xMzkgODguNTkzLTM1Ljc4MSA3LjM5Ny02Ni41NzQgMjkuNzYtODQuNjM3IDYxLjQxNC0yNy44NjggNDguMTY3LTIxLjUwMyAxMDguNzIgMTUuODI2IDE1MC4wMDctMTEuNTI1IDM0LjU3OC03LjU2OSA3Mi40MjQgMTAuODM4IDEwMy43MzMgMjcuNjk2IDQ4LjM0IDgzLjQzMyA3My4xMTEgMTM3Ljk2NiA2MS41ODUgMjQuMDg0IDI3LjE4IDU4LjgzMyA0Mi44MzUgOTUuMzAzIDQyLjY2MyA1NS41NjQgMCAxMDQuOTM2LTM1Ljc4MiAxMjIuMTM5LTg4LjU5NCAzNS43ODItNy4zOTcgNjYuNTc0LTI5Ljc2IDg0LjQ2NS02MS40MTMgMjguMDQtNDguMTY4IDIxLjY3Ni0xMDguNzIyLTE1LjY1NC0xNTAuMDA4di0uMTcyem0tMzkuNTY3LTg3LjIxOGMxMS4wMSAxOS4yNjcgMTUuMTM5IDQxLjgwMyAxMS4zNTQgNjMuNjUtLjY4OC0uNTE2LTIuMDY0LTEuMjA0LTIuOTI0LTEuNzJsLTEwMS4xNTItNTguNDlhMTYuOTY1IDE2Ljk2NSAwIDAwLTE2LjY4NyAwTDIwNi42MjEgMTk0LjV2LTUwLjIzMmw5Ny44ODMtNTYuNTk3YzQ1LjU4Ny0yNi4zMiAxMDMuNzMyLTEwLjY2NiAxMzAuMDUyIDM0LjkyMXptLTIyNy45MzUgMTA0LjQybDQ5Ljg4OC0yOC45IDQ5Ljg4NyAyOC45djU3LjYzbC00OS44ODcgMjguOS00OS44ODgtMjguOXYtNTcuNjN6bTIzLjIyMy0xOTEuODFjMjIuMzY0IDAgNDMuODY3IDcuNzQyIDYxLjA3IDIyLjAyLS42ODguMzQ0LTIuMDY0IDEuMjA0LTMuMDk3IDEuNzJMMTg2LjY2NiAxMTcuMjZjLTUuMTYxIDIuOTI1LTguMjU4IDguNDMtOC4yNTggMTQuNDV2MTM2LjkzNGwtNDMuNTIzLTI1LjExNlYxMzAuMzMzYzAtNTIuNjQgNDIuNDkxLTk1LjEzIDk1LjEzMS05NS4zMDJsLS4xNzIuMTcyek01Mi4xNCAxNjguNjk3YzExLjE4Mi0xOS4yNjggMjguNTU3LTM0LjA2MiA0OS41NDQtNDEuODAzVjI0Ny4xNGMwIDYuMDIgMy4wOTcgMTEuMzU0IDguMjU4IDE0LjQ1bDExOC4zNTQgNjguMjk1LTQzLjY5NSAyNS4yODgtOTcuNzExLTU2LjQyNWMtNDUuNDE1LTI2LjMyLTYxLjA3LTg0LjQ2NS0zNC43NS0xMzAuMDUyem0yNi42NjUgMjIwLjcxYy0xMS4xODItMTkuMDk1LTE1LjEzOS00MS44MDItMTEuMzU0LTYzLjY1LjY4OC41MTYgMi4wNjQgMS4yMDQgMi45MjQgMS43MmwxMDEuMTUyIDU4LjQ5YTE2Ljk2NSAxNi45NjUgMCAwMDE2LjY4NyAwbDExOC4zNTQtNjguNDY3djUwLjIzMmwtOTcuODgzIDU2LjQyNWMtNDUuNTg3IDI2LjE0OC0xMDMuNzMyIDEwLjY2NS0xMzAuMDUyLTM0Ljc1aC4xNzJ6bTIwNC41NCA4Ny4zOWMtMjIuMTkyIDAtNDMuODY3LTcuNzQxLTYwLjg5OC0yMi4wMmE2Mi40MzkgNjIuNDM5IDAgMDAzLjA5Ny0xLjcybDEwMS4xNTItNTguMzE3YzUuMTYtMi45MjQgOC40MjktOC40MyA4LjI1Ny0xNC40NVYyNDMuNTI3bDQzLjUyMyAyNS4xMTZ2MTEzLjAyMmMwIDUyLjY0LTQyLjY2MyA5NS4zMDMtOTUuMTMxIDk1LjMwM3YtLjE3MnpNNDYxLjIyIDM0My4zMDNjLTExLjE4MiAxOS4yNjctMjguNzI5IDM0LjA2MS00OS41NDQgNDEuNjNWMjY0LjY4N2MwLTYuMDIxLTMuMDk3LTExLjUyNi04LjI1Ny0xNC40NUwyODQuODkzIDE4MS43N2w0My41MjMtMjUuMTE2IDk3Ljg4MyA1Ni40MjRjNDUuNTg3IDI2LjMyIDYxLjA3IDg0LjQ2NiAzNC43NSAxMzAuMDUzbC4xNzIuMTcyeiIvPjwvc3ZnPg==)](https://chatgpt.com/)
[![Claude](https://img.shields.io/badge/Claude-black?style=flat-square&labelColor=black&logo=claude&logoColor=white)](https://claude.ai/)

> Quota monitoring and account switching for AI coding tools.

QuotaShift is a desktop application built with Tauri that tracks quota limits, reset windows, and balances for Google Antigravity, OpenAI Codex, and Anthropic Claude. You can monitor usage from the system tray or a desktop overlay and switch active credentials in one click.

---

## Preview

| Antigravity Tab | ChatGPT Codex Tab | Claude Tab |
|---|---|---|
| <img src="assets/demo-pics/Antigravity-tab.png" width="100%" alt="Antigravity Tab"> | <img src="assets/demo-pics/Codex-tab.png" width="100%" alt="Codex Tab"> | <img src="assets/demo-pics/Claude-tab.png" width="100%" alt="Claude Tab"> |

<p align="center">
  <strong>Desktop Overlay HUD</strong><br>
  <img src="assets/demo-pics/Overlay.png" width="60%" alt="Desktop Overlay HUD">
</p>

---

## Key features

### Desktop overlay
- Translucent HUD showing dual limits, the active model, and usage percentages.
- Edge clamping on Windows keeps the overlay within screen bounds across multiple monitors.
- Width adjusts automatically for the tracked platform.
- Right-click menu lets you refresh quotas, open the dashboard, or hide the overlay.
- Hover tooltips show exact remaining quota, token counts, and reset times.

### Google Antigravity
- Track 5-hour and weekly quota pools with absolute reset times.
- Inspect quotas through background language server workers without locking the active IDE session.
- Detect unsaved IDE sessions with a pinned card and capture them in one click.
- Switch accounts by updating local IDE credentials, refreshing OAuth tokens before writing, and restarting processes cleanly.
- Pick the account with the most remaining quota using the Best button.
- Background keep-alive loop refreshes OAuth access tokens to prevent session expiration.
- Drag and drop account cards to save a custom sort order.

### OpenAI Codex
- Monitor Free, Plus, Pro, and Team accounts with primary and weekly usage windows.
- Local loopback proxy router (`127.0.0.1:0`) with random 32-byte bearer tokens from `OsRng`.
- Query model availability across saved accounts to find shared model support.
- Group accounts into routing pools with automatic failover when limits are reached.
- Sync provider settings in `config.toml` with automatic restore on exit, tray quit, or crash recovery.
- Process manager stops active Codex CLI, ChatGPT desktop, and extension processes before credential switches.

### Anthropic Claude
- Read-only bridge that monitors local Claude Code `statusLine` output and `~/.claude/projects/` transcripts.
- Shows the active model, token velocity, context window percentage and size, estimated USD cost, run duration, and prompt cache hits.
- Aggregates local token use over 5-hour and 7-day rolling windows.
- Pin local Claude sessions to the desktop overlay with the Track button.
- Stores no credentials, runs no proxy, and makes no network requests to Anthropic.

### Dashboard and backups
- Search accounts in real time across Antigravity and Codex tabs.
- Export and import accounts using AES-256-GCM passphrase-encrypted backups.
- Reveal exported backups directly in Windows Explorer, macOS Finder, or Linux file managers.
- Switch between compact and expanded card layouts.
- Set custom poll intervals for tracked and idle accounts.
- Confirmation modals protect against accidental account deletion or process termination.
- Minimize to the system tray with live usage tooltips.

---

## Security and storage

- Account credentials are encrypted with AES-256-GCM, backed by Windows Credential Manager, macOS Keychain, or Linux Secret Service.
- Sensitive values stay in memory and are not saved to unencrypted browser storage.
- Subprocess credentials pass through standard input (`sys.stdin`) instead of command arguments (`sys.argv`).
- Configuration files use restricted file permissions (`0600` files, `0700` directories) and reject symlinks (`O_NOFOLLOW`).
- Local proxy checks bearer tokens in constant time and requires loopback host headers.
- Update notifications link to official GitHub release pages for manual verification.

---

## Platform risks and terms of use

Account switching and proxying interact with each provider's usage terms and abuse protections.

### Platform comparison

| Platform | Multi-account support | Credential switching | Proxy router | Risk level | Main consideration |
|---|---|---|---|---|---|
| Google Antigravity | Yes | Yes | No | Low to moderate | Account checkpoints when switching frequently on one IP |
| OpenAI Codex | Yes | Yes | Yes (local) | Moderate | Terms against bypassing rate limits through account pools |
| Anthropic Claude | No | No | No | None (zero risk) | Read-only local monitoring; no credential handling |

---

### Google Antigravity
QuotaShift reads usage through background workers or OAuth endpoints. When you apply an account, QuotaShift updates IDE configuration files and restarts active IDE or CLI (`agy`) processes.

- Rapidly switching Google accounts from the same machine and IP address may trigger Google security checks, including phone verification or OAuth re-consent.
- Credential switches stop running Antigravity processes. Save active files before applying a new account.
- Creating disposable accounts to cycle free quota violates Google's terms. Use QuotaShift with legitimate accounts.

### OpenAI Codex
QuotaShift manages credentials in `~/.codex/auth.json` and can route requests across accounts through a local proxy (`127.0.0.1:0`).

- OpenAI terms prohibit using proxy pools or multiple accounts to bypass subscription rate limits.
- Rotating tokens aggressively across accounts can lead to HTTP 429 errors, revoked sessions, or account suspension.
- Switching accounts terminates running Codex CLI sessions, desktop apps, and extension servers. Do not switch during active generations.

### Why Claude does not support account switching
QuotaShift does not support multi-account management or account switching for Claude. This is intentional:

- **Anthropic terms prohibit rate limit evasion**: Anthropic's Commercial Terms, Usage Policy, and Claude Code terms forbid using multiple accounts to bypass usage limits, such as the 5-hour message cap on Pro and Team plans. They also forbid credential sharing and automated account pooling.
- **Enforcement leads to permanent bans**: Anthropic actively monitors account cycling and automated credential swapping. Violations result in immediate account termination, forfeiture of paid balances, and bans on associated payment methods and phone numbers.
- **Safe by design**: To protect user accounts from bans, QuotaShift never manages Claude credentials.
- **Local read-only observer**: The Claude tab only reads local telemetry from the Claude Code `statusLine` hook and on-disk transcripts in `~/.claude/projects/`. It does not store tokens, does not switch sessions, and never contacts Anthropic authentication servers.

---

## Setup and guides

- For installation packages and local development steps, see [GUIDELINE.md](file:///F:/my-repos/my-opensources/QuotaShift/GUIDELINE.md).
- For release notes and version history, see [CHANGELOG.md](file:///F:/my-repos/my-opensources/QuotaShift/CHANGELOG.md).

---

## License

This project is licensed under the MIT License. See [LICENSE](file:///F:/my-repos/my-opensources/QuotaShift/LICENSE) for details.

