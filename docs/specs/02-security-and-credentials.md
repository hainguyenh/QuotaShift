# 02 — Security and Credentials

**Audience:** engineers & AI agents · **Scope:** secrets storage, process boundaries, and auth isolation · **Verified against:** `1.1.0`

QuotaShift manages high-value AI subscription credentials. It adheres to strict zero-trust storage, argument sanitation, and isolation policies.

## 1. Operating System Secure Credential Storage

Account OAuth tokens (access tokens and refresh tokens) are encrypted and stored via the `keyring` crate using native platform credential stores:

| Platform | Native Vault Technology | Encryption Standard |
| --- | --- | --- |
| **Windows** | Windows Credential Manager | AES-256 via DPAPI |
| **macOS** | Keychain Services (`security`) | AES-256 via Secure Enclave |
| **Linux** | Secret Service API (Freedesktop / GNOME Keyring / KWallet) | AES-256-GCM |

No account credentials, passwords, or refresh tokens are ever stored as plaintext in browser `localStorage`, SQLite databases, or log files.

## 2. Secure Storage Facade

The frontend interacts with credentials through a secure facade (`src/utils/auth/secure-storage-migration.ts`):

```text
Frontend Component
       │
       ▼ (Read/Write)
Storage Facade (In-Memory Cache)
       │
       ▼ (Serialized Writes)
Rust Backend Command (`secure_store_set`, `secure_store_get`, `secure_store_delete`)
       │
       ▼
Platform Keyring / AES-256-GCM Vault
```

### Invariants:
- `localStorage` reads for protected keys (`ag_accounts`, `codex_accounts`, `codex_pools`) return data cached in memory during initial app bootstrap (`useAppSessionBootstrap`).
- Writes and deletes are queued and serialized to prevent concurrency race conditions.
- If the native keyring is locked or unavailable, operations fail closed; no plaintext fallback to unencrypted disk is permitted.

## 3. Subprocess Argument Hardening

When QuotaShift launches helper processes (such as Python scripts for isolated Antigravity worker profiles or Codex session writers):

- **No Credentials in Command-Line Arguments**: `sys.argv` is strictly audited (`scripts/` and Rust callers). Command arguments are visible to any unprivileged user on the operating system via task managers or `ps`.
- **Standard Input Streaming**: All sensitive authentication payloads, tokens, and credentials stream exclusively via standard input (`sys.stdin`) as JSON strings.
- **Pipe Destruction**: Subprocess stdin pipes are immediately closed after payload delivery.

## 4. Loopback Proxy Security (`127.0.0.1:0`)

The local Codex model router proxy enforces strict perimeter controls:

- **Loopback Binding Only**: The HTTP server binds exclusively to `127.0.0.1:0` (dynamic OS-assigned loopback port). It never listens on `0.0.0.0` or public network interfaces.
- **Per-Listener Secret Generation**: On every startup, QuotaShift generates a 32-byte cryptographically secure random token from `rand::rngs::OsRng`.
- **Constant-Time Verification**: Incoming requests to the proxy must supply the secret via the `Authorization: Bearer <token>` header. Bearer tokens are validated in constant time (`subtle::ConstantTimeEq`) to prevent timing side-channel attacks.
- **Host & Origin Validation**: Proxy requests verify that the `Host` header targets `127.0.0.1` or `localhost`. External browser origins are rejected.

## 5. Filesystem Permissions & Symlink Rejection

Configuration files and temporary workspaces managed by QuotaShift enforce strict filesystem protection:

- **Unix Permissions**: Directories are created with mode `0700` (owner read/write/execute only); files are created with mode `0600` (owner read/write only).
- **Symlink Traversal Prevention**: File open operations specify `O_NOFOLLOW` where supported, preventing symlink redirection attacks into sensitive system paths.
- **Exclusive File Creation**: Atomic file creations utilize `O_EXCL` / `CREATE_NEW` flags to eliminate race conditions on credential export and cache writes.

## 6. Update Security Policy

- QuotaShift never executes in-place binary patch downloads or unsigned installers.
- Update notifications compare the current semantic version against the latest GitHub release.
- Clicking "Download new version" invokes the OS browser directly to the canonical HTTPS repository release page:
  `https://github.com/the-long-ride/QuotaShift/releases/latest`

**Related:** [`01-system-overview`](01-system-overview.md) · [`07-backup-and-recovery`](07-backup-and-recovery.md)

**Next →** [`03-provider-monitoring-and-switching`](03-provider-monitoring-and-switching.md)
