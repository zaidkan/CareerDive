import type { AvailableAction, ClientView, WorkSystemId } from "@sim/schemas";
import { useEffect, useRef, useState } from "react";
import { SystemToolPanel } from "../../components/SystemToolPanel.js";
import { getShiftGuidance } from "../../guidance.js";
import {
  WORK_SYSTEMS,
  formatShiftClock,
  systemLabel,
} from "../../systems.js";
import { COMPANY } from "../company.js";
import { DESK_LOGIN } from "../deskLogin.js";

export type DeskOsTab = "home" | "calendar" | WorkSystemId;

const APP_TABS: Array<{ id: DeskOsTab; label: string; path: string }> = [
  { id: "home", label: "Dashboard", path: "verdaly://ops/home" },
  { id: "alert_dashboard", label: "Alerts", path: "verdaly://ops/alerts" },
  { id: "email", label: "Email", path: "verdaly://mail/inbox" },
  { id: "ticket_queue", label: "Tickets", path: "verdaly://cases" },
  { id: "knowledge_base", label: "Guides", path: "verdaly://kb" },
  { id: "team_chat", label: "Team", path: "verdaly://chat" },
  { id: "calendar", label: "Meetings", path: "verdaly://calendar" },
];

function LockScreen({
  onLoginSuccess,
  onStand,
}: {
  onLoginSuccess: () => void;
  onStand: () => void;
}) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string>();
  const [signingIn, setSigningIn] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    userRef.current?.focus();
    return () => {
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="desk-os-lock" aria-labelledby="desk-os-login-title">
      <div className="desk-os-lock-card">
        <div className="desk-os-lock-status">
          <span>SOC-07</span>
          <span>Locked</span>
        </div>
        <p className="eyebrow">{COMPANY.name} · workstation</p>
        <h2 id="desk-os-login-title">Sign in</h2>
        <p className="desk-os-hint">
          Credentials are on the yellow note: <code>day1.analyst</code> /{" "}
          <code>FirstDay!</code>
        </p>
        <form
          className="desk-os-login-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              user.trim() === DESK_LOGIN.username &&
              pass === DESK_LOGIN.password
            ) {
              setSigningIn(true);
              setError(undefined);
              timerRef.current = window.setTimeout(() => {
                onLoginSuccess();
              }, 280);
            } else {
              setError("Incorrect username or password.");
            }
          }}
        >
          <label>
            Username
            <input
              ref={userRef}
              autoComplete="username"
              name="username"
              onChange={(e) => setUser(e.target.value)}
              type="text"
              value={user}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              name="password"
              onChange={(e) => setPass(e.target.value)}
              type="password"
              value={pass}
            />
          </label>
          {error ? <p className="desk-os-error">{error}</p> : null}
          <div className="desk-os-lock-actions">
            <button className="desk-os-primary" disabled={signingIn} type="submit">
              {signingIn ? "Signing in…" : "Login"}
            </button>
            <button className="desk-os-ghost" onClick={onStand} type="button">
              Stand up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DashboardHome({
  view,
  guided,
  onOpenTab,
}: {
  view: ClientView;
  guided?: boolean;
  onOpenTab: (tab: DeskOsTab) => void;
}) {
  const guidance = getShiftGuidance(view);
  const visible = view.events.filter(({ status }) => status !== "pending");
  const counts = WORK_SYSTEMS.map((system) => ({
    ...system,
    count: visible.filter(
      (event) =>
        event.systemId === system.id ||
        view.availableActions.some(
          (action) =>
            action.eventId === event.id && action.systemId === system.id,
        ),
    ).length,
  }));

  return (
    <div className="desk-os-home">
      <header className="desk-os-home-hero">
        <div>
          <p className="eyebrow">Shift console</p>
          <h2>Your workstation</h2>
          <p>
            {guidance?.detail ??
              "Open a tab below. Read what is there, then take one action at a time."}
          </p>
        </div>
        <time className="desk-os-clock" aria-label={`${view.simClock} minutes in`}>
          <span>Shift time</span>
          <strong>{formatShiftClock(view.simClock)}</strong>
        </time>
      </header>

      {guidance ? (
        <div className="desk-os-guidance">
          <p className="eyebrow">
            {guided ? "Practice · next step" : "Suggested"}
          </p>
          <h3>{guidance.headline}</h3>
          {guidance.systemId ? (
            <button
              className="desk-os-primary"
              onClick={() => {
                onOpenTab(guidance.systemId!);
              }}
              type="button"
            >
              Open {systemLabel(guidance.systemId)}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="desk-os-tiles">
        {counts.map((system) => (
          <button
            className="desk-os-tile"
            key={system.id}
            onClick={() => {
              onOpenTab(system.id);
            }}
            type="button"
          >
            <strong>{system.label}</strong>
            <span>
              {system.count > 0 ? `${String(system.count)} open` : system.hint}
            </span>
          </button>
        ))}
        <button
          className="desk-os-tile"
          onClick={() => {
            onOpenTab("calendar");
          }}
          type="button"
        >
          <strong>Meetings</strong>
          <span>Standups &amp; links</span>
        </button>
      </div>
    </div>
  );
}

function CalendarPanel({ onOpenEmail }: { onOpenEmail: () => void }) {
  return (
    <div className="desk-os-calendar">
      <p className="eyebrow">Calendar · today</p>
      <h3>Day-one standups</h3>
      <ul>
        <li>
          <strong>09:15</strong>
          <span>New-hire SOC walkthrough — conference (locked)</span>
        </li>
        <li>
          <strong>11:00</strong>
          <span>Alert triage buddy check with Priya</span>
        </li>
        <li>
          <strong>14:30</strong>
          <span>Optional: coffee with Jules in the glass break corner</span>
        </li>
      </ul>
      <p className="desk-os-hint">
        Meeting links land in email when Morgan or Priya send them. No scoring
        from this panel.
      </p>
      <button className="desk-os-primary" onClick={onOpenEmail} type="button">
        Open Email
      </button>
    </div>
  );
}

function SystemApp({
  view,
  systemId,
  onAction,
  guided,
}: {
  view: ClientView;
  systemId: WorkSystemId;
  onAction: (action: AvailableAction, freeText?: string) => void;
  guided?: boolean;
}) {
  const guidance = getShiftGuidance(view);
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const visibleEvents = view.events.filter(({ status }) => status !== "pending");
  const systemEvents = visibleEvents.filter(
    (event) =>
      event.systemId === systemId ||
      view.availableActions.some(
        (action) => action.eventId === event.id && action.systemId === systemId,
      ),
  );
  const selectedEvent =
    systemEvents.find(({ id }) => id === selectedEventId) ?? systemEvents[0];
  const contextualActions = view.availableActions.filter(
    (action) =>
      action.systemId === systemId &&
      (action.eventId === selectedEvent?.id ||
        action.eventId === "shift" ||
        action.id === "update_notebook"),
  );
  const highlightActionId =
    guidance?.action?.systemId === systemId ? guidance.action.id : undefined;

  return (
    <div className="desk-os-system">
      <aside className="desk-os-queue" aria-label={`${systemLabel(systemId)} items`}>
        <p className="eyebrow">{systemLabel(systemId)}</p>
        {systemEvents.length === 0 ? (
          <p className="desk-os-empty">Nothing here right now.</p>
        ) : (
          systemEvents.map((event) => (
            <button
              aria-pressed={selectedEvent?.id === event.id}
              className="desk-os-queue-item"
              data-priority={event.priority}
              key={event.id}
              onClick={() => {
                setSelectedEventId(event.id);
              }}
              type="button"
            >
              <span>{event.title}</span>
              <small>
                {event.priority} · due {event.deadlineAt}m
              </small>
            </button>
          ))
        )}
      </aside>
      <div className="desk-os-detail">
        {selectedEvent ? (
          <>
            <div className="desk-os-meta">
              <span>{selectedEvent.status.replaceAll("_", " ")}</span>
              <span>Due in {selectedEvent.deadlineAt}m</span>
            </div>
            <h3>{selectedEvent.title}</h3>
            <p>{selectedEvent.summary}</p>
            {selectedEvent.resolution ? (
              <p className="desk-os-resolution">{selectedEvent.resolution}</p>
            ) : null}
            <SystemToolPanel
              actions={contextualActions}
              {...(highlightActionId ? { highlightActionId } : {})}
              onAction={onAction}
              selectedEventId={selectedEvent.id}
              systemId={systemId}
              view={view}
            />
          </>
        ) : (
          <>
            <h3>{systemLabel(systemId)}</h3>
            <p>
              {guided
                ? "Follow the suggested step, or pick another tab."
                : "Nothing assigned here yet."}
            </p>
            <SystemToolPanel
              actions={contextualActions}
              {...(highlightActionId ? { highlightActionId } : {})}
              onAction={onAction}
              systemId={systemId}
              view={view}
            />
          </>
        )}
      </div>
    </div>
  );
}

function OsCursor({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const root = ref.current?.closest(".desk-os") as HTMLElement | null;
    if (!root) return;
    const onMove = (event: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = root.getBoundingClientRect();
      el.style.transform = `translate(${event.clientX - rect.left}px, ${event.clientY - rect.top}px)`;
      el.style.opacity = "1";
    };
    const onLeave = () => {
      if (ref.current) ref.current.style.opacity = "0";
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [active]);

  if (!active) return null;
  return <div aria-hidden="true" className="desk-os-cursor" ref={ref} />;
}

export function DeskOs({
  phase,
  view,
  onAction,
  guided = false,
  maximized = false,
  onLoginSuccess,
  onStand,
  onMaximize,
  onMinimize,
}: {
  phase: "desk_login" | "seated_monitor" | "focus_desk";
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  guided?: boolean;
  maximized?: boolean;
  onLoginSuccess: () => void;
  onStand: () => void;
  onMaximize: () => void;
  onMinimize: () => void;
}) {
  const guidance = getShiftGuidance(view);
  const initialTab: DeskOsTab =
    guidance?.systemId ??
    (view.events.some(({ systemId }) => systemId === "email")
      ? "email"
      : "home");
  const [tab, setTab] = useState<DeskOsTab>(
    phase === "desk_login" ? "home" : initialTab,
  );

  useEffect(() => {
    if (phase !== "desk_login" && guidance?.systemId && guided) {
      setTab(guidance.systemId);
    }
  }, [guided, guidance?.systemId, phase]);

  const locked = phase === "desk_login";
  const activeTab = APP_TABS.find((item) => item.id === tab) ?? APP_TABS[0]!;

  return (
    <div
      className={`desk-os${maximized ? " desk-os-max" : ""}${locked ? " desk-os-locked" : ""}`}
      data-desk-os="true"
    >
      <OsCursor active={!locked} />
      <div className="desk-os-chrome">
        <div className="desk-os-traffic" aria-hidden="true">
          <button
            className="desk-os-dot desk-os-dot-close"
            onClick={onStand}
            title="Stand up"
            type="button"
          />
          <button
            className="desk-os-dot desk-os-dot-min"
            onClick={maximized ? onMinimize : onMaximize}
            title={maximized ? "Restore" : "Maximize"}
            type="button"
          />
          <span className="desk-os-dot desk-os-dot-max" />
        </div>
        <div className="desk-os-tabs" role="tablist" aria-label="Workstation apps">
          {APP_TABS.map((item) => (
            <button
              aria-selected={!locked && tab === item.id}
              className={
                !locked && tab === item.id
                  ? "desk-os-tab desk-os-tab-active"
                  : "desk-os-tab"
              }
              disabled={locked}
              key={item.id}
              onClick={() => {
                setTab(item.id);
              }}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="desk-os-window-actions">
          {!locked ? (
            <button
              className="desk-os-ghost"
              onClick={maximized ? onMinimize : onMaximize}
              type="button"
            >
              {maximized ? "Restore" : "Maximize"}
            </button>
          ) : null}
          <button className="desk-os-ghost" onClick={onStand} type="button">
            Leave desk
          </button>
        </div>
      </div>

      <div className="desk-os-address" aria-hidden={locked}>
        <span className="desk-os-secure">Secure</span>
        <span className="desk-os-url">
          {locked ? "verdaly://lock" : activeTab.path}
        </span>
      </div>

      <div className="desk-os-body">
        {locked ? (
          <LockScreen onLoginSuccess={onLoginSuccess} onStand={onStand} />
        ) : tab === "home" ? (
          <DashboardHome
            guided={guided}
            onOpenTab={setTab}
            view={view}
          />
        ) : tab === "calendar" ? (
          <CalendarPanel
            onOpenEmail={() => {
              setTab("email");
            }}
          />
        ) : (
          <SystemApp
            guided={guided}
            onAction={onAction}
            systemId={tab}
            view={view}
          />
        )}
      </div>
    </div>
  );
}
