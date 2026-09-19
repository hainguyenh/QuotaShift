import { invoke } from "@tauri-apps/api/core";
import type { ClaudeAccountUsageStatus } from "../common/types";
import { sameClaudeConfigPath } from "./claude-profile-paths";

export type ClaudeCurrentAccountResolution =
  | { status: ClaudeAccountUsageStatus; reason: null }
  | { status: null; reason: "no-process" | "not-listed" };

export async function resolveCurrentClaudeAccount(
  currentStatuses: ClaudeAccountUsageStatus[],
  extraConfigDirs: string[],
  refreshStatuses: () => Promise<ClaudeAccountUsageStatus[]>,
): Promise<ClaudeCurrentAccountResolution> {
  const configDir = await invoke<string | null>("get_current_claude_config_dir", {
    extraConfigDirs,
  });
  if (!configDir) return { status: null, reason: "no-process" };

  let status = currentStatuses.find((item) =>
    sameClaudeConfigPath(item.account.configDir, configDir),
  );
  if (!status) {
    const refreshed = await refreshStatuses().catch(() => []);
    status = refreshed.find((item) => sameClaudeConfigPath(item.account.configDir, configDir));
  }
  return status ? { status, reason: null } : { status: null, reason: "not-listed" };
}
