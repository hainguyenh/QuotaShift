import React from "react";
import { CodexEmptyState } from "./CodexEmptyState";

interface CodexTabEmptyProps {
  totalAccounts: number;
  searchQuery?: string;
}

export const CodexTabEmpty: React.FC<CodexTabEmptyProps> = ({ totalAccounts, searchQuery }) => {
  if (totalAccounts === 0) {
    return <CodexEmptyState />;
  }

  return (
    <div className="codex-empty-state" style={{ margin: "16px auto", textAlign: "center" }}>
      <p className="codex-empty-title">No matching accounts</p>
      <p className="codex-empty-sub">No accounts found matching "{searchQuery?.trim()}"</p>
    </div>
  );
};
