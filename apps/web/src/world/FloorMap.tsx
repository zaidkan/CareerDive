import { useEffect, useRef, useState } from "react";
import { COMPANY } from "./company.js";
import type { RoomId } from "./worldTypes.js";

const STEP_MS = 620;

type Point = { x: number; y: number };

/** Lobby mouth on the south spine. */
const LOBBY: Point = { x: 50, y: 92 };
/** Central crossroads. */
const CROSS: Point = { x: 50, y: 50 };

/**
 * Rooms dock onto hallway edges. Paths end at the physical door,
 * never cut through room interiors.
 */
const ROOMS: Array<{
  id: RoomId;
  label: string;
  hint: string;
  unlocked: boolean;
  /** Room panel (center positioning via left/top %) */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Door center on the hallway edge (unique per room) */
  door: Point;
  /** Axis-aligned waypoints: lobby → halls → door */
  path: Point[];
}> = [
  {
    id: "soc",
    label: "Security Operations",
    hint: "Your desk · open",
    unlocked: true,
    // North of east hall — door on bottom edge
    x: 78,
    y: 28,
    w: 30,
    h: 34,
    door: { x: 78, y: 45 },
    path: [LOBBY, CROSS, { x: 78, y: 50 }, { x: 78, y: 45 }],
  },
  {
    id: "break_room",
    label: "Conference",
    hint: "Booked · later",
    unlocked: false,
    x: 22,
    y: 28,
    w: 28,
    h: 34,
    door: { x: 22, y: 45 },
    path: [LOBBY, CROSS, { x: 22, y: 50 }, { x: 22, y: 45 }],
  },
  {
    id: "manager_office",
    label: "Manager Office",
    hint: "Morgan · later",
    unlocked: false,
    // South of east hall — door on top edge (not shared with SOC)
    x: 78,
    y: 72,
    w: 30,
    h: 28,
    door: { x: 78, y: 58 },
    path: [LOBBY, CROSS, { x: 78, y: 50 }, { x: 78, y: 58 }],
  },
];

function expandAxisPath(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const next of points) {
    const prev = out[out.length - 1];
    if (prev && prev.x !== next.x && prev.y !== next.y) {
      // Prefer vertical then horizontal (stay on spine, then branch)
      out.push({ x: prev.x, y: next.y });
    }
    out.push(next);
  }
  return out;
}

