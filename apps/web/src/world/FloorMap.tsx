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
  w: number;
  h: number;
}> = [
  {
    id: "soc",
    label: "Security Operations",
    hint: "Night desk · open",
    unlocked: true,
    x: 58,
    y: 34,
    w: 28,
    h: 22,
  },
  {
    id: "break_room",
    label: "Break room",
    hint: "Closed this shift",
    unlocked: false,
    x: 20,
    y: 58,
    w: 22,
    h: 18,
  },
  {
    id: "manager_office",
    label: "Manager office",
    hint: "Closed this shift",
    unlocked: false,
    x: 76,
    y: 68,
    w: 20,
    h: 16,
  },
];

export function FloorMap({
  onEnterRoom,
}: {
  onEnterRoom: (roomId: RoomId) => void;
}) {
  const [marker, setMarker] = useState({ x: 16, y: 82 });
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
        <p className="eyebrow">Building directory</p>
        <h2 id="floor-map-title">Choose where to go</h2>
        <p>
          Hallways stay simple on the map. When you arrive, each room is a full
          workplace space you can walk through.
        </p>
        <ul className="floor-legend">
          <li>
            <span className="legend-open" /> Open tonight
          </li>
          <li>
            <span className="legend-locked" /> Locked this shift
          </li>
          <li>
            <span className="legend-you" /> You
          </li>
        </ul>
        {traveling ? (
          <p className="floor-traveling" aria-live="polite">
            Walking over…
          </p>
        ) : null}
      </div>
      <div className="floor-map-stage">
        <div className="floor-map-grid">
          <div className="floor-map-label">Floor 1 · Operations</div>
          <span
            className="floor-hall hall-h"
            style={{ top: "48%", left: "10%", width: "80%" }}
          />
          <span
            className="floor-hall hall-v"
            style={{ top: "16%", left: "46%", height: "68%" }}
          />
          <span className="floor-lobby" />
          {ROOMS.map((room) => (
            <button
              className="floor-room"
              data-unlocked={room.unlocked ? "true" : "false"}
              disabled={!room.unlocked || traveling}
              key={room.id}
              onClick={() => {
                enter(room);
              }}
              style={{
                left: `${String(room.x)}%`,
                top: `${String(room.y)}%`,
                width: `${String(room.w)}%`,
                height: `${String(room.h)}%`,
              }}
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
