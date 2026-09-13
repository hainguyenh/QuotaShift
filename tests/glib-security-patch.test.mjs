import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const PATCH_REV = '9e2bb20e2daba5b4dc5e2c9f4dee0797a1503b9f';
const PATCH_REPO = 'https://github.com/andrew-wommack-ministries/glib-rustsec-2024-0429-backport';

const cargoToml = readFileSync(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8');
const auditToml = readFileSync(new URL('../src-tauri/.cargo/audit.toml', import.meta.url), 'utf8');

test('RUSTSEC-2024-0429 uses the reviewed glib 0.18.5 backport', () => {
  assert.match(cargoToml, /\[patch\.crates-io\]/);
  assert.ok(
    cargoToml.includes(`glib = { git = "${PATCH_REPO}", rev = "${PATCH_REV}" }`),
    'Cargo.toml must pin the reviewed glib backport by immutable commit SHA'
  );

  assert.ok(
    auditToml.includes(PATCH_REV),
    'the audit exception must document the exact patched source used by Cargo'
  );
  assert.match(
    auditToml,
    /version-based scanner/i,
    'the remaining advisory ignore must be documented as scanner metadata, not runtime mitigation'
  );
});
