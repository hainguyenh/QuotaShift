import React, { useMemo, useState, useRef, useEffect } from "react";
import { CodexAccount } from "../../utils/common/types";
import { CodexAvailableModelsDialog } from "./CodexAvailableModelsDialog";
import { computeCodexTierSummary } from "../../utils/codex/codex-tier-summary";
import { useAccountRename } from "../../hooks/useAccountRename";
import { TrackCurrentAccountIcon } from "../common/TrackCurrentAccountIcon";
import { CodexTabBaseProps } from "./codex-tab-types";
import { CodexAddIcon, CodexBestIcon } from "./CodexIcons";
import { CodexPoolsSection } from "./CodexPoolsSection";
import { CodexResetDialogWrapper } from "./CodexResetDialogWrapper";
import { CodexTabEmpty } from "./CodexTabEmpty";
import { CodexAccountCard } from "./CodexAccountCard";
import { useCodexRefreshState } from "./useCodexRefreshState";
import { useCodexTabReorder } from "./useCodexTabReorder";
import { useAccountCardGridColumns } from "../../hooks/useAccountCardGridColumns";

export interface CodexTabProps extends CodexTabBaseProps {
  trackedAccountId?: string | null;
}

export const CodexTab: React.FC<CodexTabProps> = (props) => {
  const {
    accounts,
    activeId,
    appliedId,
    trackedAccountId,
    trackedProvider = "antigravity",
    isTrackingCurrentAccount,
    onTrackCurrentAccount,
    onAddAccountClick,
    poolRoutingEnabled,
    poolRoutingBusy,
    onTogglePoolRouting,
    onApplyPool,
    onNewPool,
    onEditPool,
    onDeletePool,
    activePoolId,
    pools,
  } = props;
  const { codexUsageCache, onApply, onDelete, onTrack, onRefresh, onSwitchBest } = props;
  const routerStatus = props.routerStatus ?? null;

  const { refreshingIds, handleRefresh } = useCodexRefreshState(onRefresh);
  const [availableModelsAccount, setAvailableModelsAccount] = useState<CodexAccount | null>(null);
  const [resetCreditsAccount, setResetCreditsAccount] = useState<CodexAccount | null>(null);
  const [codexSection, setCodexSection] = useState<"accounts" | "pools">("accounts");
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [failedAvatarIds, setFailedAvatarIds] = useState<Set<string>>(new Set());
  const prevAvatarsRef = useRef<Record<string, string | undefined>>({});

  useEffect(() => {
    setFailedAvatarIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const a of accounts) {
        if (
          prevAvatarsRef.current[a.id] !== undefined &&
          prevAvatarsRef.current[a.id] !== a.profileUrl &&
          next.has(a.id)
        ) {
          next.delete(a.id);
          changed = true;
        }
        prevAvatarsRef.current[a.id] = a.profileUrl;
      }
      return changed ? next : prev;
    });
  }, [accounts]);

  const rename = useAccountRename(props.onRename);
  const { filteredAccounts, reorder, currentAppliedId } = useCodexTabReorder(
    accounts,
    props.searchQuery,
    appliedId,
    props.onReorder,
  );
  const accountGridStyle = useAccountCardGridColumns();

  const handleCopyEmail = async (id: string, email: string, targetEl?: HTMLElement) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmailId(id);
      if (targetEl) {
        window.dispatchEvent(
          new CustomEvent("show-tooltip", { detail: { target: targetEl, text: "Copied" } }),
        );
      }
      setTimeout(() => setCopiedEmailId((curr) => (curr === id ? null : curr)), 1500);
    } catch (err) {
      console.error("Failed to copy email:", err);
    }
  };

  const handleCardClick = () => {
    if (reorder.controllerRef.current.consumeClickSuppression()) return;
    // Single click does nothing; double-click marks as monitored
  };
  const handleCardDoubleClick = (account: CodexAccount) => {
    onTrack(account);
  };

  const tierSummary = useMemo(
    () => computeCodexTierSummary(filteredAccounts, codexUsageCache),
    [filteredAccounts, codexUsageCache],
  );

  const effectiveTrackedId =
    trackedProvider === "codex"
      ? (trackedAccountId ?? props.lastFullStatus?.monitoredCodex?.accountId ?? activeId)
      : null;

  const dragProps = (id: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => reorder.handlePointerDown(e, id),
    onPointerMove: reorder.handlePointerMove,
    onPointerUp: reorder.handlePointerUp,
    onPointerCancel: reorder.handlePointerCancel,
  });

  const handleOpenResets = (e: React.MouseEvent, acc: CodexAccount, cache?: any) => {
    e.stopPropagation();
    setResetCreditsAccount(acc);
    if (!cache?.resetCredits) void handleRefresh(e, acc);
  };

  return (
    <div className="tab-panel tab-panel--active">
      <div className="codex-subtabs-wrap">
        <div className="codex-subtabs" role="tablist" aria-label="Codex views">
          <button
            type="button"
            role="tab"
            aria-selected={codexSection === "accounts"}
            className={`codex-subtab ${codexSection === "accounts" ? "codex-subtab--active" : ""}`}
            onClick={() => setCodexSection("accounts")}
          >
            Accounts
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={codexSection === "pools"}
            className={`codex-subtab ${codexSection === "pools" ? "codex-subtab--active" : ""}`}
            onClick={() => setCodexSection("pools")}
          >
            Pools
          </button>
        </div>
      </div>

      {codexSection === "accounts" && (
        <>
          <div className="account-bar">
            <div className="account-bar-summary">
              <span className="account-bar-total" data-tooltip="Total Codex accounts">
                Total: <strong>{tierSummary.total}</strong>
              </span>
              {tierSummary.badges.length > 0 && (
                <div className="account-bar-badges">
                  {tierSummary.badges.map(({ tier, count }) => (
                    <span
                      key={tier}
                      className={`account-tier-badge account-tier-badge--${tier.toLowerCase()}`}
                      data-tooltip={`${count} ${tier} account${count > 1 ? "s" : ""}`}
                    >
                      <span className="account-tier-badge-label">{tier}</span>
                      <span className="account-tier-badge-sep">-</span>
                      <span className="account-tier-badge-count">{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="account-bar-actions">
              <button
                className="account-action-btn account-action-btn--add"
                onClick={onAddAccountClick}
                data-tooltip="Connect and add a new Codex account"
              >
                <CodexAddIcon />
                Add Account
              </button>
              {onTrackCurrentAccount && (
                <button
                  type="button"
                  className="account-action-btn account-action-btn--icon-only"
                  onClick={onTrackCurrentAccount}
                  disabled={isTrackingCurrentAccount}
                  aria-label="Monitor Current Account"
                  data-tooltip="Monitor the account currently active in the local ChatGPT Codex session"
                >
                  <TrackCurrentAccountIcon />
                </button>
              )}
              {accounts.length >= 2 && (
                <button
                  className="account-action-btn"
                  onClick={onSwitchBest}
                  data-tooltip="Auto-switch to the Codex account with the highest remaining quota"
                >
                  <CodexBestIcon />
                  Best
                </button>
              )}
            </div>
          </div>

          <div className="codex-hint-text">
            Double-click a card to monitor in tray · Apply switches active session
          </div>

          <div className="app-content">
            {accounts.length === 0 || filteredAccounts.length === 0 ? (
              <CodexTabEmpty totalAccounts={accounts.length} searchQuery={props.searchQuery} />
            ) : (
              <div
                ref={reorder.containerRef}
                style={accountGridStyle}
                className={`codex-accounts-container ${reorder.draggingId ? "account-card-grid--reordering" : ""}`}
                onPointerMove={reorder.handlePointerMove}
                onPointerUp={reorder.handlePointerUp}
                onPointerCancel={reorder.handlePointerCancel}
              >
                {reorder.displayedItems.map((acc) => {
                  const isMonitored = Boolean(effectiveTrackedId && acc.id === effectiveTrackedId);
                  return (
                    <CodexAccountCard
                      key={acc.id}
                      account={acc}
                      isSelected={acc.id === activeId}
                      isMonitored={isMonitored}
                      isDragging={reorder.draggingId === acc.id}
                      currentAppliedId={currentAppliedId}
                      cache={codexUsageCache[acc.id]}
                      failedAvatarIds={failedAvatarIds}
                      copiedEmailId={copiedEmailId}
                      rename={rename}
                      isRefreshing={
                        refreshingIds.has(acc.id) || Boolean(codexUsageCache[acc.id]?.loading)
                      }
                      dragProps={dragProps(acc.id)}
                      onCardClick={handleCardClick}
                      onCardDoubleClick={handleCardDoubleClick}
                      onAvatarError={(id) => setFailedAvatarIds((prev) => new Set(prev).add(id))}
                      onCopyEmail={handleCopyEmail}
                      onRefresh={handleRefresh}
                      onReauthenticate={onAddAccountClick}
                      onShowModels={(a) => setAvailableModelsAccount(a)}
                      onApply={onApply}
                      onDelete={onDelete}
                      onOpenResets={handleOpenResets}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {codexSection === "pools" && (
        <CodexPoolsSection
          title="Model Pools"
          role="switch"
          routingLabel="Pool Routing"
          aria-checked={poolRoutingEnabled}
          pools={pools ?? []}
          accounts={accounts}
          usageCache={codexUsageCache}
          activePoolId={activePoolId}
          appliedAccountId={appliedId}
          routerStatus={routerStatus}
          poolRoutingEnabled={poolRoutingEnabled}
          poolRoutingBusy={poolRoutingBusy}
          onTogglePoolRouting={onTogglePoolRouting}
          onApplyPool={onApplyPool}
          onNewPool={onNewPool}
          onEditPool={onEditPool}
          onDeletePool={onDeletePool}
        />
      )}

      <CodexAvailableModelsDialog
        isOpen={Boolean(availableModelsAccount)}
        account={availableModelsAccount}
        entry={
          availableModelsAccount ? props.codexModelCache?.[availableModelsAccount.id] : undefined
        }
        onClose={() => setAvailableModelsAccount(null)}
        onRescan={props.onRescanModels ?? (() => {})}
      />

      <CodexResetDialogWrapper
        account={resetCreditsAccount}
        usageCache={codexUsageCache}
        isRefreshing={refreshingIds.has(resetCreditsAccount?.id ?? "")}
        onClose={() => setResetCreditsAccount(null)}
      />
    </div>
  );
};
