import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CustomDialog } from "./CustomDialog";

const QuitIcon = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v10" />
    <path d="M6.3 5.7a8 8 0 1 0 11.4 0" />
  </svg>
);

export const QuitButton: React.FC = () => {
  const [quitOpen, setQuitOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="quit-app-btn"
        data-tooltip="Quit QuotaShift"
        aria-label="Quit QuotaShift"
        onClick={() => setQuitOpen(true)}
      >
        <QuitIcon />
      </button>
      {quitOpen && (
        <CustomDialog
          title="Quit QuotaShift"
          message="Quit QuotaShift completely? Background monitoring and tray services will stop."
          isConfirm
          confirmText="Quit"
          cancelText="Cancel"
          confirmVariant="danger"
          onClose={(confirmed) => {
            setQuitOpen(false);
            if (confirmed) void invoke("quit_app");
          }}
        />
      )}
    </>
  );
};
