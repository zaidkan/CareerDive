import { useSyncExternalStore } from "react";

const STORAGE_KEY = "career-expo:simulation-muted";
let muted = false;
try {
  muted = localStorage.getItem(STORAGE_KEY) === "true";
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
let worldVoice: OscillatorNode | undefined;
let worldCue = 0;
let resuming: Promise<void> | undefined;

function stopWorldSound() {
  try {
    worldVoice?.stop();
  } catch {
    /* Already stopped or unavailable. */
  }
  worldVoice = undefined;
}

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
    if (context.state === "suspended" && !resuming) {
      resuming = context.resume().catch(() => {}).finally(() => { resuming = undefined; });
    }
  } catch {
    /* Unsupported/blocked audio leaves dialogue fully usable. */
  }
}

export function setSimulationMuted(next: boolean) {
  muted = next;
  if (next) {
    worldCue += 1;
    stopDialogueAudio();
    stopWorldSound();
  }
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
    () => false,
  );
}

// Foley-like low creaks and soft latch tones; one brief effect voice, no queue.
const WORLD_SOUNDS = {
  sit: { pitch: 130, endPitch: 65, duration: 0.18, waveform: "triangle" },
  "glass-open": { pitch: 360, endPitch: 190, duration: 0.14, waveform: "sine" },
  "glass-close": { pitch: 240, endPitch: 120, duration: 0.1, waveform: "sine" },
  "fridge-open": {
    pitch: 155,
    endPitch: 82,
    duration: 0.16,
    waveform: "triangle",
  },
} as const;

/** Keep only the latest cue while a gesture-triggered resume finishes. */
export function playWorldSound(cue: keyof typeof WORLD_SOUNDS) {
  const ticket = ++worldCue;
  if (resuming) {
    void resuming.then(() => {
      if (ticket === worldCue) playWorldSound(cue);
    });
    return;
  }
  if (
    muted ||
    document.hidden ||
    !context ||
    context.state !== "running"
  )
    return;
  stopWorldSound();
  let voice: OscillatorNode | undefined;
  let gain: GainNode | undefined;
  try {
    const sound = WORLD_SOUNDS[cue];
    const start = context.currentTime;
    voice = context.createOscillator();
    gain = context.createGain();
    voice.type = sound.waveform;
    voice.frequency.value = sound.pitch;
    voice.frequency.linearRampToValueAtTime(
      sound.endPitch,
      start + sound.duration,
    );
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.007, start + 0.012);
    gain.gain.linearRampToValueAtTime(0, start + sound.duration);
    voice.connect(gain).connect(context.destination);
    const current = voice;
    const envelope = gain;
    voice.onended = () => {
      if (worldVoice === current) worldVoice = undefined;
      current.disconnect();
      envelope.disconnect();
    };
    worldVoice = voice;
    voice.start(start);
    voice.stop(start + sound.duration);
  } catch {
    // Missing/blocked audio must never prevent an interaction.
    stopWorldSound();
    try {
      voice?.disconnect();
      gain?.disconnect();
    } catch {
      /* Optional audio. */
    }
  }
}
