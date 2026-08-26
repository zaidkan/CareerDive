import { useCallback, useEffect, useState, type RefObject } from "react";

export const DESK_OS_FILL_EVENT = "desk-os-fill-screen";

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useFullscreen(target: RefObject<HTMLElement | null>): {
  active: boolean;
  toggle: () => Promise<void>;
} {
  const [active, setActive] = useState(false);

  const sync = useCallback(() => {
    const el = target.current;
    setActive(Boolean(el && document.fullscreenElement === el));
  }, [target]);

  useEffect(() => {
    document.addEventListener("fullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
    };
  }, [sync]);

  const toggle = useCallback(async () => {
    const el = target.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else if (typeof el.requestFullscreen === "function") {
        await el.requestFullscreen();
      }
    } catch {
      /* Browser denied, or jsdom has no Fullscreen API. */
    }
  }, [target]);

  return { active, toggle };
}
