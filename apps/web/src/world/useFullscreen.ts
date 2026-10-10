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
  exit: () => Promise<boolean>;
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

  // Finish exiting before hiding the room: a hidden fullscreen child still
  // covers the floor map and intercepts all its pointer input.
  const exit = useCallback(async (): Promise<boolean> => {
    const el = target.current;
    if (!el || !document.fullscreenElement ||
      !el.contains(document.fullscreenElement)) return true;
    try {
      await document.exitFullscreen();
      sync();
      return !document.fullscreenElement || !el.contains(document.fullscreenElement);
    } catch {
      return false;
    }
  }, [target, sync]);

  const toggle = useCallback(async () => {
    const el = target.current;
    if (!el) return;
    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen().catch(() => {
          /* Document may already be inactive during navigation. */
        });
      } else if (typeof el.requestFullscreen === "function") {
        await el.requestFullscreen();
      }
    } catch {
      /* Browser denied, or jsdom has no Fullscreen API. */
    }
  }, [target]);

  return { active, toggle, exit };
}
