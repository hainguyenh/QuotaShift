export const CLAUDE_MANUAL_PROFILE_PATHS_KEY = "quotashift_claude_manual_profile_paths_v1";

export function cleanClaudeProfilePath(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function claudeConfigPathKey(value: string): string {
  return cleanClaudeProfilePath(value).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

export function sameClaudeConfigPath(left: string, right: string): boolean {
  return claudeConfigPathKey(left) === claudeConfigPathKey(right);
}

export function loadClaudeManualProfilePaths(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CLAUDE_MANUAL_PROFILE_PATHS_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed
      .filter((value): value is string => typeof value === "string")
      .map(cleanClaudeProfilePath)
      .filter((value) => {
        const key = claudeConfigPathKey(value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch {
    return [];
  }
}

export function saveClaudeManualProfilePaths(paths: string[]): void {
  const seen = new Set<string>();
  const normalized = paths.map(cleanClaudeProfilePath).filter((value) => {
    const key = claudeConfigPathKey(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  window.localStorage.setItem(CLAUDE_MANUAL_PROFILE_PATHS_KEY, JSON.stringify(normalized));
}
