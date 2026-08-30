import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  AvailableAction,
  ClientView,
  WorkplaceInteraction,
} from "@sim/schemas";
import { COMPANY } from "./company.js";
import {
  BreakRoomPanel,
  CarriedSnackControl,
  EnergyMeter,
} from "./BreakRoomPanel.js";
import { coffeeControl, fridgeControl } from "./breakRoom.js";
import { LaptopOverlay } from "./deskOs/LaptopOverlay.js";
import { FloorMap } from "./FloorMap.js";
import { getJourneyStep } from "../journey.js";
import { INITIAL_SPATIAL, reduceSpatialEvent } from "./presentation.js";
import { nextJulesLine } from "./rooms/GlassBreakNook.js";
import {
  isTypingTarget,
  useFullscreen,
  DESK_OS_FILL_EVENT,
} from "./useFullscreen.js";
import type { HotspotId } from "./worldTypes.js";
import type {
  NotificationHandler,
  TaskAttemptHandler,
  WorkplaceInteractionHandler,
} from "../components/shared.js";

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
  storage: "Open cabinets",
};

export function SpatialShell({
  view,
  onAction,
  onTaskAttempt,
  onNotification,
  onWorkplaceInteraction,
  guided = false,
}: {
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onTaskAttempt?: TaskAttemptHandler;
  onNotification?: NotificationHandler;
  onWorkplaceInteraction?: WorkplaceInteractionHandler;
  guided?: boolean;
}) {
  const [spatial, dispatch] = useReducer(reduceSpatialEvent, INITIAL_SPATIAL);
  const [nearbyLabel, setNearbyLabel] = useState<string>();
  const [pointerLocked, setPointerLocked] = useState(false);
  const [workplacePending, setWorkplacePending] = useState(false);
  const julesLine = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const workplacePendingRef = useRef(false);
  const closeFridgeIntentRef = useRef(false);
  const { active: fullscreen, toggle: toggleFullscreen } =
    useFullscreen(stageRef);

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

  const submitWorkplaceInteraction = useCallback(
    (interaction: WorkplaceInteraction) => {
      if (!onWorkplaceInteraction || workplacePendingRef.current) return;
      workplacePendingRef.current = true;
      setWorkplacePending(true);

      void (async () => {
        try {
          const result = await onWorkplaceInteraction(interaction);
          if (closeFridgeIntentRef.current) {
            closeFridgeIntentRef.current = false;
            if (result.view.workplace.fridgeOpen) {
              try {
                await onWorkplaceInteraction({ type: "close_fridge" });
              } catch {
                dispatch({
                  type: "set_flavor",
                  message:
                    "The fridge did not close. Return to the break room and try again.",
                });
              }
            }
          }
        } catch {
          dispatch({
            type: "set_flavor",
            message:
              interaction.type === "close_fridge"
                ? "The fridge did not close. Try again."
                : "That break-room action did not go through. Try again.",
          });
        } finally {
          closeFridgeIntentRef.current = false;
          workplacePendingRef.current = false;
          setWorkplacePending(false);
        }
      })();
    },
    [onWorkplaceInteraction],
  );

  const requestFridgeCloseOnExit = useCallback(() => {
    if (!onWorkplaceInteraction) return;
    if (workplacePendingRef.current) {
      closeFridgeIntentRef.current = true;
      return;
    }
    if (view.workplace.fridgeOpen) {
      submitWorkplaceInteraction({ type: "close_fridge" });
    }
  }, [
    onWorkplaceInteraction,
    submitWorkplaceInteraction,
    view.workplace.fridgeOpen,
  ]);

  const handleInteract = useCallback(
    (id: HotspotId) => {
      switch (id) {
        case "desk_player":
          dispatch({ type: "sit_desk" });
          break;
        case "door_exit":
          requestFridgeCloseOnExit();
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
        case "fridge": {
          const interaction = fridgeControl(view.workplace).interaction;
          if (interaction) submitWorkplaceInteraction(interaction);
          break;
        }
        case "coffee": {
          const interaction = coffeeControl(view.workplace).interaction;
          if (interaction) submitWorkplaceInteraction(interaction);
          break;
        }
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
    },
    [requestFridgeCloseOnExit, submitWorkplaceInteraction, view.workplace],
  );

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
  const energyLow =
    view.workplace.energy.current / view.workplace.energy.max <= 0.28;
  const energyEmpty = view.workplace.energy.current === 0;
  const highlightHotspotId: HotspotId | undefined =
    journey.target?.kind === "hotspot" ? journey.target.hotspotId : undefined;
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
  const compass = energyEmpty
    ? "Energy empty · use a carried snack or visit the break-room fridge and coffee maker"
    : energyLow
      ? "Energy getting low · carry a snack or use the coffee maker in the break room"
      : highlightHotspotId === "desk_player"
        ? "Your desk · follow the gold marker"
        : undefined;
  const breakStation =
    nearbyHotspotId === "fridge" || nearbyHotspotId === "coffee"
      ? nearbyHotspotId
      : undefined;
  const resourcePending = workplacePending;

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
          fallback={<p className="room-loading">Entering {roomLabel}…</p>}
        >
          <RoomCanvas
            enabled={walking}
            onBreakRoomExit={requestFridgeCloseOnExit}
            onInteract={handleInteract}
            onNearbyChange={onNearbyChange}
            seated={atDesk}
            workplace={view.workplace}
            {...(highlightHotspotId ? { highlightHotspotId } : {})}
          />
        </Suspense>
        {atDesk && deskPhase ? (
          <LaptopOverlay
            guided={guided}
            maximized={maximized}
            onAction={onAction}
            {...(onTaskAttempt ? { onTaskAttempt } : {})}
            {...(onNotification ? { onNotification } : {})}
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
        {walking && !pointerLocked ? (
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
              <p>
                {nearbyIsTarget && nearbyPrompt ? nearbyPrompt : journey.body}
              </p>
              {compass ? <p className="room-hud-compass">{compass}</p> : null}
              {!nearbyIsTarget && nearbyPrompt ? (
                <p className="room-hud-nearby">{nearbyPrompt}</p>
              ) : null}
              <EnergyMeter workplace={view.workplace} />
              {breakStation ? (
                <BreakRoomPanel
                  onSubmit={submitWorkplaceInteraction}
                  pending={resourcePending || !onWorkplaceInteraction}
                  station={breakStation}
                  workplace={view.workplace}
                />
              ) : null}
              <CarriedSnackControl
                onSubmit={submitWorkplaceInteraction}
                pending={resourcePending || !onWorkplaceInteraction}
                workplace={view.workplace}
              />
              <p className="room-hud-controls">
                Double-click to walk · E to interact · F fullscreen
              </p>
              {spatial.flavorMessage ? (
                <p className="room-flavor">{spatial.flavorMessage}</p>
              ) : null}
            </div>
            <div className="room-hud-actions">
              {nearbyHotspotId && !breakStation ? (
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
                  requestFridgeCloseOnExit();
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
              {energyLow ? (
                <p className="room-hud-compass">
                  Energy low · use a carried snack here, or stand and visit the
                  break room
                </p>
              ) : null}
              <EnergyMeter workplace={view.workplace} />
              <CarriedSnackControl
                onSubmit={submitWorkplaceInteraction}
                pending={resourcePending || !onWorkplaceInteraction}
                workplace={view.workplace}
              />
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
      </div>
    </section>
  );
}
