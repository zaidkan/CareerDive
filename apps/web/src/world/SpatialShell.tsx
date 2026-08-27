import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { AvailableAction, ClientView } from "@sim/schemas";
import { COMPANY } from "./company.js";
import { LaptopOverlay } from "./deskOs/LaptopOverlay.js";
import { FloorMap } from "./FloorMap.js";
import { getJourneyStep } from "../journey.js";
import {
  BAR_RESTORE,
  COFFEE_RESTORE,
  ENERGY_MAX,
  MORGAN_SCOLD,
  SLEEP_MS,
  WAKE_ENERGY,
  drainEnergy,
  didCollapse,
  energyRedirectsWayfinder,
  energyTone,
  getEnergy,
  restoreEnergy,
  setEnergySnapshot,
  shouldPublishEnergy,
  subscribeEnergy,
} from "./energy.js";
import {
  INITIAL_SPATIAL,
  reduceSpatialEvent,
} from "./presentation.js";
import { nextJulesLine } from "./rooms/GlassBreakNook.js";
import { isTypingTarget, useFullscreen, DESK_OS_FILL_EVENT } from "./useFullscreen.js";
import type { HotspotId } from "./worldTypes.js";

const RoomCanvas = lazy(async () => {
  const mod = await import("./RoomCanvas.js");
  return { default: mod.RoomCanvas };
});

const FLAVOR: Partial<Record<HotspotId, string>> = {
  break_door:
    "Glass break corner in the far wall — coffee with Jules if you want a breather.",
  alert_wall:
    "Shared alert boards. Sit at your desk when you are ready to work them.",
  morgan_station:
    "Morgan can help — ask from Team chat once you are at your desk.",
  door_exit: "Back to the floor map.",
};

const INTERACT_LABEL: Partial<Record<HotspotId, string>> = {
  desk_player: "Sit at computer",
  break_door: "Use door",
  door_exit: "Exit to map",
  jules: "Talk to Jules",
  coffee: "Drink coffee",
  snack: "Eat a bar",
  storage: "Open cabinets",
};

const ALREADY_FED = "You're fine. Save it for later.";
const COFFEE_SIP = "The coffee's harsh, but you're awake again.";
const BAR_BITE = "The bar is dry cardboard. Energy comes back anyway.";

function EnergyMeter() {
  const value = useSyncExternalStore(subscribeEnergy, getEnergy, getEnergy);
  const tone = energyTone(value);
  return (
    <div
      aria-label="Energy"
      aria-valuemax={ENERGY_MAX}
      aria-valuemin={0}
      aria-valuenow={Math.round(value)}
      className={`energy-meter energy-meter-${tone}`}
      data-testid="energy-meter"
      role="meter"
    >
      <span className="energy-meter-label">Energy</span>
      <span className="energy-meter-track">
        <span
          className="energy-meter-fill"
          style={{ width: `${String(Math.round(value))}%` }}
        />
      </span>
    </div>
  );
}

