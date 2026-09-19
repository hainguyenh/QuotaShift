import React, { useMemo, useState } from "react";
import type { ClaudeAccountUsageStatus, ClaudeMonitorStatus } from "../../utils/common/types";
import { TrackCurrentAccountIcon } from "../common/TrackCurrentAccountIcon";
import { ClaudeControls } from "./ClaudeControls";
import { ClaudeAccountCards } from "./ClaudeAccountCards";
import { ClaudeAddAccountModal } from "./ClaudeAddAccountModal";

export interface ClaudeTabProps {
  status: ClaudeMonitorStatus;
  isTracked?: boolean;
  trackedAccountId?: string | null;
  onTrackClaudeAccount?: (status: ClaudeAccountUsageStatus) => void | Promise<void>;
  onTrackCurrentAccount?: () => void | Promise<void>;
  isTrackingCurrentAccount?: boolean;
  onAddProfilePath?: (configDir: string) => Promise<void>;
  searchQuery?: string;
  claudePollIntervalSecs?: number;
  onClaudePollIntervalChange?: (secs: number) => void;
  claudeStopThresholdPct?: number;
  onClaudeStopThresholdChange?: (pct: number) => void;
  autoStopArmed?: boolean;
  accountStatuses?: ClaudeAccountUsageStatus[];
  onResumeAccount?: (configDir: string) => void;
}

const AddAccountIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" width="10" height="10" aria-hidden="true">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

function matchesClaudeAccount(status: ClaudeAccountUsageStatus, query?: string): boolean {
  const normalized = (query || "").trim().toLowerCase();
  if (!normalized) return true;
  const account = status.account;
  return [
    account.email,
    account.organizationName,
    account.profileName,
    account.configDir,
    account.subscriptionType,
    account.rateLimitTier,
  ].some((value) => value?.toLowerCase().includes(normalized));
}

export const ClaudeTab: React.FC<ClaudeTabProps> = ({
  status,
  isTracked = false,
  trackedAccountId = null,
  onTrackClaudeAccount,
  onTrackCurrentAccount,
  isTrackingCurrentAccount = false,
  onAddProfilePath,
  searchQuery,
  claudePollIntervalSecs = 2,
  onClaudePollIntervalChange,
  claudeStopThresholdPct = 0,
  onClaudeStopThresholdChange,
  autoStopArmed = false,
  accountStatuses = [],
  onResumeAccount,
}) => {
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const filteredAccounts = useMemo(
    () => accountStatuses.filter((account) => matchesClaudeAccount(account, searchQuery)),
    [accountStatuses, searchQuery],
  );
  const controls =
    onClaudePollIntervalChange || onClaudeStopThresholdChange ? (
      <ClaudeControls
        claudePollIntervalSecs={claudePollIntervalSecs}
        onClaudePollIntervalChange={onClaudePollIntervalChange}
        claudeStopThresholdPct={claudeStopThresholdPct}
        onClaudeStopThresholdChange={onClaudeStopThresholdChange}
        autoStopArmed={autoStopArmed}
      />
    ) : null;

  return (
    <section className="claude-monitor">
      <div className="account-bar">
        <div className="account-bar-actions">
          {onAddProfilePath && (
            <button
              type="button"
              className="account-action-btn account-action-btn--add"
              onClick={() => setAddAccountOpen(true)}
              data-tooltip="Add a Claude Code profile by CLAUDE_CONFIG_DIR path"
            >
              <AddAccountIcon />
              Add Account
            </button>
          )}
          {onTrackCurrentAccount && (
            <button
              type="button"
              className="account-action-btn account-action-btn--icon-only"
              onClick={() => void onTrackCurrentAccount()}
              disabled={isTrackingCurrentAccount}
              aria-label="Monitor Current Claude Code Account"
              data-tooltip="Monitor the account used by the current Claude Code process"
            >
              <TrackCurrentAccountIcon />
            </button>
          )}
        </div>
      </div>

      {controls}

      <ClaudeAccountCards
        accounts={filteredAccounts}
        trackedAccountId={trackedAccountId}
        isClaudeTracked={isTracked}
        onMonitor={onTrackClaudeAccount}
        onResume={onResumeAccount}
      />

      {accountStatuses.length > 0 && filteredAccounts.length === 0 && (
        <div className="claude-monitor-card claude-monitor-state-card">
          <div className="claude-state-dot" />
          <div className="claude-state-content">
            <div className="claude-state-title">No Claude Code accounts match this search</div>
            <div className="claude-state-copy">Try another email, profile name, path, or tier.</div>
          </div>
        </div>
      )}

      {!accountStatuses.length && (
        <div className="claude-monitor-card claude-monitor-state-card">
          <div
            className={`claude-state-dot ${status.error ? "claude-state-dot--error" : status.installed ? "claude-state-dot--ready" : ""}`}
          />
          <div className="claude-state-content">
            <div className="claude-state-title">
              {status.error
                ? "Claude Code account monitoring needs attention"
                : "No Claude Code accounts found"}
            </div>
            <div className="claude-state-copy">
              {status.error ||
                "QuotaShift will show discovered Claude Code subscription accounts here when local profile data is available."}
            </div>
          </div>
        </div>
      )}

      {onAddProfilePath && (
        <ClaudeAddAccountModal
          isOpen={addAccountOpen}
          onClose={() => setAddAccountOpen(false)}
          onAdd={onAddProfilePath}
        />
      )}
    </section>
  );
};
