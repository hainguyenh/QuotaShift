import type {
  AntigravityAccount,
  ClaudeAccountUsageStatus,
  CodexAccount,
  CodexAccountPool,
} from "../utils/common/types";

export interface UseAppUsageAndOverlayParams {
  antigravityAccounts: AntigravityAccount[];
  activeAntigravityId: string | null;
  codexAccounts: CodexAccount[];
  setCodexAccounts: (accs: CodexAccount[]) => void;
  activeCodexId: string | null;
  codexPools: CodexAccountPool[];
  activeCodexPoolId: string | null;
  claudeMonitorStatus: any;
  claudeAccountStatuses: ClaudeAccountUsageStatus[];
  refreshClaudeAccountStatuses?: (force?: boolean) => Promise<ClaudeAccountUsageStatus[]>;
  lastFullStatus: any;
  refreshAntigravityAccountsCloudFirst: (
    accs?: AntigravityAccount[],
    force?: boolean,
  ) => Promise<void>;
  handleApplyCodexAccount: (
    acc: CodexAccount,
    modelOverride?: string,
    poolId?: string,
    skipConfirm?: boolean,
  ) => Promise<void>;
}
