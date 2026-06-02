"use client";

import * as React from "react";

import { useLocalStorage } from "@/hooks/use-local-storage";

export function usePersistentInternalSettings<T extends Record<string, boolean>>(
  storageKey: string,
  defaults: T,
) {
  const [settings, setSettings] = useLocalStorage<T>(storageKey, defaults);

  const activeCount = React.useMemo(
    () => Object.values(settings).filter(Boolean).length,
    [settings],
  );

  const updateSetting = React.useCallback(
    <Key extends keyof T,>(key: Key, value: T[Key]) => {
      setSettings((currentValue) => ({
        ...currentValue,
        [key]: value,
      }));
    },
    [setSettings],
  );

  const resetSettings = React.useCallback(() => {
    setSettings(defaults);
  }, [defaults, setSettings]);

  return {
    settings,
    activeCount,
    updateSetting,
    resetSettings,
    setSettings,
  };
}
