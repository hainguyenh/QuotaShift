import { useEffect, useRef } from "react";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { loadShortcutPreferences } from "./shortcuts";

export function useGlobalShortcuts(
  onToggleOverlay: () => void,
  onRefreshAccount: () => void
): void {
  const toggleRef = useRef(onToggleOverlay);
  const refreshRef = useRef(onRefreshAccount);

  useEffect(() => {
    toggleRef.current = onToggleOverlay;
    refreshRef.current = onRefreshAccount;
  });

  useEffect(() => {
    let currentPrefs = loadShortcutPreferences();
    let registeredKeys: string[] = [];

    const applyShortcuts = async () => {
      const { toggleOverlay, refreshAccount } = currentPrefs;
      const nextKeys: string[] = [];
      if (toggleOverlay) {
        try {
          await unregister(toggleOverlay).catch(() => {});
          await register(toggleOverlay, (e) => {
            if (e.state === "Pressed") {
              toggleRef.current();
            }
          });
          nextKeys.push(toggleOverlay);
          console.info("[QuotaShift] Registered toggleOverlay shortcut:", toggleOverlay);
        } catch (err) {
          console.error("Failed to register toggleOverlay shortcut:", toggleOverlay, err);
        }
      }
      if (refreshAccount) {
        try {
          await unregister(refreshAccount).catch(() => {});
          await register(refreshAccount, (e) => {
            if (e.state === "Pressed") {
              refreshRef.current();
            }
          });
          nextKeys.push(refreshAccount);
          console.info("[QuotaShift] Registered refreshAccount shortcut:", refreshAccount);
        } catch (err) {
          console.error("Failed to register refreshAccount shortcut:", refreshAccount, err);
        }
      }
      registeredKeys = nextKeys;
    };

    const cleanupShortcuts = async () => {
      if (registeredKeys.length > 0) {
        try {
          await unregister(registeredKeys);
        } catch (err) {
          console.error("Failed to unregister shortcuts:", registeredKeys, err);
        }
        registeredKeys = [];
      }
    };

    applyShortcuts();

    const handleChange = async () => {
      await cleanupShortcuts();
      currentPrefs = loadShortcutPreferences();
      await applyShortcuts();
    };

    window.addEventListener("quotashift_shortcuts_changed", handleChange);
    return () => {
      window.removeEventListener("quotashift_shortcuts_changed", handleChange);
      void cleanupShortcuts();
    };
  }, []);
}
