import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  AntigravityAccount,
  AntigravityUsageCacheEntry,
  AntigravityWorkerProgress,
  CodexAccount,
  FullStatus,
} from "../utils/common/types";
import { loadCodexAccounts, loadAntigravityAccounts } from "../utils/common/app-storage";
import { resolveTrackedProviderTab } from "../utils/common/tracked-provider-tab";
import { firstVisiblePlatform, type PlatformVisibility } from "../utils/common/platform-visibility";

const OVERLAY_TRACKED_PROVIDER_KEY = "quotashift_overlay_tracked_provider";

export interface UseAppEventListenersParams {
  setLastFullStatus: (status: FullStatus | null) => void;
  updateLocalSessionFromStatus: (status: any) => void;
  fetchAccountUsage: (account: CodexAccount) => Promise<any>;
  maybeAutoFailoverActiveCodexPool: () => Promise<void>;
  idlePollInterval: number;
  platformVisibility: PlatformVisibility;
  refreshAntigravityAccountsCloudFirst: (
    accs: AntigravityAccount[],
    force?: boolean,
  ) => Promise<void>;
  setActiveTab: (tab: "antigravity" | "codex" | "claude") => void;
  setAntigravityUsageCache: React.Dispatch<
    React.SetStateAction<Record<string, AntigravityUsageCacheEntry>>
  >;
  refreshTrackedAccountOnly: (payload: any) => Promise<void>;
}

export function useAppEventListeners({
  setLastFullStatus,
  updateLocalSessionFromStatus,
  fetchAccountUsage,
  maybeAutoFailoverActiveCodexPool,
  idlePollInterval,
  platformVisibility,
  refreshAntigravityAccountsCloudFirst,
  setActiveTab,
  setAntigravityUsageCache,
  refreshTrackedAccountOnly,
}: UseAppEventListenersParams) {
  useEffect(() => {
    let active = true;
    let unlistenStatus: (() => void) | null = null;
    let unlistenWindow: (() => void) | null = null;
    let unlistenWorker: (() => void) | null = null;
    let unlistenRefreshUsage: (() => void) | null = null;

    const setupListeners = async () => {
      const uStatus = await listen<FullStatus | null>("status-updated", (event) => {
        setLastFullStatus(event.payload);
        updateLocalSessionFromStatus(event.payload as any);
      });
      if (!active) uStatus();
      else unlistenStatus = uStatus;

      const uWindow = await listen<boolean>("window-shown", () => {
        const savedProvider = localStorage.getItem(OVERLAY_TRACKED_PROVIDER_KEY);
        if (
          savedProvider === "antigravity" ||
          savedProvider === "codex" ||
          savedProvider === "claude"
        ) {
          const preferred = resolveTrackedProviderTab(savedProvider);
          const next = platformVisibility[preferred]
            ? preferred
            : firstVisiblePlatform(platformVisibility);
          if (next) setActiveTab(next);
          return;
        }
        invoke<FullStatus | null>("get_quota_status")
          .then((s) => {
            const preferred = resolveTrackedProviderTab(null, Boolean(s?.monitoredCodex));
            const next = platformVisibility[preferred]
              ? preferred
              : firstVisiblePlatform(platformVisibility);
            if (next) setActiveTab(next);
          })
          .catch(console.error);
      });
      if (!active) uWindow();
      else unlistenWindow = uWindow;

      const uWorker = await listen<AntigravityWorkerProgress>(
        "antigravity-worker-progress",
        (event) => {
          const p = event.payload;
          const isFinal = ["exact", "cached", "cloud_fallback", "error"].includes(p.phase);
          setAntigravityUsageCache((prev) => ({
            ...prev,
            [p.accountId]: {
              ...prev[p.accountId],
              loading: !isFinal,
              exactState: p.phase,
              workerMessage: p.message,
            },
          }));
        },
      );
      if (!active) uWorker();
      else unlistenWorker = uWorker;

      const uRefreshUsage = await listen("request-refresh-usage", (event: any) => {
        refreshTrackedAccountOnly(event?.payload);
      });
      if (!active) uRefreshUsage();
      else unlistenRefreshUsage = uRefreshUsage;

      const uOverlayVis = await listen<boolean>("overlay-visibility-changed", () => {});
      if (!active) uOverlayVis();
    };

    setupListeners();
    return () => {
      active = false;
      unlistenStatus?.();
      unlistenWindow?.();
      unlistenWorker?.();
      unlistenRefreshUsage?.();
    };
  }, [
    platformVisibility,
    refreshTrackedAccountOnly,
    setActiveTab,
    setAntigravityUsageCache,
    setLastFullStatus,
    updateLocalSessionFromStatus,
  ]);

  useEffect(() => {
    const refreshVisibleIdlePlatforms = () => {
      if (platformVisibility.codex) {
        Promise.all(loadCodexAccounts().map((acc) => fetchAccountUsage(acc)))
          .then(maybeAutoFailoverActiveCodexPool)
          .catch(console.error);
      }
      if (platformVisibility.antigravity) {
        refreshAntigravityAccountsCloudFirst(loadAntigravityAccounts(), false).catch(console.error);
      }
    };
    const timer = window.setInterval(
      refreshVisibleIdlePlatforms,
      Math.max(5000, idlePollInterval * 1000),
    );
    return () => window.clearInterval(timer);
  }, [
    fetchAccountUsage,
    idlePollInterval,
    maybeAutoFailoverActiveCodexPool,
    platformVisibility,
    refreshAntigravityAccountsCloudFirst,
  ]);
}
