import { useState, useRef, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit } from "@tauri-apps/api/event";
import type { OverlayAccountData, OverlayQuotaRow } from "../components/overlay/OverlayApp";
import type {
  AntigravityAccount,
  AntigravityUsageCacheEntry,
  ClaudeAccountUsageStatus,
  CodexAccount,
} from "../utils/common/types";
import { findCodexPoolFailover } from "../utils";
import {
  buildAntigravityOverlayRows,
  buildTrackedClaudeOverlayPayload,
  buildAntigravityOverlayPayload,
  buildCodexOverlayPayload,
} from "../utils/common/app-overlay-helpers";
import { buildMonitoredCodexInfo } from "../utils/codex/codex-tray-state";
import { useCodexUsageFetcher } from "./useCodexUsageFetcher";

export const OVERLAY_TRACKED_PROVIDER_KEY = "quotashift_overlay_tracked_provider";
export const OVERLAY_TRACKED_ACCOUNT_ID_KEY = "quotashift_overlay_tracked_account_id";

import type { UseAppUsageAndOverlayParams } from "./useAppUsageAndOverlay.types";

export function useAppUsageAndOverlay({
  antigravityAccounts,
  activeAntigravityId,
  codexAccounts,
  setCodexAccounts,
  activeCodexId,
  codexPools,
  activeCodexPoolId,
  claudeMonitorStatus,
  claudeAccountStatuses,
  refreshClaudeAccountStatuses,
  lastFullStatus,
  refreshAntigravityAccountsCloudFirst,
  handleApplyCodexAccount,
}: UseAppUsageAndOverlayParams) {
  const [trackedProvider, setTrackedProvider] = useState<"antigravity" | "codex" | "claude">(
    () => (localStorage.getItem(OVERLAY_TRACKED_PROVIDER_KEY) as any) || "antigravity",
  );
  const [trackedAccountId, setTrackedAccountId] = useState<string | null>(() =>
    localStorage.getItem(OVERLAY_TRACKED_ACCOUNT_ID_KEY),
  );
  const [antigravityUsageCache, setAntigravityUsageCache] = useState<
    Record<string, AntigravityUsageCacheEntry>
  >({});

  const trackedProviderRef = useRef(trackedProvider);
  trackedProviderRef.current = trackedProvider;
  const trackedAccountIdRef = useRef(trackedAccountId);
  trackedAccountIdRef.current = trackedAccountId;
  const persistedTrackedProviderRef = useRef<string | null>(
    localStorage.getItem(OVERLAY_TRACKED_PROVIDER_KEY),
  );

  const syncTrackedIdentityState = (
    provider: "antigravity" | "codex" | "claude",
    accountId: string,
  ) => {
    persistedTrackedProviderRef.current = provider;
    if (trackedProviderRef.current !== provider) {
      trackedProviderRef.current = provider;
      setTrackedProvider(provider);
    }
    if (trackedAccountIdRef.current !== accountId) {
      trackedAccountIdRef.current = accountId;
      setTrackedAccountId(accountId);
    }
  };

  const { codexUsageCache, setCodexUsageCache, codexUsageCacheRef, fetchAccountUsage } =
    useCodexUsageFetcher({
      setCodexAccounts,
      trackedProviderRef,
      trackedAccountIdRef,
    });

  const antigravityUsageCacheRef = useRef(antigravityUsageCache);
  antigravityUsageCacheRef.current = antigravityUsageCache;
  const codexFailoverLatchRef = useRef<Record<string, number>>({});
  const activeCodexPoolIdRef = useRef(activeCodexPoolId);
  activeCodexPoolIdRef.current = activeCodexPoolId;

  const maybeAutoFailoverActiveCodexPool = async () => {
    const activePool = codexPools.find((p) => p.id === activeCodexPoolIdRef.current);
    if (!activePool) return;
    codexFailoverLatchRef.current[activePool.id] = Date.now();
    const failover = findCodexPoolFailover(
      activePool,
      activeCodexId,
      codexAccounts,
      codexUsageCache,
    );
    if (failover) await handleApplyCodexAccount(failover.account, activePool.model, activePool.id);
  };

  const handleTrackAntigravityAccount = async (acc: AntigravityAccount) => {
    syncTrackedIdentityState("antigravity", acc.id);
    localStorage.setItem(OVERLAY_TRACKED_PROVIDER_KEY, "antigravity");
    localStorage.setItem(OVERLAY_TRACKED_ACCOUNT_ID_KEY, acc.id);
    await invoke("set_monitored_codex", { info: null });
    await refreshAntigravityAccountsCloudFirst([acc], true);
  };

  const handleTrackCodexAccount = async (acc: CodexAccount) => {
    syncTrackedIdentityState("codex", acc.id);
    localStorage.setItem(OVERLAY_TRACKED_PROVIDER_KEY, "codex");
    localStorage.setItem(OVERLAY_TRACKED_ACCOUNT_ID_KEY, acc.id);
    const c = await fetchAccountUsage(acc, true);
    if (c)
      await invoke("set_monitored_codex", { info: buildMonitoredCodexInfo(acc, c) }).catch(
        console.warn,
      );
    return c;
  };

  const handleTrackClaude = async (status: ClaudeAccountUsageStatus) => {
    const accountId = status.account.id;
    syncTrackedIdentityState("claude", accountId);
    localStorage.setItem(OVERLAY_TRACKED_PROVIDER_KEY, "claude");
    localStorage.setItem(OVERLAY_TRACKED_ACCOUNT_ID_KEY, accountId);
    await invoke("set_monitored_codex", { info: null });
    if (refreshClaudeAccountStatuses) {
      await refreshClaudeAccountStatuses(true).catch(() => {});
    }
  };

  const refreshTrackedAccountOnly = async (payload: any) => {
    if (payload?.provider === "antigravity") {
      const targetAcc =
        antigravityAccounts.find((a) => a.id === payload?.accountId) ?? antigravityAccounts[0];
      if (targetAcc) await refreshAntigravityAccountsCloudFirst([targetAcc], true);
    } else if (payload?.provider === "claude") {
      await refreshClaudeAccountStatuses?.(true);
    } else {
      const targetAcc = codexAccounts.find((a) => a.id === payload?.accountId) ?? codexAccounts[0];
      if (targetAcc) await fetchAccountUsage(targetAcc, true);
    }
  };

  const publishOverlayUpdate = useCallback(() => {
    const savedTrackedProvider = persistedTrackedProviderRef.current;
    let savedTrackedAccountId = trackedAccountIdRef.current;
    const isClaudeTracked = savedTrackedProvider === "claude";
    if (
      isClaudeTracked &&
      (!savedTrackedAccountId || savedTrackedAccountId === "claude-local") &&
      claudeAccountStatuses.length
    ) {
      const defaultAccount =
        claudeAccountStatuses.find(
          (status) => status.account.profileName.trim().toLowerCase() === "default",
        ) ?? claudeAccountStatuses[0];
      savedTrackedAccountId = defaultAccount.account.id;
      syncTrackedIdentityState("claude", savedTrackedAccountId);
      localStorage.setItem(OVERLAY_TRACKED_PROVIDER_KEY, "claude");
      localStorage.setItem(OVERLAY_TRACKED_ACCOUNT_ID_KEY, savedTrackedAccountId);
    }
    const isCodexTracked =
      savedTrackedProvider === "codex" ||
      (!isClaudeTracked &&
        savedTrackedProvider !== "antigravity" &&
        Boolean(lastFullStatus?.monitoredCodex));
    let prevOverlayData: OverlayAccountData | null = null;
    try {
      const raw = localStorage.getItem("quotashift_overlay_data");
      if (raw) prevOverlayData = JSON.parse(raw);
    } catch {}
    let payload: OverlayAccountData;
    if (isClaudeTracked) {
      payload = buildTrackedClaudeOverlayPayload({
        trackedAccountId: savedTrackedAccountId,
        accountStatuses: claudeAccountStatuses,
        monitorStatus: claudeMonitorStatus,
        prev: prevOverlayData,
      });
    } else if (!isCodexTracked) {
      const acc =
        (savedTrackedAccountId
          ? antigravityAccounts.find((a) => a.id === savedTrackedAccountId)
          : null) ??
        antigravityAccounts.find((a) => a.id === activeAntigravityId) ??
        antigravityAccounts[0];
      if (acc && savedTrackedProvider === "antigravity") {
        syncTrackedIdentityState("antigravity", acc.id);
        localStorage.setItem(OVERLAY_TRACKED_PROVIDER_KEY, "antigravity");
        localStorage.setItem(OVERLAY_TRACKED_ACCOUNT_ID_KEY, acc.id);
      }
      const cloudQuotas =
        (acc && antigravityUsageCache[acc.id]?.cloudQuotas) || acc?.cloudQuotas || [];
      const quotaRows: OverlayQuotaRow[] = buildAntigravityOverlayRows(cloudQuotas);
      payload = buildAntigravityOverlayPayload(
        acc,
        quotaRows,
        prevOverlayData && prevOverlayData.provider === "antigravity" ? prevOverlayData : null,
      );
    } else {
      const acc =
        (savedTrackedAccountId
          ? codexAccounts.find((a) => a.id === savedTrackedAccountId)
          : null) ??
        codexAccounts.find((a) => a.id === activeCodexId) ??
        codexAccounts[0];
      if (acc) {
        syncTrackedIdentityState("codex", acc.id);
        localStorage.setItem(OVERLAY_TRACKED_PROVIDER_KEY, "codex");
        localStorage.setItem(OVERLAY_TRACKED_ACCOUNT_ID_KEY, acc.id);
      }
      const cache = (acc ? codexUsageCache[acc.id] : null) || ({} as any);
      payload = buildCodexOverlayPayload(
        acc,
        cache,
        prevOverlayData && prevOverlayData.provider === "codex" ? prevOverlayData : null,
      );
    }
    emit("overlay-data-update", payload);
    localStorage.setItem("quotashift_overlay_data", JSON.stringify(payload));
  }, [
    antigravityAccounts,
    codexAccounts,
    activeAntigravityId,
    activeCodexId,
    antigravityUsageCache,
    codexUsageCache,
    claudeMonitorStatus,
    claudeAccountStatuses,
    lastFullStatus,
  ]);

  useEffect(() => {
    publishOverlayUpdate();
  }, [publishOverlayUpdate]);

  return {
    trackedProvider,
    setTrackedProvider,
    trackedAccountId,
    setTrackedAccountId,
    antigravityUsageCache,
    setAntigravityUsageCache,
    codexUsageCache,
    setCodexUsageCache,
    antigravityUsageCacheRef,
    codexUsageCacheRef,
    codexFailoverLatchRef,
    activeCodexPoolIdRef,
    syncTrackedIdentityState,
    fetchAccountUsage,
    maybeAutoFailoverActiveCodexPool,
    handleTrackAntigravityAccount,
    handleTrackCodexAccount,
    handleTrackClaude,
    refreshTrackedAccountOnly,
    publishOverlayUpdate,
  };
}
