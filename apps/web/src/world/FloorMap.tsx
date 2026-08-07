import { useEffect, useRef, useState } from "react";
import type { RoomId } from "./worldTypes.js";

const STEP_MS = 900;

type Point = { x: number; y: number };

const LOBBY: Point = { x: 18, y: 82 };
const JUNCTION: Point = { x: 48, y: 48 };

const ROOMS: Array<{
  id: RoomId;
  label: string;
  hint: string;
  unlocked: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  door: Point;
  path: Point[];
}> = [
  {
    id: "soc",
    label: "Security Operations",
    hint: "Night desk · open",
    unlocked: true,
    x: 72,
    y: 28,
    w: 26,
    h: 24,
    door: { x: 58, y: 40 },
    path: [LOBBY, JUNCTION, { x: 58, y: 40 }, { x: 72, y: 28 }],
  },
  {
    id: "break_room",
    label: "Break room",
    hint: "Closed this shift",
    unlocked: false,
    x: 22,
    y: 28,
    w: 22,
    h: 20,
    door: { x: 34, y: 40 },
    path: [LOBBY, JUNCTION, { x: 34, y: 40 }, { x: 22, y: 28 }],
  },
  {
    id: "manager_office",
    label: "Manager office",
    hint: "Closed this shift",
    unlocked: false,
    x: 78,
    y: 72,
    w: 20,
    h: 18,
    door: { x: 62, y: 62 },
    path: [LOBBY, JUNCTION, { x: 62, y: 62 }, { x: 78, y: 72 }],
  },
];

export function FloorMap({
  onEnterRoom,
}: {
  onEnterRoom: (roomId: RoomId) => void;
}) {
  const [marker, setMarker] = useState<Point>(LOBBY);
  const [traveling, setTraveling] = useState(false);
  const [activePath, setActivePath] = useState<Point[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
    };
  }, []);

  function enter(room: (typeof ROOMS)[number]) {
    if (!room.unlocked || traveling) return;
    setTraveling(true);
    setActivePath(room.path);
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];

    room.path.forEach((point, index) => {
      const id = window.setTimeout(() => {
        setMarker(point);
        if (index === room.path.length - 1) {
          const done = window.setTimeout(() => {
            onEnterRoom(room.id);
            setTraveling(false);
            setActivePath([]);
          }, 350);
          timers.current.push(done);
        }
      }, index * STEP_MS);
      timers.current.push(id);
    });
  }

  return (
    <section className="floor-map" aria-labelledby="floor-map-title">
      <div className="floor-map-copy">
        <p className="eyebrow">Building directory</p>
        <h2 id="floor-map-title">Choose where to go</h2>
        <p>
          Follow the hallway on the map. When you arrive, that room opens as a
          full space you can walk through.
        </p>
        <ul className="floor-legend">
          <li>
            <span className="legend-open" /> Open tonight
          </li>
          <li>
            <span className="legend-locked" /> Locked this shift
          </li>
          <li>
            <span className="legend-you" aria-hidden="true">
              🚶
            </span>{" "}
            You
          </li>
        </ul>
        {traveling ? (
          <p className="floor-traveling" aria-live="polite">
            Walking the hallway…
          </p>
        ) : null}
      </div>
      <div className="floor-map-stage">
        <div className="floor-map-grid">
          <div className="floor-map-label">Floor 1 · Operations</div>

          {/* Hallway cross */}
          <span className="floor-hall hall-h main-hall" />
          <span className="floor-hall hall-v main-hall-v" />
          <span className="floor-hall-label hall-label-h">Main hall</span>
          <span className="floor-hall-label hall-label-v">North wing</span>

          <span className="floor-lobby">
            <span>Lobby</span>
          </span>

          {activePath.length > 1
            ? activePath.slice(0, -1).map((from, i) => {
                const to = activePath[i + 1]!;
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const len = Math.hypot(dx, dy);
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                return (
                  <span
                    className="floor-route"
                    key={`route-${i}`}
                    style={{
                      left: `${String(midX)}%`,
                      top: `${String(midY)}%`,
                      width: `${String(len)}%`,
                      transform: `translate(-50%, -50%) rotate(${String(angle)}deg)`,
                    }}
                  />
                );
              })
            : null}

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
              transitionDuration: `${String(STEP_MS)}ms`,
            }}
          >
            🚶
          </span>
        </div>
      </div>
    </section>
  );
}
