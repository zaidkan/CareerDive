import { useState } from "react";
import type { RoomId } from "./worldTypes.js";

const TRAVEL_MS = 1600;

const ROOMS: Array<{
  id: RoomId;
  label: string;
  hint: string;
  unlocked: boolean;
  x: number;
  y: number;
}> = [
  {
    id: "soc",
    label: "Security Operations",
    hint: "Your desk is here",
    unlocked: true,
    x: 62,
    y: 38,
  },
  {
    id: "break_room",
    label: "Break room",
    hint: "Not open this shift",
    unlocked: false,
    x: 22,
    y: 55,
  },
  {
    id: "manager_office",
    label: "Manager office",
    hint: "Not open this shift",
    unlocked: false,
    x: 78,
    y: 72,
  },
];

export function FloorMap({
  onEnterRoom,
}: {
  onEnterRoom: (roomId: RoomId) => void;
}) {
  const [marker, setMarker] = useState({ x: 18, y: 78 });
  const [traveling, setTraveling] = useState(false);

  function enter(room: (typeof ROOMS)[number]) {
    if (!room.unlocked || traveling) return;
    setTraveling(true);
    setMarker({ x: room.x, y: room.y });
    window.setTimeout(() => {
      onEnterRoom(room.id);
      setTraveling(false);
    }, TRAVEL_MS);
  }

  return (
    <section className="floor-map" aria-labelledby="floor-map-title">
      <div className="floor-map-copy">
        <p className="eyebrow">Workplace floor</p>
        <h2 id="floor-map-title">Choose where to go</h2>
        <p>
          Hallways stay simple — pick a room and you will head there. Only the
          operations floor is open for this shift.
        </p>
        {traveling ? (
          <p className="floor-traveling" aria-live="polite">
            Walking over…
          </p>
        ) : null}
      </div>
      <div className="floor-map-stage">
        <div className="floor-map-grid">
          <span
            className="floor-hall hall-h"
            style={{ top: "48%", left: "8%", width: "84%" }}
          />
          <span
            className="floor-hall hall-v"
            style={{ top: "18%", left: "48%", height: "64%" }}
          />
          {ROOMS.map((room) => (
            <button
              className="floor-room"
              data-unlocked={room.unlocked ? "true" : "false"}
              disabled={!room.unlocked || traveling}
              key={room.id}
              onClick={() => {
                enter(room);
              }}
              style={{ left: `${String(room.x)}%`, top: `${String(room.y)}%` }}
              type="button"
            >
              <strong>{room.label}</strong>
              <small>{room.hint}</small>
            </button>
          ))}
          <span
            aria-hidden="true"
            className="floor-you"
            style={{
              left: `${String(marker.x)}%`,
              top: `${String(marker.y)}%`,
              transitionDuration: `${String(TRAVEL_MS)}ms`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
