import React from "react";

export const CodexPoolMemberIdentity: React.FC<{ label: string; email?: string | null }> = ({
  label,
  email,
}) => (
  <div className="codex-pool-member-identity">
    <span className="codex-pool-member-label">{label}</span>
    <span className="codex-pool-member-email">{email ?? "No email"}</span>
  </div>
);
