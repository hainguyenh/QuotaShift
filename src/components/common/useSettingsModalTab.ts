import { useEffect, useRef } from "react";
import type { SettingsTab } from "./settings-types";

export function useSettingsModalTab(activeTab: SettingsTab, isOpen: boolean, onClose: () => void) {
  const tabRefs = useRef<Partial<Record<SettingsTab, HTMLButtonElement>>>({});

  useEffect(() => {
    if (isOpen) {
      tabRefs.current[activeTab]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return tabRefs;
}
