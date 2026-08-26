import type { AvailableAction, ClientView } from "@sim/schemas";
import { useEffect, useState } from "react";
import { getShiftGuidance } from "../../guidance.js";
import { CalendarPanel, DashboardHome } from "./DashboardHome.js";
import { LockScreen } from "./LockScreen.js";
import { SystemApp } from "./SystemApp.js";
import { APP_TABS, type DeskOsTab } from "./tabs.js";

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
  const activeTab = APP_TABS.find((item) => item.id === tab) ?? APP_TABS[0];

  return (
    <div
      className={`desk-os${maximized ? " desk-os-max" : ""}${locked ? " desk-os-locked" : ""}`}
      data-desk-os="true"
    >
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
          {APP_TABS.map((item) => {
            const suggested =
              !locked && guidance?.systemId === item.id && tab !== item.id;
            return (
              <button
                aria-selected={!locked && tab === item.id}
                className={`desk-os-tab${!locked && tab === item.id ? " desk-os-tab-active" : ""}${suggested ? " desk-os-tab-target" : ""}`}
                disabled={locked}
                key={item.id}
                onClick={() => {
                  setTab(item.id);
                }}
                role="tab"
                type="button"
              >
                {item.label}
                {suggested ? (
                  <span className="desk-os-tab-dot">
                    <span className="visually-hidden">suggested next</span>
                  </span>
                ) : null}
              </button>
            );
          })}
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
            guidance={guidance}
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
            guidance={guidance}
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
