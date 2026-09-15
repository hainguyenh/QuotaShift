import React from "react";
import type {
  ClaudeObservedUsageWindow,
  ClaudeRateLimitWindow,
} from "../../utils/common/types";
import {
  clampPercent,
  formatPercent,
  formatTokens,
  formatReset,
} from "../../utils/claude/claude-formatters";

export const UsageLane: React.FC<{ label: string; window: ClaudeRateLimitWindow }> = ({
  label,
  window,
}) => {
  const used = window.usedPercentage;
  return (
    <div className="claude-usage-card">
      <div className="claude-usage-header">
        <span className="claude-usage-label">{label}</span>
        <span className="claude-usage-value">
          {used == null ? "Unavailable" : `${formatPercent(used)} used`}
        </span>
      </div>
      {used != null && (
        <div className="claude-progress" aria-hidden="true">
          <div className="claude-progress-fill" style={{ width: `${clampPercent(used)}%` }} />
        </div>
      )}
      <div className="claude-usage-meta">
        <span>
          {used == null
            ? "Usage percentage unavailable"
            : `${formatPercent(100 - clampPercent(used))} left`}
        </span>
        <span>{formatReset(window.resetsAt)}</span>
      </div>
    </div>
  );
};

export const LocalUsageCard: React.FC<{
  label: string;
  usage: ClaudeObservedUsageWindow;
}> = ({ label, usage }) => (
  <div className="claude-local-usage-card">
    <div className="claude-local-usage-title">{label}</div>
    <strong>{formatTokens(usage.processedTokens)} processed tokens</strong>
    <div className="claude-local-usage-meta">
      <span>{formatTokens(usage.outputTokens)} output</span>
      <span>{usage.requestCount.toLocaleString()} requests</span>
    </div>
  </div>
);

export const Stat: React.FC<{ label: string; value: string; visible?: boolean }> = ({
  label,
  value,
  visible = true,
}) => {
  if (!visible) return null;
  return (
    <div className="claude-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
};

export const formatClaudeModelName = (name: string | null | undefined): string => {
  if (!name) return "Claude";
  if (name === "claude-sonnet-5") return "Claude Sonnet  5";
  return name.replace(/claude-sonnet-5/g, "Claude Sonnet  5");
};
