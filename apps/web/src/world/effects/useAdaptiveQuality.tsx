import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export type NavBits = {
  hardwareConcurrency?: number;
  deviceMemory?: number;
};

export const QUALITY = {
  sampleCount: 48,
  warmupSeconds: 0.5,
  disableFps: 45,
  disableHoldSeconds: 1.5,
  restoreFps: 58,
  restoreHoldSeconds: 4,
  maxDeltaSeconds: 0.1,
} as const;

export type FpsSampler = {
  deltas: Float32Array;
  write: number;
  count: number;
};

export type QualityMachine = {
  sampler: FpsSampler;
  composerOn: boolean;
  allowRestore: boolean;
  warmed: number;
  lowHold: number;
  highHold: number;
};

export type AdaptiveQuality = {
  composer: boolean;
  grain: boolean;
  cheapGlass: boolean;
  dustMul: number;
  contactShadows: boolean;
  dpr: 1 | 1.25;
  directionalShadows: boolean;
};

export const DEFAULT_QUALITY: AdaptiveQuality = {
  composer: false,
  grain: false,
  cheapGlass: true,
  dustMul: 0,
  contactShadows: false,
  dpr: 1,
  directionalShadows: false,
};

/**
 * Shared with RoomCanvas DPR so "low-end" means the same thing everywhere.
 * Missing `deviceMemory` (Safari/Firefox) is unknown, not 4 GB — otherwise
 * every non-Chromium browser would look like a 4 GB machine.
 */
export function readNavigator(): NavBits | undefined {
  if (typeof navigator === "undefined") return undefined;
  const bits: NavBits = {};
  if (typeof navigator.hardwareConcurrency === "number") {
    bits.hardwareConcurrency = navigator.hardwareConcurrency;
  }
  if ("deviceMemory" in navigator) {
    const mem = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;
    if (typeof mem === "number") bits.deviceMemory = mem;
  }
  return bits;
}

export function isLowEndDevice(nav: NavBits | undefined): boolean {
  if (nav === undefined) return true;
  const cores = nav.hardwareConcurrency ?? 4;
  if (cores <= 4) return true;
  return nav.deviceMemory !== undefined && nav.deviceMemory <= 4;
}

export function createQualityMachine(opts: {
  startOn: boolean;
  allowRestore: boolean;
}): QualityMachine {
  return {
    sampler: {
      deltas: new Float32Array(QUALITY.sampleCount),
      write: 0,
      count: 0,
    },
    composerOn: opts.startOn,
    allowRestore: opts.allowRestore,
    warmed: 0,
    lowHold: 0,
    highHold: 0,
  };
}

function pushDelta(sampler: FpsSampler, delta: number): void {
  sampler.deltas[sampler.write] = delta;
  sampler.write = (sampler.write + 1) % QUALITY.sampleCount;
  if (sampler.count < QUALITY.sampleCount) sampler.count += 1;
}

export function smoothedFps(sampler: FpsSampler): number {
  if (sampler.count === 0) return 60;
  let sum = 0;
  for (let i = 0; i < sampler.count; i += 1) {
    sum += sampler.deltas[i] ?? 0;
  }
  const mean = sum / sampler.count;
  if (mean <= 0) return 60;
  return 1 / mean;
}

/**
 * Hysteresis: drop below 45 fps for 1.5s to disable, then require ~58 fps for
 * 4s to come back. Restore (not a one-way latch) so a shader-compile hitch
 * after warmup does not permanently strip the look; the 45/58 gap plus long
 * holds stop a noisy 50 fps line from flickering. Large deltas and hidden
 * documents are ignored so an alt-tab does not count as a GPU failure.
 * Low-end devices start off and `allowRestore` is false, so they never pay
 * for the postprocessing chunk.
 */
export function stepQuality(
  machine: QualityMachine,
  delta: number,
  hidden: boolean,
): boolean {
  if (hidden || delta <= 0 || delta > QUALITY.maxDeltaSeconds) return false;
  pushDelta(machine.sampler, delta);
  if (machine.warmed < QUALITY.warmupSeconds) {
    machine.warmed += delta;
    return false;
  }

  const fps = smoothedFps(machine.sampler);
  const wasOn = machine.composerOn;

  if (machine.composerOn) {
    if (fps < QUALITY.disableFps) {
      machine.lowHold += delta;
      machine.highHold = 0;
      if (machine.lowHold >= QUALITY.disableHoldSeconds) {
        machine.composerOn = false;
        machine.lowHold = 0;
        machine.highHold = 0;
      }
    } else {
      machine.lowHold = 0;
    }
  } else if (machine.allowRestore) {
    if (fps >= QUALITY.restoreFps) {
      machine.highHold += delta;
      machine.lowHold = 0;
      if (machine.highHold >= QUALITY.restoreHoldSeconds) {
        machine.composerOn = true;
        machine.highHold = 0;
        machine.lowHold = 0;
      }
    } else {
      machine.highHold = 0;
    }
  }

  return machine.composerOn !== wasOn;
}

export function resolveEffects(input: {
  composerOn: boolean;
  seated: boolean;
  reducedMotion: boolean;
  lowEnd: boolean;
}): AdaptiveQuality {
  const composer = input.composerOn && !input.seated;
  const lean =
    input.seated || input.lowEnd || input.reducedMotion || !input.composerOn;
  const fullScene = !input.seated && !input.lowEnd && input.composerOn;
  return {
    composer,
    grain: composer && !input.reducedMotion,
    cheapGlass: true,
    dustMul:
      input.seated || input.lowEnd || !input.composerOn ? 0 : lean ? 0.5 : 1,
    contactShadows: fullScene,
    // Avoid supersampling the dense room; quality still scales effects/shadows.
    dpr: 1,
    directionalShadows: fullScene,
  };
}

const QualityContext = createContext<AdaptiveQuality>(DEFAULT_QUALITY);

export function WorldQualityProvider({
  seated,
  children,
}: {
  seated: boolean;
  children: ReactNode;
}) {
  const quality = useAdaptiveQuality(seated);
  return (
    <QualityContext.Provider value={quality}>
      {children}
    </QualityContext.Provider>
  );
}

export function useWorldQuality(): AdaptiveQuality {
  return useContext(QualityContext);
}

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => undefined;
  }
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => {
    mq.removeEventListener("change", onStoreChange);
  };
}

function getReducedMotion(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useAdaptiveQuality(seated: boolean): AdaptiveQuality {
  const setDpr = useThree((state) => state.setDpr);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const [lowEnd] = useState(() => isLowEndDevice(readNavigator()));
  const [composerOn, setComposerOn] = useState(() => !lowEnd);
  const machineRef = useRef<QualityMachine | undefined>(undefined);
  if (machineRef.current === undefined) {
    machineRef.current = createQualityMachine({
      startOn: !lowEnd,
      allowRestore: !lowEnd,
    });
  }

  useFrame((_, delta) => {
    // Seated quality is already resolved by resolveEffects; skip the sampler
    // so demand/idle Desk OS frames do not keep a quality machine warm.
    if (seated) return;
    const machine = machineRef.current;
    if (machine === undefined) return;
    const hidden = typeof document !== "undefined" && document.hidden;
    if (!stepQuality(machine, delta, hidden)) return;
    setComposerOn(machine.composerOn);
  });

  const quality = resolveEffects({ composerOn, seated, reducedMotion, lowEnd });
  useEffect(() => {
    setDpr(quality.dpr);
  }, [quality.dpr, setDpr]);
  return quality;
}
