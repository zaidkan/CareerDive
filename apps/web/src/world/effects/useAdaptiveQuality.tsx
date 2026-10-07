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

/**
 * Frame-time hysteresis tuned for a true smooth-60 target.
 * A 46–50 fps line still feels choppy, so we degrade at 55 rather than 45,
 * and require a solid 58+ before climbing back — one tier at a time.
 */
export const QUALITY = {
  sampleCount: 48,
  warmupSeconds: 0.5,
  degradeFps: 55,
  degradeHoldSeconds: 1.5,
  restoreFps: 58,
  restoreHoldSeconds: 4,
  maxDeltaSeconds: 0.1,
} as const;

/** 0 = LOW, 1 = MEDIUM, 2 = HIGH. */
export type QualityTier = 0 | 1 | 2;

export type FpsSampler = {
  deltas: Float32Array;
  write: number;
  count: number;
};

export type QualityMachine = {
  sampler: FpsSampler;
  tier: QualityTier;
  allowRestore: boolean;
  warmed: number;
  lowHold: number;
  highHold: number;
  /** Consecutive visible slow-frame time, bounded against isolated hitches. */
  stalledSeconds: number;
};

export type AdaptiveQuality = {
  tier: QualityTier;
  composer: boolean;
  grain: boolean;
  cheapGlass: boolean;
  dustMul: number;
  contactShadows: boolean;
  dpr: 1 | 1.25;
  directionalShadows: boolean;
  /** Cosmetic emitters (LEDs, screen breath, fans) run only when true. */
  ambientEnabled: boolean;
  /** Shared cadence for cosmetic updates — never needs full frame rate. */
  ambientHz: number;
};

