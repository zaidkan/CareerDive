import { lazy, Suspense, useCallback, useReducer, useState } from "react";
import type { AvailableAction, ClientView } from "@sim/schemas";
import { ComputerOverlay } from "./ComputerOverlay.js";
import { FloorMap } from "./FloorMap.js";
import {
  INITIAL_SPATIAL,
  reduceSpatialEvent,
} from "./presentation.js";
import type { HotspotId } from "./worldTypes.js";

const RoomCanvas = lazy(async () => {
  const mod = await import("./RoomCanvas.js");
  return { default: mod.RoomCanvas };
});

const FLAVOR: Partial<Record<HotspotId, string>> = {
  coffee: "Coffee still warm. Nice, but the queue is waiting.",
  alert_wall:
    "Shared alert boards glow across the wall. Sit at your desk to work them.",
  morgan_station:
    "Morgan is nearby. Ask her from Team chat once you are at your desk.",
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
      case "coffee":
      case "alert_wall":
      case "morgan_station": {
        const message = FLAVOR[id];
        if (message) {
          dispatch({ type: "set_flavor", message });
        }
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
  const seated =
    spatial.phase === "seated_monitor" || spatial.phase === "focus_desk";

  return (
    <section className="spatial-shell" aria-label="Workplace space">
      {walking || spatial.phase === "seated_monitor" ? (
        <div className={`room-stage${seated ? " room-stage-dim" : ""}`}>
          <Suspense
            fallback={<p className="room-loading">Entering the operations floor…</p>}
          >
            <RoomCanvas
              enabled={walking}
              onInteract={handleInteract}
              onNearbyChange={onNearbyChange}
            />
          </Suspense>
          {walking ? (
            <div className="room-hud">
              <div>
                <p className="eyebrow">SOC floor</p>
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
        </div>
      ) : null}

      {spatial.phase === "seated_monitor" || spatial.phase === "focus_desk" ? (
        <ComputerOverlay
          guided={guided}
          onAction={onAction}
          onFocusDesk={() => {
            dispatch({ type: "focus_desk" });
          }}
          onStand={() => {
            dispatch({ type: "stand" });
          }}
          phase={spatial.phase}
          view={view}
        />
      ) : null}
    </section>
  );
}
