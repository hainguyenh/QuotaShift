import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("account-card usage tone helper maps remaining quota to normal, warning, and critical", async () => {
  const { getUsageTone } = await import("../src/utils/common/usage-tone.ts");
  assert.equal(getUsageTone(100), "normal");
  assert.equal(getUsageTone(20), "normal");
  assert.equal(getUsageTone(19.9), "warning");
  assert.equal(getUsageTone(10), "warning");
  assert.equal(getUsageTone(9.9), "critical");
  assert.equal(getUsageTone(0), "critical");
  assert.equal(getUsageTone(null), "normal");
});

test("Antigravity, Codex, and Claude account cards attach usage tones to remaining percentages", () => {
  const antigravity = read("src/components/antigravity/AntigravityQuotaRows.tsx");
  const codex = read("src/components/codex/CodexCardUsageLimits.tsx");
  const claudeCards = read("src/components/claude/ClaudeAccountCards.tsx");

  assert.match(
    antigravity,
    /data-usage-tone=\{getUsageTone\(lane\.known \? lane\.percent : null\)\}/,
  );
  assert.match(codex, /data-usage-tone=\{getUsageTone\(pct\)\}/);
  assert.match(claudeCards, /data-usage-tone=\{getUsageTone\(remaining\)\}/);
});

test("warning and critical tones color both account-card bars and percentage values", () => {
  const panel = read("src/styles/panel.css");
  const claude = read("src/styles/claude.css") + read("src/styles/claude-accounts.css");

  assert.match(panel, /data-usage-tone="warning"[\s\S]*\.progress-bar[\s\S]*background:\s*#c2410c/);
  assert.match(panel, /data-usage-tone="warning"[\s\S]*\.quota-value[\s\S]*color:\s*#c2410c/);
  assert.match(
    panel,
    /data-usage-tone="critical"[\s\S]*\.progress-bar[\s\S]*background:\s*#b91c1c/,
  );
  assert.match(panel, /data-usage-tone="critical"[\s\S]*\.quota-value[\s\S]*color:\s*#b91c1c/);

  assert.match(claude, /claude-account-card[\s\S]*data-usage-tone="warning"[\s\S]*progress-bar/);
  assert.match(claude, /claude-account-card[\s\S]*data-usage-tone="critical"[\s\S]*quota-value/);
});
