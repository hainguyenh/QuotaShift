export type TrackedProviderTab = "antigravity" | "codex" | "claude";

export const resolveTrackedProviderTab = (
  savedProvider: string | null,
  monitoredCodex = false,
): TrackedProviderTab => {
  if (savedProvider === "claude") return "claude";
  if (savedProvider === "codex") return "codex";
  if (savedProvider === "antigravity") return "antigravity";
  return monitoredCodex ? "codex" : "antigravity";
};
