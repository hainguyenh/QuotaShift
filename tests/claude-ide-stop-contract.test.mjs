import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Claude auto-stop recycles only Claude IDE backends and never kills the IDE host", () => {
  const process = read("src-tauri/src/claude/process.rs");
  const ideProcess = read("src-tauri/src/claude/ide_process.rs");
  const mod = read("src-tauri/src/claude/mod.rs");

  assert.match(mod, /pub mod ide_process;/);
  assert.match(ideProcess, /pub\s+fn\s+is_ide_host_process\s*\(/);
  assert.match(ideProcess, /pub\s+fn\s+is_claude_ide_backend_process\s*\(/);
  assert.match(ideProcess, /code|vscode/i);
  assert.match(ideProcess, /cursor/i);
  assert.match(ideProcess, /windsurf/i);
  assert.match(ideProcess, /codium|vscodium/i);
  assert.match(ideProcess, /if\s+is_ide_host_process\([^)]*\)\s*\{\s*return\s+false;/s);
  assert.match(process, /if\s+is_ide_host_process\([^)]*\)\s*\{\s*return\s+false;/s);
  assert.match(process, /ide_backend_killed/);
  assert.match(process, /ide_backend_restarted/);
  assert.match(process, /is_claude_ide_backend_process[\s\S]*process\.kill\(\)/);
});