export const DEFAULT_QUALITY: AdaptiveQuality = {
  tier: 0,
  composer: false,
  grain: false,
  cheapGlass: true,
  dustMul: 0,
  contactShadows: false,
  dpr: 1,
  directionalShadows: false,
  ambientEnabled: false,
  ambientHz: 8,
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
  startTier: QualityTier;
  allowRestore: boolean;
}): QualityMachine {
  return {
    sampler: {
      deltas: new Float32Array(QUALITY.sampleCount),
      write: 0,
      count: 0,
    },
    tier: opts.startTier,
    allowRestore: opts.allowRestore,
    warmed: 0,
    lowHold: 0,
    highHold: 0,
    stalledSeconds: 0,
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
 * Step the tier machine. Returns true only when the tier actually changed.
 *
 * Hysteresis: sustained <55 fps for 1.5s drops one tier; sustained ≥58 fps
 * for 4s raises one tier (never skips). Large deltas and hidden documents
 * are ignored so alt-tab does not count as a GPU failure — but a *run* of
 * large deltas is: below ~10 fps the sampler is blind (every delta exceeds
 * the cap and is discarded), so consecutive stalls use the same degrade hold.
 * Each stall contributes at most 250 ms. Low-end devices start at
 * LOW with restore disabled, so they never pay for bloom.
 */
export function stepQuality(
  machine: QualityMachine,
  delta: number,
  hidden: boolean,
): boolean {
  if (hidden || !Number.isFinite(delta) || delta <= 0) {
    machine.stalledSeconds = 0;
    return false;
  }
  if (!machine.allowRestore && machine.tier === 0) return false;

  // Watchdog: count sustained visible frames too slow for the FPS sampler.
  if (delta > QUALITY.maxDeltaSeconds) {
    const elapsed = Math.min(delta, 0.25);
    machine.warmed = Math.min(QUALITY.warmupSeconds, machine.warmed + elapsed);
    if (machine.warmed >= QUALITY.warmupSeconds) {
      // Bound isolated shader/tab-resume hitches; only sustained stalls degrade.
      machine.stalledSeconds += elapsed;
      if (
        machine.stalledSeconds >= QUALITY.degradeHoldSeconds &&
        machine.tier > 0
      ) {
        machine.tier = (machine.tier - 1) as QualityTier;
        machine.lowHold = 0;
        machine.highHold = 0;
        machine.stalledSeconds = 0;
        return true;
      }
    }
    return false;
  }
  // Countable frame: the sampler owns the decision again.
  machine.stalledSeconds = 0;
  pushDelta(machine.sampler, delta);
  if (machine.warmed < QUALITY.warmupSeconds) {
    machine.warmed += delta;
    return false;
  }

  const fps = smoothedFps(machine.sampler);
  const before = machine.tier;

  // Dead zone (degradeFps ≤ fps < restoreFps) resets both holds so a mixed
  // line never accumulates a partial degrade or restore.
  if (fps < QUALITY.degradeFps) {
    machine.lowHold += delta;
    machine.highHold = 0;
    if (machine.lowHold >= QUALITY.degradeHoldSeconds && machine.tier > 0) {
      machine.tier = (machine.tier - 1) as QualityTier;
      machine.lowHold = 0;
      machine.highHold = 0;
    }
  } else if (
    machine.allowRestore &&
    fps >= QUALITY.restoreFps &&
    machine.tier < 2
  ) {
    machine.highHold += delta;
    machine.lowHold = 0;
    if (machine.highHold >= QUALITY.restoreHoldSeconds) {
      machine.tier = (machine.tier + 1) as QualityTier;
      machine.highHold = 0;
      machine.lowHold = 0;
    }
  } else {
    machine.lowHold = 0;
    machine.highHold = 0;
  }

  return machine.tier !== before;
}

export function resolveEffects(input: {
  tier: QualityTier;
  seated: boolean;
  reducedMotion: boolean;
  lowEnd: boolean;
}): AdaptiveQuality {
  const walking = !input.seated;
  const leanMotion =
    input.seated || input.reducedMotion || input.lowEnd || input.tier < 2;

  if (!walking || input.tier === 0) {
    return {
      tier: input.tier,
      composer: false,
      grain: false,
      cheapGlass: true,
      dustMul: 0,
      contactShadows: false,
      dpr: 1,
      directionalShadows: false,
      // Seated Desk OS still animates figure/hands via their own flags;
      // decorative emitters stay frozen.
      ambientEnabled: walking && input.tier > 0,
      ambientHz: 6,
    };
  }

  const high = input.tier === 2;
  return {
    tier: input.tier,
    composer: high,
    grain: false,
    cheapGlass: true,
    dustMul: high ? (leanMotion ? 0.5 : 1) : 0.5,
    contactShadows: high,
    // Avoid supersampling the dense room; quality still scales effects/shadows.
    dpr: 1,
    directionalShadows: true,
    ambientEnabled: !input.reducedMotion,
    ambientHz: high ? 12 : 8,
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
  const [tier, setTier] = useState<QualityTier>(() => (lowEnd ? 0 : 2));
  const machineRef = useRef<QualityMachine | undefined>(undefined);
  if (machineRef.current === undefined) {
    machineRef.current = createQualityMachine({
      startTier: lowEnd ? 0 : 2,
      allowRestore: !lowEnd,
    });
  }

  useEffect(() => {
    const resetHolds = () => {
      const machine = machineRef.current;
      if (!machine) return;
      machine.lowHold = 0;
      machine.highHold = 0;
      machine.stalledSeconds = 0;
    };
    document.addEventListener("visibilitychange", resetHolds);
    return () => { document.removeEventListener("visibilitychange", resetHolds); };
  }, []);

  useFrame((_, delta) => {
    // Seated quality is already resolved by resolveEffects; skip the sampler
    // so demand/idle Desk OS frames do not keep a quality machine warm.
    if (seated) return;
    const machine = machineRef.current;
    if (machine === undefined) return;
    const hidden = typeof document !== "undefined" && document.hidden;
    if (!stepQuality(machine, delta, hidden)) return;
    setTier(machine.tier);
  });

  const quality = resolveEffects({ tier, seated, reducedMotion, lowEnd });
  useEffect(() => {
    setDpr(quality.dpr);
  }, [quality.dpr, setDpr]);
  return quality;
}
