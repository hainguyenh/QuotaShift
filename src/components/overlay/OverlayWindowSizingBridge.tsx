import React, { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { LogicalSize, PhysicalPosition } from "@tauri-apps/api/dpi";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { currentMonitor } from "@tauri-apps/api/window";
import { APP_THEME_EVENT, THEME_KEY } from "../../utils/common/app-constants";
import {
  UI_ADJUSTMENT_EVENT,
  UI_ADJUSTMENT_STORAGE_KEY,
  getOverlayWindowHeight,
  getOverlayWindowWidth,
  loadUiAdjustmentPreferences,
  normalizeUiAdjustmentPreferences,
  type UiAdjustmentPreferences,
} from "../../utils/common/ui-adjustment";

export const OverlayWindowSizingBridge: React.FC = () => {
  useEffect(() => {
    const win = getCurrentWebviewWindow();
    let preferences = loadUiAdjustmentPreferences();
    let resizeFrame: number | null = null;
    let lastApplied: { width: number; height: number } | null = null;
    let currentProvider: string | null = null;

    const applyAppTheme = (theme?: string | null) => {
      document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
    };

    try {
      const savedProvider = localStorage.getItem("quotashift_overlay_tracked_provider");
      if (savedProvider) {
        currentProvider = savedProvider;
      } else {
        const rawData = localStorage.getItem("quotashift_overlay_data");
        if (rawData) {
          const parsed = JSON.parse(rawData);
          if (parsed?.provider) currentProvider = parsed.provider;
        }
      }
    } catch {}

    const clampToWorkArea = async () => {
      const monitor = await currentMonitor();
      if (!monitor) return;
      const position = await win.outerPosition();
      const size = await win.outerSize();
      const workPosition = monitor.workArea?.position ?? monitor.position;
      const workSize = monitor.workArea?.size ?? monitor.size;
      const maxX = Math.max(workPosition.x, workPosition.x + workSize.width - size.width);
      const maxY = Math.max(workPosition.y, workPosition.y + workSize.height - size.height);
      const x = Math.max(workPosition.x, Math.min(maxX, position.x));
      const y = Math.max(workPosition.y, Math.min(maxY, position.y));
      if (x !== position.x || y !== position.y) await win.setPosition(new PhysicalPosition(x, y));
    };

    const resizeOverlay = async () => {
      const next = {
        width: getOverlayWindowWidth(preferences, currentProvider),
        height: getOverlayWindowHeight(preferences, currentProvider),
      };
      if (lastApplied?.width === next.width && lastApplied?.height === next.height) return;
      await win.setSize(new LogicalSize(next.width, next.height));
      lastApplied = next;
      await clampToWorkArea();
    };

    const scheduleResize = () => {
      if (resizeFrame !== null) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        void resizeOverlay().catch(() => {});
      });
    };

    const apply = (nextPreferences: UiAdjustmentPreferences = preferences) => {
      preferences = normalizeUiAdjustmentPreferences(nextPreferences);
      document.documentElement.style.setProperty(
        "--overlay-ui-scale",
        String(preferences.overlayScale / 100),
      );
      document.documentElement.setAttribute("data-overlay-theme", preferences.overlayTheme);
      scheduleResize();
    };

    applyAppTheme(localStorage.getItem(THEME_KEY));
    apply();
    let unlistenUi: (() => void) | null = null;
    let unlistenTheme: (() => void) | null = null;
    let unlistenData: (() => void) | null = null;
    let cancelled = false;
    void listen<UiAdjustmentPreferences & { appTheme?: string }>(UI_ADJUSTMENT_EVENT, (event) => {
      if (event.payload?.appTheme) applyAppTheme(event.payload.appTheme);
      apply(event.payload);
    }).then((unlisten) => {
      if (cancelled) unlisten();
      else unlistenUi = unlisten;
    });
    void listen<string>(APP_THEME_EVENT, (event) => applyAppTheme(event.payload)).then(
      (unlisten) => {
        if (cancelled) unlisten();
        else unlistenTheme = unlisten;
      },
    );
    void listen<{ provider?: string }>("overlay-data-update", (event) => {
      if (event.payload?.provider && event.payload.provider !== currentProvider) {
        currentProvider = event.payload.provider;
        scheduleResize();
      }
    }).then((unlisten) => {
      if (cancelled) unlisten();
      else unlistenData = unlisten;
    });

    const handleStorage = (event: StorageEvent) => {
      if (event.key === UI_ADJUSTMENT_STORAGE_KEY) apply(loadUiAdjustmentPreferences());
      if (event.key === THEME_KEY) applyAppTheme(event.newValue);
      if (
        event.key === "quotashift_overlay_tracked_provider" &&
        event.newValue &&
        event.newValue !== currentProvider
      ) {
        currentProvider = event.newValue;
        scheduleResize();
      }
      if (event.key === "quotashift_overlay_data" && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          if (parsed?.provider && parsed.provider !== currentProvider) {
            currentProvider = parsed.provider;
            scheduleResize();
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      cancelled = true;
      if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
      unlistenUi?.();
      unlistenTheme?.();
      unlistenData?.();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return null;
};