export function SpatialShell({
  view,
  onAction,
  guided = false,
}: {
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  guided?: boolean;
}) {
  const [spatial, dispatch] = useReducer(reduceSpatialEvent, INITIAL_SPATIAL);
  const [nearbyLabel, setNearbyLabel] = useState<string>();
  const [pointerLocked, setPointerLocked] = useState(false);
  const [energy, setEnergy] = useState(ENERGY_MAX);
  const [sleeping, setSleeping] = useState(false);
  const julesLine = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const energyRef = useRef(ENERGY_MAX);
  const energyPublishElapsedRef = useRef(0);
  const seatedRef = useRef(false);
  const sleepingRef = useRef(false);
  const { active: fullscreen, toggle: toggleFullscreen } = useFullscreen(stageRef);

  useEffect(() => {
    setEnergySnapshot(energyRef.current);
  }, []);

  useEffect(() => {
    const syncLock = () => {
      setPointerLocked(document.pointerLockElement != null);
    };
    document.addEventListener("pointerlockchange", syncLock);
    document.addEventListener("pointerlockerror", syncLock);
    return () => {
      document.removeEventListener("pointerlockchange", syncLock);
      document.removeEventListener("pointerlockerror", syncLock);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (spatial.phase !== "room_walk") return;
      if (event.code !== "KeyF" || event.repeat) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      void toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [spatial.phase, toggleFullscreen]);

  const onNearbyChange = useCallback((id?: HotspotId, label?: string) => {
    if (id === undefined) {
      dispatch({ type: "set_nearby" });
    } else {
      dispatch({ type: "set_nearby", hotspotId: id });
    }
    setNearbyLabel(label);
  }, []);

  const applyEnergy = useCallback((next: number) => {
    energyRef.current = next;
    energyPublishElapsedRef.current = 0;
    setEnergySnapshot(next);
    setEnergy(next);
  }, []);

  const sipOrSnack = useCallback((amount: number, restoredMessage: string) => {
    if (energyRef.current >= ENERGY_MAX - 0.5) {
      dispatch({ type: "set_flavor", message: ALREADY_FED });
      return;
    }
    applyEnergy(restoreEnergy(energyRef.current, amount));
    dispatch({ type: "set_flavor", message: restoredMessage });
  }, [applyEnergy]);

  const handleInteract = useCallback((id: HotspotId) => {
    if (sleepingRef.current) return;
    switch (id) {
      case "desk_player":
        dispatch({ type: "sit_desk" });
        break;
      case "door_exit":
        dispatch({ type: "leave_room" });
        break;
      case "break_door":
        window.dispatchEvent(new Event("soc-break-door"));
        {
          const message = FLAVOR[id];
          if (message) dispatch({ type: "set_flavor", message });
        }
        break;
      case "jules": {
        const { line, nextIndex } = nextJulesLine(julesLine.current);
        julesLine.current = nextIndex;
        dispatch({ type: "set_flavor", message: `Jules: “${line}”` });
        break;
      }
      case "coffee":
        sipOrSnack(COFFEE_RESTORE, COFFEE_SIP);
        break;
      case "snack":
        sipOrSnack(BAR_RESTORE, BAR_BITE);
        break;
      /** The drawer sliding open is the whole feedback — no caption needed. */
      case "storage":
        window.dispatchEvent(new Event("soc-storage"));
        break;
      case "alert_wall":
      case "morgan_station": {
        const message = FLAVOR[id];
        if (message) dispatch({ type: "set_flavor", message });
        break;
      }
      default:
        break;
    }
  }, [sipOrSnack]);

  const journey = getJourneyStep({
    phase: spatial.phase,
    view,
    ...(spatial.visitedDesk ? { visitedDesk: true } : {}),
  });
  const stepLabel = `Step ${String(journey.index)} of ${String(journey.total)}`;
  const walking = spatial.phase === "room_walk";
  const atDesk =
    spatial.phase === "desk_login" ||
    spatial.phase === "seated_monitor" ||
    spatial.phase === "focus_desk";
  seatedRef.current = atDesk;
  sleepingRef.current = sleeping;

  useEffect(() => {
    if (spatial.phase === "floor_map") return;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      if (!sleepingRef.current) {
        const previous = energyRef.current;
        const next = drainEnergy(previous, dt, seatedRef.current);
        if (next !== previous) {
          energyRef.current = next;
          energyPublishElapsedRef.current += dt;
          const prevTone = energyTone(previous);
          const nextTone = energyTone(next);
          const collapsed = didCollapse(previous, next);
          if (shouldPublishEnergy(energyPublishElapsedRef.current, previous, next)) {
            energyPublishElapsedRef.current = 0;
            setEnergySnapshot(next);
          }
          if (prevTone !== nextTone) {
            setEnergy(next);
          }
          if (collapsed) {
            sleepingRef.current = true;
            setSleeping(true);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [spatial.phase]);

  useEffect(() => {
    if (!sleeping) return;
    dispatch({
      type: "set_flavor",
      message: "You nodded off. Someone is shaking your shoulder…",
    });
    const id = window.setTimeout(() => {
      energyRef.current = WAKE_ENERGY;
      setEnergySnapshot(WAKE_ENERGY);
      setEnergy(WAKE_ENERGY);
      sleepingRef.current = false;
      setSleeping(false);
      dispatch({ type: "set_flavor", message: MORGAN_SCOLD });
    }, SLEEP_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [sleeping]);

  if (spatial.phase === "floor_map") {
    return (
      <FloorMap
        hint={journey.body}
        onEnterRoom={(roomId) => {
          dispatch({ type: "enter_room", roomId });
        }}
        stepLabel={stepLabel}
        title={journey.title}
        {...(journey.target?.kind === "room"
          ? { highlightRoomId: journey.target.roomId }
          : {})}
      />
    );
  }

  const nearbyHotspotId = spatial.nearbyHotspotId;
  const nearbyPrompt = nearbyLabel
    ? nearbyLabel === "Your chair"
      ? "At your chair — press E or Sit to use the computer"
      : `Near: ${nearbyLabel} · press E or Interact`
    : undefined;
  const energyBand = energyTone(energy);
  const redirectSnack = energyRedirectsWayfinder(
    energyBand,
    spatial.visitedDesk === true,
  );
  const energyLow = energyBand !== "ok";
  const highlightHotspotId: HotspotId | undefined = redirectSnack
    ? "snack"
    : journey.target?.kind === "hotspot"
      ? journey.target.hotspotId
      : undefined;
  /** Spawning beside the exit should not bury the step the player is actually on. */
  const nearbyIsTarget =
    highlightHotspotId !== undefined &&
    highlightHotspotId === spatial.nearbyHotspotId;

  const maximized = spatial.phase === "focus_desk";
  const deskPhase =
    spatial.phase === "desk_login" ||
    spatial.phase === "seated_monitor" ||
    spatial.phase === "focus_desk"
      ? spatial.phase
      : undefined;
  const roomLabel = "Security Operations";
  const fullscreenLabel = fullscreen ? "Exit fullscreen" : "Fullscreen";
  const compass = sleeping
    ? undefined
    : redirectSnack
      ? "Energy low · follow the gold marker to the snack bars (coffee is in the break corner)"
      : energyLow
        ? "Energy getting low · snack bars are in the east aisle, coffee in the break corner"
        : highlightHotspotId === "desk_player"
        ? "Your desk · follow the gold marker"
        : undefined;

  return (
    <section
      className={`spatial-shell${atDesk ? " spatial-shell-engaged" : ""}`}
      aria-label="Workplace space"
    >
      <div
        className={`room-stage${atDesk ? " room-stage-desk" : ""}${maximized ? " room-stage-desk-max" : ""}${fullscreen ? " room-stage-fs" : ""}`}
        ref={stageRef}
      >
        <Suspense
          fallback={
            <p className="room-loading">Entering {roomLabel}…</p>
          }
        >
          <RoomCanvas
            enabled={walking && !sleeping}
            onInteract={handleInteract}
            onNearbyChange={onNearbyChange}
            seated={atDesk}
            {...(highlightHotspotId ? { highlightHotspotId } : {})}
          />
        </Suspense>
        {atDesk && deskPhase ? (
          <LaptopOverlay
            disabled={sleeping}
            guided={guided}
            maximized={maximized}
            onAction={onAction}
            onLoginSuccess={() => {
              dispatch({ type: "login_success" });
            }}
            onMaximize={() => {
              dispatch({ type: "focus_desk" });
            }}
            onMinimize={() => {
              dispatch({ type: "unfocus_desk" });
            }}
            onStand={() => {
              dispatch({ type: "stand" });
            }}
            phase={deskPhase}
            view={view}
          />
        ) : null}
        {walking && !pointerLocked && !sleeping ? (
          <p className="room-look-hint">
            Click to look around · WASD to walk · F fullscreen · Esc to release
          </p>
        ) : null}
        {walking ? (
          <div className="room-hud">
            <div>
              <p className="eyebrow">
                {COMPANY.name} · {roomLabel} · {stepLabel}
              </p>
              <p className="room-hud-step">{journey.title}</p>
              <p>{nearbyIsTarget && nearbyPrompt ? nearbyPrompt : journey.body}</p>
              {compass ? <p className="room-hud-compass">{compass}</p> : null}
              {!nearbyIsTarget && nearbyPrompt ? (
                <p className="room-hud-nearby">{nearbyPrompt}</p>
              ) : null}
              <EnergyMeter />
              <p className="room-hud-controls">
                Double-click to walk · E to interact · F fullscreen
              </p>
              {spatial.flavorMessage ? (
                <p className="room-flavor">{spatial.flavorMessage}</p>
              ) : null}
            </div>
            <div className="room-hud-actions">
              {nearbyHotspotId ? (
                <button
                  className="start-shift"
                  onClick={() => {
                    handleInteract(nearbyHotspotId);
                  }}
                  type="button"
                >
                  {INTERACT_LABEL[nearbyHotspotId] ?? "Interact"}
                </button>
              ) : null}
              <button
                aria-pressed={fullscreen}
                className="guidance-secondary"
                onClick={() => {
                  void toggleFullscreen();
                }}
                type="button"
              >
                {fullscreenLabel}
              </button>
              <button
                className="guidance-secondary"
                onClick={() => {
                  dispatch({ type: "leave_room" });
                }}
                type="button"
              >
                Floor map
              </button>
            </div>
          </div>
        ) : null}
        {atDesk ? (
          <div className="room-desk-hud">
            <div>
              <p className="room-hud-step">
                {stepLabel} · {journey.title}
              </p>
              <p>
                {spatial.phase === "desk_login"
                  ? "Sign in on the laptop — credentials are on the yellow note"
                  : maximized
                    ? "Maximized workstation · Fill screen for the full OS · Leave desk to stand"
                    : "Use the laptop · Maximize in the room, or Fill screen for the full OS"}
              </p>
              {energyLow && !sleeping ? (
                <p className="room-hud-compass">
                  Energy low · stand up and follow the gold marker to the snack bars
                </p>
              ) : null}
              <EnergyMeter />
            </div>
            <button
              className="guidance-secondary room-desk-hud-fs"
              onClick={() => {
                window.dispatchEvent(new Event(DESK_OS_FILL_EVENT));
              }}
              type="button"
            >
              Fill screen
            </button>
          </div>
        ) : null}
        {sleeping ? (
          <div className="sleep-overlay" role="status">
            <p className="sleep-overlay-title">You fell asleep</p>
            <p>Morgan is shaking your shoulder. This nap does not skip the shift clock.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
