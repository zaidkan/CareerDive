import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type { AvailableAction, ClientView } from "@sim/schemas";
import { COMPANY } from "./company.js";
import { FloorMap } from "./FloorMap.js";
import { getJourneyStep } from "../journey.js";
import {
  INITIAL_SPATIAL,
  reduceSpatialEvent,
} from "./presentation.js";
import { nextJulesLine } from "./rooms/GlassBreakNook.js";
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
  jules: "Talk / coffee",
  coffee: "Talk / coffee",
  storage: "Open cabinets",
};

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
  const julesLine = useRef(0);

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

  const onNearbyChange = useCallback((id?: HotspotId, label?: string) => {
    if (id === undefined) {
      dispatch({ type: "set_nearby" });
    } else {
      dispatch({ type: "set_nearby", hotspotId: id });
    }
    setNearbyLabel(label);
  }, []);

  function handleInteract(id: HotspotId) {
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
      case "jules":
      case "coffee": {
        const { line, nextIndex } = nextJulesLine(julesLine.current);
        julesLine.current = nextIndex;
        dispatch({ type: "set_flavor", message: `Jules: “${line}”` });
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
  }

  const journey = getJourneyStep({
    phase: spatial.phase,
    view,
    ...(spatial.visitedDesk ? { visitedDesk: true } : {}),
  });
  const stepLabel = `Step ${String(journey.index)} of ${String(journey.total)}`;

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
  /** Spawning beside the exit should not bury the step the player is actually on. */
  const nearbyIsTarget =
    journey.target?.kind === "hotspot" &&
    journey.target.hotspotId === spatial.nearbyHotspotId;

  const walking = spatial.phase === "room_walk";
  const atDesk =
    spatial.phase === "desk_login" ||
    spatial.phase === "seated_monitor" ||
    spatial.phase === "focus_desk";
  const maximized = spatial.phase === "focus_desk";
  const deskPhase =
    spatial.phase === "desk_login" ||
    spatial.phase === "seated_monitor" ||
    spatial.phase === "focus_desk"
      ? spatial.phase
      : undefined;
  const roomLabel = "Security Operations";

  return (
    <section
      className={`spatial-shell${atDesk ? " spatial-shell-engaged" : ""}`}
      aria-label="Workplace space"
    >
      <div
        className={`room-stage${atDesk ? " room-stage-desk" : ""}${maximized ? " room-stage-desk-max" : ""}`}
      >
        <Suspense
          fallback={
            <p className="room-loading">Entering {roomLabel}…</p>
          }
        >
          <RoomCanvas
            enabled={walking}
            guided={guided}
            maximized={maximized}
            onAction={onAction}
            onInteract={handleInteract}
            onLoginSuccess={() => {
              dispatch({ type: "login_success" });
            }}
            onMaximize={() => {
              dispatch({ type: "focus_desk" });
            }}
            onMinimize={() => {
              dispatch({ type: "unfocus_desk" });
            }}
            onNearbyChange={onNearbyChange}
            onStand={() => {
              dispatch({ type: "stand" });
            }}
            seated={atDesk}
            view={view}
            {...(deskPhase ? { deskPhase } : {})}
            {...(journey.target?.kind === "hotspot"
              ? { highlightHotspotId: journey.target.hotspotId }
              : {})}
          />
        </Suspense>
        {walking && !pointerLocked ? (
          <p className="room-look-hint">
            Click to look around · WASD to walk · Esc to release
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
              {!nearbyIsTarget && nearbyPrompt ? (
                <p className="room-hud-nearby">{nearbyPrompt}</p>
              ) : null}
              <p className="room-hud-controls">
                Double-click to walk · E to interact
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
            <p className="room-hud-step">
              {stepLabel} · {journey.title}
            </p>
            <p>
              {spatial.phase === "desk_login"
                ? "Sign in on the monitor — use the yellow note credentials"
                : maximized
                  ? "Maximized workstation · Restore or Leave desk from the window chrome"
                  : "Click the monitor · Maximize for a closer view · Leave desk to stand"}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
