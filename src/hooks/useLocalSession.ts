import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AntigravityAccount, LocalAntigravitySession, FullStatus } from "../utils/common/types";
import { deobfuscate, obfuscate } from "../utils/auth/auth";
import {
  loadLocalAntigravitySession,
  saveLocalAntigravitySession,
  mergeLocalAntigravityStatus,
  canAddLocalSessionToMonitored,
} from "../utils/antigravity/local-antigravity-session";
import { extractAntigravitySessionAccount } from "../utils/antigravity/current-local-session";
import { resolveAntigravityPlanName, ANTIGRAVITY_ORDER_KEY } from "../utils/common/app-constants";
import { saveAntigravityAccounts } from "../utils/common/app-storage";
import { saveAccountOrder } from "../utils/account/account-order";

export const useLocalSession = (
  antigravityAccounts: AntigravityAccount[],
  setAntigravityAccounts: React.Dispatch<React.SetStateAction<AntigravityAccount[]>>,
  refreshQuota: (accounts: AntigravityAccount[], force?: boolean) => Promise<any>,
) => {
  const [localAntigravitySession, setLocalAntigravitySession] = useState<LocalAntigravitySession>(
    () => loadLocalAntigravitySession(),
  );

  const refreshLocalSessionQuota = useCallback(
    async (sessionOverride?: LocalAntigravitySession) => {
      const session = sessionOverride || localAntigravitySession;
      const captured = session.capturedAccount;
      if (!captured?.token) return;
      try {
        const rawToken = deobfuscate(captured.token);
        const rawRefreshToken = captured.refreshToken
          ? deobfuscate(captured.refreshToken)
          : undefined;
        const res = await invoke<any>("fetch_antigravity_account_usage", {
          accessToken: rawToken,
          refreshToken: rawRefreshToken ?? null,
          authMethod: captured.authMethod ?? null,
        });
        if (res?.quotas) {
          setLocalAntigravitySession((prev) => {
            const next: LocalAntigravitySession = {
              ...prev,
              quotas: res.quotas,
              planTier: res.planTier ?? prev.planTier,
              online: true,
              lastSeenAt: Date.now(),
              capturedAccount: prev.capturedAccount
                ? {
                    ...prev.capturedAccount,
                    token: res.refreshedTokens?.accessToken
                      ? obfuscate(res.refreshedTokens.accessToken)
                      : prev.capturedAccount.token,
                  }
                : prev.capturedAccount,
            };
            saveLocalAntigravitySession(next);
            return next;
          });
        }
      } catch (e) {
        console.warn("Could not fetch remote usage for local session:", e);
      }
    },
    [localAntigravitySession],
  );

  const syncLocalSessionFromDisk = useCallback(async () => {
    try {
      const rawSession = await invoke<any>("read_antigravity_session");
      if (!rawSession) return;
      const candidate = extractAntigravitySessionAccount(rawSession);
      if (candidate && candidate.email) {
        let sessionToRefresh: LocalAntigravitySession | null = null;
        setLocalAntigravitySession((prev) => {
          const isNewEmail = prev.email !== candidate.email;
          const isTokenUpdated = candidate.token && prev.capturedAccount?.token !== candidate.token;
          if (isNewEmail || isTokenUpdated) {
            const next: LocalAntigravitySession = {
              ...prev,
              email: candidate.email ?? null,
              planTier: candidate.lastPlan ?? prev.planTier,
              credits: null,
              quotas: isNewEmail ? [] : prev.quotas,
              online: true,
              lastSeenAt: Date.now(),
              capturedAccount: {
                token: candidate.token,
                refreshToken: candidate.refreshToken,
                profileUrl: candidate.profileUrl,
                email: candidate.email,
                authMethod: candidate.authMethod,
              },
            };
            saveLocalAntigravitySession(next);
            sessionToRefresh = next;
            return next;
          }
          if (prev.quotas.length === 0 && (candidate.token || candidate.refreshToken)) {
            sessionToRefresh = prev;
          }
          return prev;
        });
        if (sessionToRefresh) {
          void refreshLocalSessionQuota(sessionToRefresh);
        }
      }
    } catch (e) {
      console.warn("Failed to sync local Antigravity session from disk:", e);
    }
  }, [refreshLocalSessionQuota]);

  useEffect(() => {
    syncLocalSessionFromDisk();
  }, [syncLocalSessionFromDisk]);

  const updateLocalSessionFromStatus = (status: FullStatus | null) => {
    if (!status) return;
    setLocalAntigravitySession((prev) => {
      const next = mergeLocalAntigravityStatus(prev, status);
      saveLocalAntigravitySession(next);
      return next;
    });
  };

  const handleLocalAntigravitySessionCaptured = (captured: AntigravityAccount) => {
    setLocalAntigravitySession((previous) => {
      const next: LocalAntigravitySession = {
        ...previous,
        email: captured.email ?? previous.email,
        online: previous.online,
        capturedAccount: {
          token: captured.token,
          refreshToken: captured.refreshToken,
          profileUrl: captured.profileUrl,
          email: captured.email,
          authMethod: captured.authMethod,
        },
      };
      saveLocalAntigravitySession(next);
      return next;
    });
  };

  const handleAddLocalSessionToMonitored = () => {
    if (!canAddLocalSessionToMonitored(localAntigravitySession, antigravityAccounts)) return;
    const captured = localAntigravitySession.capturedAccount;
    if (!captured?.token) return;
    const email = (localAntigravitySession.email || captured.email || "").trim();
    const label = email ? email.split("@")[0] : "Local Antigravity";
    const newAccount: AntigravityAccount = {
      id: `ag-acct-${Date.now()}`,
      label,
      token: captured.token,
      refreshToken: captured.refreshToken,
      profileUrl: captured.profileUrl,
      email: email || undefined,
      authMethod: captured.authMethod,
      lastPlan: resolveAntigravityPlanName(localAntigravitySession.planTier) || undefined,
      lastBalance: localAntigravitySession.credits
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
            localAntigravitySession.credits.balance,
          )
        : undefined,
      quotas: localAntigravitySession.quotas,
      lastUsedAt: localAntigravitySession.online
        ? (localAntigravitySession.lastSeenAt ?? Date.now())
        : undefined,
    };
    const updated = [...antigravityAccounts, newAccount];
    saveAntigravityAccounts(updated);
    saveAccountOrder(
      ANTIGRAVITY_ORDER_KEY,
      updated.map((account) => account.id),
    );
    setAntigravityAccounts(updated);
    void refreshQuota([newAccount], true);
  };

  const handleApplyAccountToLocalSession = (acc: AntigravityAccount) => {
    setLocalAntigravitySession((previous) => {
      const next: LocalAntigravitySession = {
        ...previous,
        email: acc.email ?? previous.email,
        online: true,
        lastSeenAt: Date.now(),
        capturedAccount: {
          token: acc.token,
          refreshToken: acc.refreshToken,
          profileUrl: acc.profileUrl,
          email: acc.email,
          authMethod: acc.authMethod,
        },
      };
      saveLocalAntigravitySession(next);
      return next;
    });
  };

  return {
    localAntigravitySession,
    setLocalAntigravitySession,
    updateLocalSessionFromStatus,
    handleLocalAntigravitySessionCaptured,
    handleAddLocalSessionToMonitored,
    handleApplyAccountToLocalSession,
    syncLocalSessionFromDisk,
    refreshLocalSessionQuota,
  };
};