export function FloorMap({
  onEnterRoom,
  highlightRoomId,
  hint,
  stepLabel,
  title,
}: {
  onEnterRoom: (roomId: RoomId) => void;
  highlightRoomId?: RoomId;
  hint?: string;
  stepLabel?: string;
  title?: string;
}) {
  const [marker, setMarker] = useState<Point>(LOBBY);
  const [traveling, setTraveling] = useState(false);
  const [route, setRoute] = useState<Point[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<RoomId | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
    };
  }, []);

  function enter(room: (typeof ROOMS)[number]) {
    if (!room.unlocked || traveling) return;
    setTraveling(true);
    setActiveRoomId(room.id);
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
            setActiveRoomId(null);
          }, 480);
          timers.current.push(done);
        }
      }, index * STEP_MS);
      timers.current.push(id);
    });
  }

  const kicker = stepLabel ? `DAY ONE · ${stepLabel.toUpperCase()}` : "DAY ONE · STEP 1 OF 7";
  const showingActiveRoute = route.length > 1;
  const plannedRoom = highlightRoomId ? ROOMS.find((room) => room.id === highlightRoomId) : undefined;
  // Presentation only: the destination route stays legible before the walk starts.
  const plannedRoute = !showingActiveRoute && plannedRoom ? expandAxisPath(plannedRoom.path) : [];
  const visibleRoute = showingActiveRoute ? route : plannedRoute;

  return (
    <section className="floor-map floor-map--theater" aria-labelledby="floor-map-title">
      <div className="floor-map-copy">
        <div className="floor-map-meta">
          <p className="floor-kicker">{kicker}</p>
          <p className="floor-context">
            {COMPANY.fullName} · {COMPANY.floor}
          </p>
        </div>

        <h2 id="floor-map-title" className="floor-task-title">
          {title ?? "Head to Security Operations"}
        </h2>

        <dl className="floor-facts">
          <div className="floor-fact floor-fact-origin">
            <dt>You are here</dt>
            <dd>Lobby</dd>
          </div>
          <div className="floor-fact floor-fact-destination">
            <dt>Destination</dt>
            <dd>Security Operations</dd>
          </div>
          <div className="floor-fact floor-fact-route">
            <dt>Route</dt>
            <dd>
              <span className="floor-route-origin">Lobby</span>
              <span className="floor-route-arrow" aria-hidden="true">
                →
              </span>
              <span className="floor-route-dest">Security Operations</span>
            </dd>
          </div>
        </dl>

        <div className="floor-action">
          <p className="floor-action-label">Action</p>
          <p className="floor-action-text">Walk the marked route and enter the SOC.</p>
        </div>

        {highlightRoomId ? (
          <p className="floor-guide-callout">Go here next — gold door on the plan</p>
        ) : null}

        <ul className="floor-legend floor-legend-compact" aria-label="Map legend">
          <li>
            <span className="legend-you" aria-hidden="true" />
            You — Lobby
          </li>
          <li>
            <span className="legend-route" aria-hidden="true" />
            Route
          </li>
          <li>
            <span className="legend-open" aria-hidden="true" />
            Open — SOC
          </li>
          <li>
            <span className="legend-locked" aria-hidden="true" />
            Locked
          </li>
        </ul>

        {traveling ? (
          <p className="floor-traveling" aria-live="polite">
            Walking to the door…
          </p>
        ) : (
          <p className="floor-hint">{hint ?? "Tip: choose Security Operations — your desk is inside."}</p>
        )}
      </div>

      <div className="floor-map-stage">
        <div className="floor-map-grid floor-map-v2">
          <div className="floor-map-label">{COMPANY.floor} · corridor plan</div>

          {/* Physical hallway geometry — preserved */}
          <div className="hall-body hall-spine" aria-hidden="true" />
          <div className="hall-body hall-cross" aria-hidden="true" />
          <div className="hall-body hall-node" aria-hidden="true" />

          {/* Lobby vestibule — path starts here */}
          <div className="floor-vestibule">
            <span className="floor-vestibule-tag" aria-hidden="true">You are here</span>
            <span>Lobby</span>
            <small>Entrance</small>
          </div>

          {/* Door frames on the hall (physical destinations) */}
          {ROOMS.map((room) => (
            <div
              aria-hidden="true"
              className={`floor-doorframe${activeRoomId === room.id ? " floor-doorframe-active" : ""}${room.unlocked ? " floor-doorframe-open" : ""}${highlightRoomId === room.id ? " floor-doorframe-target" : ""}`}
              key={`door-${room.id}`}
              style={{
                left: `${String(room.door.x)}%`,
                top: `${String(room.door.y)}%`,
              }}
            >
              <span className="floor-door-leaf" />
              <span className="floor-door-label">{room.unlocked ? "OPEN" : "LOCKED"}</span>
            </div>
          ))}

          {visibleRoute.length > 1
            ? visibleRoute.slice(0, -1).map((from, i) => {
                const to = visibleRoute[i + 1];
                if (!to) return null;
                const vertical = from.x === to.x;
                const midX = (from.x + to.x) / 2;
                const midY = (from.y + to.y) / 2;
                const len = vertical ? Math.abs(to.y - from.y) : Math.abs(to.x - from.x);
                const isPlanned = !showingActiveRoute;
                return (
                  <span
                    className={`floor-route${vertical ? " floor-route-v" : ""}${isPlanned ? " floor-route-planned" : ""}`}
                    key={`seg-${String(i)}`}
                    style={
                      vertical
                        ? {
                            left: `${String(midX)}%`,
                            top: `${String(midY)}%`,
                            height: `${String(Math.max(len, 2))}%`,
                          }
                        : {
                            left: `${String(midX)}%`,
                            top: `${String(midY)}%`,
                            width: `${String(Math.max(len, 2))}%`,
                          }
                    }
                  />
                );
              })
            : null}

          {ROOMS.map((room) => (
            <button
              className={`floor-room floor-room-v2${highlightRoomId === room.id ? " floor-room-target" : ""}`}
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
              {highlightRoomId === room.id ? <span className="floor-room-target-chip">Go here next</span> : null}
              <span className="floor-room-doorhint" aria-hidden="true">
                {room.unlocked ? "→ door" : "locked"}
              </span>
            </button>
          ))}

          <span
            aria-hidden="true"
            className="floor-you floor-you-v2"
            style={{
              left: `${String(marker.x)}%`,
              top: `${String(marker.y)}%`,
              transitionDuration: `${String(STEP_MS)}ms`,
            }}
          />
        </div>
      </div>
    </section>
  );
}
