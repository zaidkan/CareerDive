import { lazy, Suspense, useCallback, useReducer, useRef, useState } from "react";
import type { AvailableAction, ClientView } from "@sim/schemas";
import { COMPANY } from "./company.js";
import { FloorMap } from "./FloorMap.js";
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
  storage:
    "Cable and adapter cabinets — open them if you need a spare lead.",
  door_exit: "Back to the floor map.",
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
  const julesLine = useRef(0);

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
      case "storage": {
        window.dispatchEvent(new Event("soc-storage"));
        const message = FLAVOR[id];
        if (message) dispatch({ type: "set_flavor", message });
        break;
      }
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

  if (spatial.phase === "floor_map") {
    return (
      <FloorMap
        onEnterRoom={(roomId) => {
          dispatch({ type: "enter_room", roomId });
        }}
      />
    );
  }

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
            {...(spatial.roomId ? { roomId: spatial.roomId } : {})}
          />
        </Suspense>
        {walking ? (
          <div className="room-hud">
            <div>
              <p className="eyebrow">
                {COMPANY.name} · {roomLabel}
              </p>
              <p>
                {nearbyLabel
                  ? nearbyLabel === "Your chair"
                    ? "At your chair — press E or Sit to use the computer"
                    : `Near: ${nearbyLabel} · press E or Interact`
                  : "WASD move · drag to look · double-click to walk · E to interact"}
              </p>
              {spatial.flavorMessage ? (
                <p className="room-flavor">{spatial.flavorMessage}</p>
              ) : null}
            </div>
            <div className="room-hud-actions">
              {spatial.nearbyHotspotId ? (
                <button
                  className="start-shift"
                  onClick={() => {
                    handleInteract(spatial.nearbyHotspotId!);
                  }}
                  type="button"
                >
                  {spatial.nearbyHotspotId === "desk_player"
                    ? "Sit at computer"
                    : spatial.nearbyHotspotId === "break_door"
                      ? "Use door"
                      : spatial.nearbyHotspotId === "door_exit"
                        ? "Exit to map"
                        : spatial.nearbyHotspotId === "jules" ||
                            spatial.nearbyHotspotId === "coffee"
                          ? "Talk / coffee"
                          : spatial.nearbyHotspotId === "storage"
                            ? "Open cabinets"
                            : "Interact"}
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
