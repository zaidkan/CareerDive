import { useState, type SetStateAction } from "react";

export function readTabValue<T>(key: string, fallback: T): T {
  try {
    const value = sessionStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeTabValue(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Draft remains usable in memory when storage is unavailable. */
  }
}
/** Session-scoped tab drafts; never evidence of completed work. */
export function useTabDraft<T>(
  key: string,
  initial: T,
): [T, (value: SetStateAction<T>) => void] {
  const [value, setValue] = useState<T>(() => readTabValue(key, initial));
  return [
    value,
    (next) => {
      setValue((current) => {
        const result =
          typeof next === "function"
            ? (next as (value: T) => T)(current)
            : next;
        writeTabValue(key, result);
        return result;
      });
    },
  ];
}
