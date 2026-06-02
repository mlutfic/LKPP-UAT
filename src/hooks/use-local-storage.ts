"use client";

import * as React from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = React.useState<T>(initialValue);

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      setValue(initialValue);
    }
  }, [initialValue, key]);

  const updateValue = React.useCallback(
    (nextValue: React.SetStateAction<T>) => {
      setValue((currentValue) => {
        const resolvedValue =
          typeof nextValue === "function"
            ? (nextValue as (previousValue: T) => T)(currentValue)
            : nextValue;

        window.localStorage.setItem(key, JSON.stringify(resolvedValue));
        return resolvedValue;
      });
    },
    [key],
  );

  return [value, updateValue] as const;
}
