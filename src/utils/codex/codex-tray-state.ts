import type { CodexAccount, CodexMonitoredInfo } from "../common/types";

const remaining = (window: any): number | null =>
  typeof window?.used_percent === "number"
    ? Math.max(0, Math.min(100, Math.round(100 - window.used_percent)))
    : null;

export const shouldSyncTrackedCodex = (
  trackedProvider: "antigravity" | "codex" | "claude",
  trackedAccountId: string | null,
  accountId: string,
): boolean => trackedProvider === "codex" && trackedAccountId === accountId;

export const buildMonitoredCodexInfo = (account: CodexAccount, usage: any): CodexMonitoredInfo => {
  const rateLimit = usage?.rate_limit ?? usage?.snapshot?.rate_limit ?? null;
  const primary = usage?.primary ?? rateLimit?.primary_window ?? null;
  const secondary =
    usage?.secondary ?? rateLimit?.secondary_window ?? rateLimit?.weekly_window ?? null;
  return {
    accountId: account.id,
    label: account.label || account.email || "Codex",
    primaryPercent: remaining(primary),
    primaryLabel: "5h",
    secondaryPercent: remaining(secondary),
    secondaryLabel: "wk",
  };
};
