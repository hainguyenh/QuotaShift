import React from "react";

export const AntigravityEmptyState: React.FC = () => (
  <div className="codex-empty-state local-session-empty-monitored">
    <p className="codex-empty-title">No monitored Antigravity accounts</p>
    <p className="codex-empty-sub">
      Capture the local profile above or use Browser Login, then add it to the monitored list.
    </p>
  </div>
);
