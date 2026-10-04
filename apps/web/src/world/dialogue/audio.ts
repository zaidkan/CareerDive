import { useSyncExternalStore } from "react";

const STORAGE_KEY = "career-expo:simulation-muted";
let muted = true;
try {
  muted = localStorage.getItem(STORAGE_KEY) !== "false";
} catch {
  /* Storage is optional. */
}
let context: AudioContext | undefined;
let lastTick = -Infinity;
const voices = new Set<OscillatorNode>();
const listeners = new Set<() => void>();

export function stopDialogueAudio() {
  for (const voice of voices) {
    try {
      voice.stop();
    } catch {
      /* Already stopped. */
    }
  }
  voices.clear();
}

/** Call synchronously from a user gesture; never create audio during render. */
export function unlockDialogueAudio() {
  if (muted || typeof AudioContext === "undefined" || document.hidden) return;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
  } catch {
    /* Unsupported/blocked audio leaves dialogue fully usable. */
  }
}

export function setSimulationMuted(next: boolean) {
  muted = next;
  if (next) stopDialogueAudio();
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    /* Storage is optional. */
  }
  for (const listener of listeners) listener();
  if (!next) unlockDialogueAudio();
}

export function dialogueTick(now: number) {
  if (
    muted ||
    document.hidden ||
    !context ||
    context.state !== "running" ||
    now - lastTick < 100
  )
    return;
  lastTick = now;
  // A single quiet 24 ms electronic key tick; no audio backlog or per-character sources.
  stopDialogueAudio();
  const voice = context.createOscillator();
  const gain = context.createGain();
  voice.type = "sine";
  voice.frequency.value = 1050;
  const start = context.currentTime;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.009, start + 0.002);
  gain.gain.setValueAtTime(0.009, start + 0.006);
  gain.gain.linearRampToValueAtTime(0, start + 0.024);
  voice.connect(gain).connect(context.destination);
  voices.add(voice);
  voice.onended = () => {
    voices.delete(voice);
    voice.disconnect();
    gain.disconnect();
  };
  voice.start(start);
  voice.stop(start + 0.024);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function useSimulationMuted() {
  return useSyncExternalStore(
    subscribe,
    () => muted,
    () => true,
  );
}
