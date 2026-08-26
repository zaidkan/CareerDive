import type { WorkSystemId } from "@sim/schemas";

export type DeskOsTab = "home" | "calendar" | WorkSystemId;

type AppTab = { id: DeskOsTab; label: string; path: string };

/** Typed non-empty so the address bar always has a fallback tab. */
export const APP_TABS: [AppTab, ...AppTab[]] = [
  { id: "home", label: "Dashboard", path: "verdaly://ops/home" },
  { id: "alert_dashboard", label: "Alerts", path: "verdaly://ops/alerts" },
  { id: "email", label: "Email", path: "verdaly://mail/inbox" },
  { id: "ticket_queue", label: "Tickets", path: "verdaly://cases" },
  { id: "knowledge_base", label: "Guides", path: "verdaly://kb" },
  { id: "team_chat", label: "Team", path: "verdaly://chat" },
  { id: "calendar", label: "Meetings", path: "verdaly://calendar" },
];
