import React, { useRef, useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import logoDarkTheme from "../../../assets/icons/quota-shift-logo-512.png";
import logoLightTheme from "../../../assets/icons/quota-shift-logo-dark-512.png";
import { UpdateIcon, RefreshIcon, GearIcon } from "./HeaderIcons";
import { SettingsModal } from "./SettingsModal";
import { WindowControls } from "./WindowControls";
import { WindowResizeHandles } from "./WindowResizeHandles";
import { QuitButton } from "./QuitButton";
import { useMainWindowZoom } from "../../hooks/useMainWindowZoom";
import {
  loadTrackedPollIntervalPreference,
  saveTrackedPollIntervalPreference,
  loadIdlePollIntervalPreference,
  saveIdlePollIntervalPreference,
  savePollIntervalPreference,
} from "../../utils/common/poll-interval";
import {
  UI_ADJUSTMENT_EVENT,
  loadUiAdjustmentPreferences,
  normalizeUiAdjustmentPreferences,
  saveUiAdjustmentPreferences,
  type UiAdjustmentPreferences,
} from "../../utils/common/ui-adjustment";
import { type HeaderProps } from "./header-types";
export const Header: React.FC<HeaderProps> = ({
  updateAvailable,
  updateTag,
  isDownloadingUpdate,
  onTriggerUpdate,
  trackedPollInterval: propTrackedPollInterval,
  onTrackedPollIntervalChange: propOnTrackedPollIntervalChange,
  idlePollInterval: propIdlePollInterval,
  onIdlePollIntervalChange: propOnIdlePollIntervalChange,
  pollInterval: _pollInterval,
  onPollIntervalChange: _onPollIntervalChange,
  isRefreshing,
  onRefresh,
  onExportBackup,
  onImportBackup,
  isDarkMode,
  onToggleTheme,
  isOnline,
  statusText,
  keepAliveActive,
  onToggleKeepAlive,
  persistentWorkersEnabled,
  onTogglePersistentWorkers,
  codexModelScanProgress,
  onRescanAllCodexModels,
  overlayEnabled = true,
  onToggleOverlay,
  searchQuery: propSearchQuery,
  onSearchChange: propOnSearchChange,
  cardLayoutMode,
  onCardLayoutModeChange,
  platformVisibility,
  onPlatformVisibilityChange,
}) => {
  useMainWindowZoom();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [uiAdjustment, setUiAdjustment] = useState<UiAdjustmentPreferences>(() =>
    loadUiAdjustmentPreferences(),
  );
  const isSearchControlled = propSearchQuery !== undefined;
  const searchQuery = isSearchControlled ? propSearchQuery : internalSearchQuery;
  const win = getCurrentWindow();
  const [trackedPollInterval, setTrackedPollInterval] = useState(() =>
    propTrackedPollInterval !== undefined
      ? propTrackedPollInterval
      : loadTrackedPollIntervalPreference(),
  );
  const [idlePollInterval, setIdlePollInterval] = useState(() =>
    propIdlePollInterval !== undefined ? propIdlePollInterval : loadIdlePollIntervalPreference(),
  );
  useEffect(() => {
    if (propTrackedPollInterval !== undefined) setTrackedPollInterval(propTrackedPollInterval);
  }, [propTrackedPollInterval]);
  useEffect(() => {
    if (propIdlePollInterval !== undefined) setIdlePollInterval(propIdlePollInterval);
  }, [propIdlePollInterval]);
  useEffect(() => {
    const normalized = normalizeUiAdjustmentPreferences(uiAdjustment);
    if (JSON.stringify(normalized) !== JSON.stringify(uiAdjustment)) {
      setUiAdjustment(normalized);
      return;
    }
    const appTheme = isDarkMode ? "dark" : "light";
    const livePayload = { ...normalized, appTheme };
    saveUiAdjustmentPreferences(normalized);
    void Promise.allSettled([
      emitTo("overlay", UI_ADJUSTMENT_EVENT, livePayload),
      emitTo("overlay-tooltip", UI_ADJUSTMENT_EVENT, livePayload),
    ]);
  }, [uiAdjustment, isDarkMode]);
  const handleSearchChange = (val: string) => {
    if (!isSearchControlled) setInternalSearchQuery(val);
    propOnSearchChange?.(val);
  };
  const handleTrackedPollIntervalChange = (val: number) => {
    setTrackedPollInterval(val);
    saveTrackedPollIntervalPreference(val);
    savePollIntervalPreference(val);
    propOnTrackedPollIntervalChange?.(val);
    _onPollIntervalChange?.(val);
  };
  const handleIdlePollIntervalChange = (val: number) => {
    setIdlePollInterval(val);
    saveIdlePollIntervalPreference(val);
    propOnIdlePollIntervalChange?.(val);
  };
  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return;
    const onCancel = () => {
      invoke("show_dashboard").catch(() => {});
    };
    input.addEventListener("cancel", onCancel);
    return () => input.removeEventListener("cancel", onCancel);
  }, []);
  const handleHeaderMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button,input,select,textarea,a,[data-no-window-drag]")) return;
    void win.startDragging().catch(() => {});
  };
  const handleImportClick = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;
      try {
        await invoke("show_dashboard");
      } catch {}
      onImportBackup(content);
    };
    reader.readAsText(file);
  };
  return (
    <header className="app-header" onMouseDown={handleHeaderMouseDown}>
      <div className="header-logo header-drag-region" data-tauri-drag-region>
        <img
          className="logo-icon"
          src={isDarkMode ? logoDarkTheme : logoLightTheme}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <span className="app-title" data-tauri-drag-region>
          QuotaShift
        </span>
      </div>
      <div className="header-search">
        <svg
          className="header-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          className="header-search-input"
          placeholder="Search accounts..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") handleSearchChange("");
          }}
          spellCheck={false}
          autoComplete="off"
        />
        {searchQuery && (
          <button
            type="button"
            className="header-search-clear"
            onClick={() => handleSearchChange("")}
            title="Clear search"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="10"
              height="10"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <div className="header-right">
        {updateAvailable && (
          <button
            className={`update-btn ${isDownloadingUpdate ? "downloading" : ""}`}
            onClick={onTriggerUpdate}
            data-tooltip={
              isDownloadingUpdate
                ? "Downloading update..."
                : `New version ${updateTag} is available. Click to update.`
            }
          >
            <UpdateIcon />
          </button>
        )}
        <button
          className={`refresh-btn ${isRefreshing ? "spinning" : ""}`}
          onClick={onRefresh}
          disabled={isRefreshing}
          data-tooltip="Refresh quota status for all accounts"
        >
          <RefreshIcon />
        </button>
        <button
          className={`gear-menu-btn ${settingsOpen ? "gear-menu-btn--active" : ""}`}
          onClick={() => setSettingsOpen(true)}
          data-tooltip="Settings"
        >
          <GearIcon />
        </button>
        <QuitButton />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,.enc"
          style={{ display: "none" }}
        />
        <div className={`status-indicator ${!isOnline ? "offline" : ""}`} id="status-indicator">
          <span className="status-dot" />
          <span className="status-text">{statusText}</span>
        </div>
        <div className="window-controls-divider" aria-hidden="true" />
        <WindowControls />
      </div>
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isDarkMode={isDarkMode}
        onToggleTheme={onToggleTheme}
        trackedPollInterval={trackedPollInterval}
        onTrackedPollIntervalChange={handleTrackedPollIntervalChange}
        idlePollInterval={idlePollInterval}
        onIdlePollIntervalChange={handleIdlePollIntervalChange}
        keepAliveActive={keepAliveActive}
        onToggleKeepAlive={onToggleKeepAlive}
        persistentWorkersEnabled={persistentWorkersEnabled}
        onTogglePersistentWorkers={onTogglePersistentWorkers}
        overlayEnabled={overlayEnabled}
        onToggleOverlay={onToggleOverlay}
        codexModelScanProgress={codexModelScanProgress}
        onRescanAllCodexModels={() => {
          onRescanAllCodexModels();
          setSettingsOpen(false);
        }}
        onExportBackup={() => {
          onExportBackup();
          setSettingsOpen(false);
        }}
        onImportBackup={() => {
          handleImportClick();
          setSettingsOpen(false);
        }}
        cardLayoutMode={cardLayoutMode}
        onCardLayoutModeChange={onCardLayoutModeChange}
        platformVisibility={platformVisibility}
        onPlatformVisibilityChange={onPlatformVisibilityChange}
        uiAdjustment={uiAdjustment}
        onUiAdjustmentChange={setUiAdjustment}
      />
      <WindowResizeHandles />
    </header>
  );
};
