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
// A restrained A-minor pentatonic contour: soft speech blips, not a melody queue.
const BLIP_PITCHES = [1046.5, 880, 1174.7, 1046.5, 784, 880] as const;
let nextPitch = 0;
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
  // One quiet 24 ms sine blip. Advance pitches only when a voice starts;
  // throttled, muted, or blocked attempts never queue notes for later.
  stopDialogueAudio();
  let voice: OscillatorNode | undefined;
  let gain: GainNode | undefined;
  try {
    voice = context.createOscillator();
    gain = context.createGain();
    voice.type = "sine";
    voice.frequency.value =
      BLIP_PITCHES[nextPitch % BLIP_PITCHES.length] ?? 1050;
    const start = context.currentTime;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.009, start + 0.002);
    gain.gain.setValueAtTime(0.009, start + 0.006);
    gain.gain.linearRampToValueAtTime(0, start + 0.024);
    voice.connect(gain).connect(context.destination);
    const currentVoice = voice;
    const currentGain = gain;
    voice.onended = () => {
      voices.delete(currentVoice);
      currentVoice.disconnect();
      currentGain.disconnect();
    };
    voices.add(voice);
    voice.start(start);
    nextPitch = (nextPitch + 1) % BLIP_PITCHES.length;
    voice.stop(start + 0.024);
  } catch {
    // Browser audio failures must not interrupt the text reveal.
    stopDialogueAudio();
    try {
      voice?.disconnect();
      gain?.disconnect();
    } catch {
      /* Cleanup can also fail on an unavailable audio device. */
    }
  }
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
