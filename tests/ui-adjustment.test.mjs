import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

const sourceUrl = new URL("../src/utils/common/ui-adjustment.ts", import.meta.url);

test("UI adjustment preference module exists", () => {
  assert.equal(existsSync(sourceUrl), true);
});

test("UI adjustment normalizes overlay scale and theme", async (t) => {
  if (!existsSync(sourceUrl)) return t.skip("production module not implemented yet");
  const mod = await import("../.test-build/common/ui-adjustment.js");
  const normalized = mod.normalizeUiAdjustmentPreferences({
    overlayWidth: 999,
    overlayHeight: 1,
    overlayScale: 500,
    overlayTheme: "black-white",
    panelScale: 1,
  });

  assert.deepEqual(normalized, { overlayScale: 200, overlayTheme: "black-white" });
  assert.deepEqual(mod.UI_ADJUSTMENT_DEFAULTS, {
    overlayScale: 100,
    overlayTheme: "glassmorphism",
  });
  assert.equal("overlayWidth" in normalized, false);
  assert.equal("overlayHeight" in normalized, false);
  assert.equal("panelScale" in normalized, false);
  assert.deepEqual(mod.UI_ADJUSTMENT_LIMITS.overlayScale, { min: 80, max: 200 });
});

test("invalid overlay theme falls back to glassmorphism", async (t) => {
  if (!existsSync(sourceUrl)) return t.skip("production module not implemented yet");
  const mod = await import("../.test-build/common/ui-adjustment.js");

  assert.deepEqual(mod.normalizeUiAdjustmentPreferences({ overlayTheme: "neon" }), {
    overlayScale: 100,
    overlayTheme: "glassmorphism",
  });
});

test("legacy overlay dimensions are ignored while scale is preserved and theme defaults", async (t) => {
  if (!existsSync(sourceUrl)) return t.skip("production module not implemented yet");
  const mod = await import("../.test-build/common/ui-adjustment.js");
  const stored = JSON.stringify({
    overlayWidth: 390,
    overlayHeight: 126,
    overlayScale: 110,
    panelScale: 100,
  });
  const storage = { getItem: () => stored, setItem: () => {} };

  assert.deepEqual(mod.loadUiAdjustmentPreferences(storage), {
    overlayScale: 110,
    overlayTheme: "glassmorphism",
  });
});

test("overlay theme preference persists with normalized values", async (t) => {
  if (!existsSync(sourceUrl)) return t.skip("production module not implemented yet");
  const mod = await import("../.test-build/common/ui-adjustment.js");
  let stored = "";
  const storage = {
    getItem: () => stored || null,
    setItem: (_key, value) => {
      stored = value;
    },
  };

  mod.saveUiAdjustmentPreferences({ overlayScale: 105, overlayTheme: "black-white" }, storage);

  assert.deepEqual(JSON.parse(stored), {
    overlayScale: 105,
    overlayTheme: "black-white",
  });
  assert.deepEqual(mod.loadUiAdjustmentPreferences(storage), {
    overlayScale: 105,
    overlayTheme: "black-white",
  });
});

test("overlay native geometry scales uniformly from one fixed base size", async (t) => {
  if (!existsSync(sourceUrl)) return t.skip("production module not implemented yet");
  const mod = await import("../.test-build/common/ui-adjustment.js");
  assert.equal(mod.OVERLAY_BASE_WIDTH, 340);
  assert.equal(mod.OVERLAY_BASE_HEIGHT, 80);

  const prefs = mod.normalizeUiAdjustmentPreferences({ overlayScale: 120 });
  assert.equal(mod.getOverlayWindowWidth(prefs), 408);
  assert.equal(mod.getOverlayWindowWidth(prefs, "antigravity"), 408);
  assert.equal(mod.getOverlayWindowWidth(prefs, "codex"), 264);
  assert.equal(mod.getOverlayWindowWidth(prefs, "claude"), 264);
  assert.equal(mod.getOverlayWindowHeight(prefs), 96);
  assert.equal(mod.getOverlayWindowHeight(prefs, "antigravity"), 96);
  assert.equal(mod.getOverlayWindowHeight(prefs, "codex"), 82);
  assert.equal(mod.getOverlayWindowHeight(prefs, "claude"), 82);
});
