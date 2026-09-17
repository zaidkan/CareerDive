import { useEffect, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Tracks the OS reduced-motion setting; safe when matchMedia is missing. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => prefersReducedMotion());
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const list = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => {
      setReduced(list.matches);
    };
    if (typeof list.addEventListener === "function") {
      list.addEventListener("change", onChange);
      return () => {
        list.removeEventListener("change", onChange);
      };
    }
    return undefined;
  }, []);
  return reduced;
}
