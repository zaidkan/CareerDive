import { useEffect, useRef, useState } from "react";
import { COMPANY } from "./company.js";
import type { RoomId } from "./worldTypes.js";

const STEP_MS = 750;

type Point = { x: number; y: number };

/** Axis-aligned hallway network only — no diagonal shortcuts. */
const ENTRANCE: Point = { x: 50, y: 90 };
const JUNCTION: Point = { x: 50, y: 50 };

const ROOMS: Array<{
  id: RoomId;
  label: string;
  hint: string;
  unlocked: boolean;
  /** Room panel top-left via center positioning */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Door attaches to hallway edge */
  door: Point;
  path: Point[];
}> = [
  {
    id: "soc",
    label: "Security Operations",
    hint: "Your desk · open",
    unlocked: true,
    x: 78,
    y: 28,
    w: 28,
    h: 26,
    door: { x: 64, y: 50 },
    path: [ENTRANCE, JUNCTION, { x: 64, y: 50 }, { x: 78, y: 28 }],
  },
  {
    id: "break_room",
    label: "Break Room",
    hint: "Coffee · open",
    unlocked: true,
    x: 22,
    y: 28,
    w: 26,
    h: 26,
    door: { x: 36, y: 50 },
    path: [ENTRANCE, JUNCTION, { x: 36, y: 50 }, { x: 22, y: 28 }],
  },
  {
    id: "manager_office",
    label: "Manager Office",
    hint: "Morgan · later",
    unlocked: false,
    x: 78,
    y: 74,
    w: 26,
    h: 22,
    door: { x: 64, y: 50 },
    path: [ENTRANCE, JUNCTION, { x: 64, y: 50 }, { x: 78, y: 74 }],
  },
];

function expandAxisPath(points: Point[]): Point[] {
  const out: Point[] = [points[0]!];
  for (let i = 1; i < points.length; i += 1) {
    const prev = out[out.length - 1]!;
    const next = points[i]!;
    if (prev.x !== next.x && prev.y !== next.y) {
      // Force hallway routing through shared axis (prefer junction y, then x)
      out.push({ x: prev.x, y: next.y });
    }
    out.push(next);
  }
  return out;
}

export function FloorMap({
  onEnterRoom,
}: {
  onEnterRoom: (roomId: RoomId) => void;
}) {
  const [marker, setMarker] = useState<Point>(ENTRANCE);
  const [traveling, setTraveling] = useState(false);
  const [route, setRoute] = useState<Point[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
    };
  }, []);

  function enter(room: (typeof ROOMS)[number]) {
    if (!room.unlocked || traveling) return;
    setTraveling(true);
    const path = expandAxisPath(room.path);
    setRoute(path);
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];

    path.forEach((point, index) => {
      const id = window.setTimeout(() => {
        setMarker(point);
        if (index === path.length - 1) {
          const done = window.setTimeout(() => {
            onEnterRoom(room.id);
            setTraveling(false);
            setRoute([]);
          }, 400);
          timers.current.push(done);
        }
      }, index * STEP_MS);
      timers.current.push(id);
    });
  }

  return (
    <section className="floor-map" aria-labelledby="floor-map-title">
      <div className="floor-map-copy">
        <p className="eyebrow">{COMPANY.fullName}</p>
        <h2 id="floor-map-title">Day one · where to?</h2>
        <p>
          Start at the lobby entrance, walk the halls, then enter a room. Only
          open rooms light up tonight.
        </p>
        <ul className="floor-legend">
          <li>
            <span className="legend-open" /> Open
          </li>
          <li>
            <span className="legend-locked" /> Locked
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
        ) : (
          <p className="floor-hint">Tip: pick Security Operations to start your desk.</p>
        )}
      </div>
      <div className="floor-map-stage">
        <div className="floor-map-grid floor-map-connected">
          <div className="floor-map-label">{COMPANY.floor}</div>

          {/* Connected hallway cross — rooms dock onto these edges */}
          <div className="hall-strip hall-vertical" aria-hidden="true" />
          <div className="hall-strip hall-horizontal" aria-hidden="true" />
          <div className="hall-junction" aria-hidden="true" />

          <div className="floor-entrance">
            <span>Lobby / Entrance</span>
            <small>Start here</small>
          </div>

          {route.length > 1
            ? route.slice(0, -1).map((from, i) => {
                const to = route[i + 1]!;
                const vertical = from.x === to.x;
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                const len = vertical
                  ? Math.abs(to.y - from.y)
                  : Math.abs(to.x - from.x);
                return (
                  <span
                    className={`floor-route${vertical ? " floor-route-v" : ""}`}
                    key={`seg-${i}`}
                    style={
                      vertical
                        ? {
                            left: `${String(midX)}%`,
                            top: `${String(midY)}%`,
                            height: `${String(len)}%`,
                          }
                        : {
                            left: `${String(midX)}%`,
                            top: `${String(midY)}%`,
                            width: `${String(len)}%`,
                          }
                    }
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

          {/* Door notches on hallway */}
          <span className="hall-door" style={{ left: "64%", top: "50%" }} />
          <span className="hall-door" style={{ left: "36%", top: "50%" }} />

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
