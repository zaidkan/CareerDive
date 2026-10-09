import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useImperativeHandle,
  type Ref,
  type ReactNode,
} from "react";
import { usePrefersReducedMotion } from "../deskOs/os/reducedMotion.js";
import {
  dialogueTick,
  stopDialogueAudio,
  unlockDialogueAudio,
} from "./audio.js";

export function splitGraphemes(text: string): string[] {
  return typeof Intl.Segmenter === "function"
    ? [
        ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
          text,
        ),
      ].map((part) => part.segment)
    : Array.from(text);
}

export type DialogueController = {
  finish: () => void;
  isRevealing: () => boolean;
};

/** Only the duplicate visual text reveals. Assistive technology gets one complete utterance. */
export function DialogueLine({
  text,
  animate = true,
  advanceLabel = "Continue conversation",
  onAdvance,
  children,
  controller,
}: {
  text: string;
  animate?: boolean;
  advanceLabel?: string;
  onAdvance?: () => void;
  children?: ReactNode;
  controller?: Ref<DialogueController>;
}) {
  const reduced = usePrefersReducedMotion();
  const parts = useMemo(() => splitGraphemes(text), [text]);
  const instant = reduced || !animate;
  const [progress, setProgress] = useState(instant ? parts.length : 0);
  const finished = useRef(instant);
  const frame = useRef(0);
  const lastAdvance = useRef(-Infinity);
  const revealing = !instant && progress < parts.length;
  const finish = () => {
    finished.current = true;
    cancelAnimationFrame(frame.current);
    setProgress(parts.length);
    stopDialogueAudio();
  };
  useImperativeHandle(controller, () => ({
    finish,
    isRevealing: () => !finished.current,
  }));
  useEffect(() => {
    finished.current = instant || document.hidden;
    setProgress(finished.current ? parts.length : 0);
    frame.current = 0;
    let start: number | undefined;
    let lastSoundCount = 0;
    const tick = (now: number) => {
      if (finished.current) return;
      start ??= now;
      const count = Math.min(
        parts.length,
        Math.floor(((now - start) * Math.max(160, parts.length / 1.5)) / 1000),
      );
      setProgress(count);
      const printable = parts
        .slice(lastSoundCount, count)
        .filter((p) => p.trim()).length;
      if (printable >= 5) {
        dialogueTick(now);
        lastSoundCount = count;
      }
      if (count < parts.length) frame.current = requestAnimationFrame(tick);
      else {
        finished.current = true;
        stopDialogueAudio();
      }
    };
    const onVisibility = () => {
      if (document.hidden) {
        finished.current = true;
        setProgress(parts.length);
        cancelAnimationFrame(frame.current);
        stopDialogueAudio();
      }
    };
    const unlock = () => {
      unlockDialogueAudio();
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    if (!finished.current) frame.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame.current);
      stopDialogueAudio();
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, [text, parts, instant]);
  return (
    <div
      className="dialogue-line"
      onClickCapture={(event) => {
        if (
          revealing &&
          !(
            event.target instanceof Element &&
            event.target.closest("[data-dialogue-immediate]")
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
          finish();
        }
      }}
    >
      <span
        className="visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {text}
      </span>
      <p className="dialogue-text" aria-hidden="true" onClick={finish}>
        <span className="dialogue-text-layout">{text}</span>
        <span className="dialogue-text-reveal">
          {instant ? text : parts.slice(0, progress).join("")}
        </span>
      </p>
      <button
        type="button"
        className="dialogue-advance"
        onKeyDown={(event) => {
          if (event.repeat && (event.key === "Enter" || event.key === " "))
            event.preventDefault();
        }}
        onClick={() => {
          if (revealing) {
            finish();
            return;
          }
          const now = performance.now();
          if (now - lastAdvance.current < 200) return;
          lastAdvance.current = now;
          onAdvance?.();
        }}
      >
        {revealing ? "Show full message" : advanceLabel}
      </button>
      {children}
    </div>
  );
}
