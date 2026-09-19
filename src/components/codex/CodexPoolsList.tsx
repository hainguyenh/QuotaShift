import React from "react";
import { CodexAccount, CodexAccountPool, CodexRouterStatus } from "../../utils/common/types";
import { CodexPoolCard } from "./CodexPoolCard";

interface CodexPoolsListProps {
  pools: CodexAccountPool[];
  accounts: CodexAccount[];
  usageCache: Record<string, any>;
  activePoolId?: string | null;
  appliedAccountId?: string | null;
  routerStatus?: CodexRouterStatus | null;
  onApplyPool: (pool: CodexAccountPool) => void;
  onEditPool: (pool: CodexAccountPool) => void;
  onDeletePool: (pool: CodexAccountPool) => void;
}

export const CodexPoolsList: React.FC<CodexPoolsListProps> = ({
  pools,
  accounts,
  usageCache,
  activePoolId,
  appliedAccountId,
  routerStatus,
  onApplyPool,
  onEditPool,
  onDeletePool,
}) => {
  if (pools.length === 0) {
    return (
      <div style={{ fontSize: "8.5px", color: "var(--text-secondary)", padding: "8px 0" }}>
        No model pools. Create one to combine account capacity for a configured Codex model.
      </div>
    );
  }
  return (
    <>
      {pools.map((pool) => (
        <CodexPoolCard
          key={pool.id}
          pool={pool}
          accounts={accounts}
          usageCache={usageCache}
          active={pool.id === activePoolId}
          appliedAccountId={appliedAccountId ?? null}
          routerStatus={routerStatus}
          onApply={onApplyPool}
          onEdit={onEditPool}
          onDelete={onDeletePool}
        />
      ))}
    </>
  );
};
