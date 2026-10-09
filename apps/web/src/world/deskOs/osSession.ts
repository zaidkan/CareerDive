import {
  createContext,
  createElement,
  useContext,
  useReducer,
  useEffect,
  type Dispatch,
  type ReactNode,
} from "react";
import type { WorkSystemId } from "@sim/schemas";

type WorkspaceTarget = {
  systemId: WorkSystemId;
  eventId?: string;
  requestId: number;
};
/** Session-owned presentation only; never assessment, evidence, or sim time. */
export interface OsSessionState {
  workspace?: WorkspaceTarget;
  workspaceNotification?:
    | (WorkspaceTarget & { notificationId: string; eventId: string })
    | null;
  nextNotificationRequestId: number;
  notesText: string;
  morganIntroSeen: boolean;
}
export type OsSessionAction =
  | {
      type: "open_tool";
      systemId: WorkSystemId;
      eventId?: string;
      focus?: boolean;
    }
  | {
      type: "queue_workspace_notification";
      notificationId: string;
      eventId: string;
      systemId: WorkSystemId;
    }
  | { type: "apply_workspace_notification"; requestId: number }
  | { type: "clear_workspace_notification" }
  | { type: "set_notes_text"; text: string }
  | { type: "mark_morgan_intro_seen" };

export function createInitialOsSession(): OsSessionState {
  return {
    notesText: "",
    morganIntroSeen: false,
    nextNotificationRequestId: 1,
  };
}
export function osSessionReducer(
  state: OsSessionState,
  action: OsSessionAction,
): OsSessionState {
  switch (action.type) {
    case "open_tool":
      return {
        ...state,
        workspace: {
          systemId: action.systemId,
          ...(action.eventId ? { eventId: action.eventId } : {}),
          requestId:
            (state.workspace?.requestId ?? 0) +
            (action.focus === false ? 0 : 1),
        },
      };
    case "queue_workspace_notification":
      return {
        ...state,
        workspaceNotification: {
          notificationId: action.notificationId,
          eventId: action.eventId,
          systemId: action.systemId,
          requestId: state.nextNotificationRequestId,
        },
        nextNotificationRequestId: state.nextNotificationRequestId + 1,
      };
    case "apply_workspace_notification": {
      const target = state.workspaceNotification;
      if (!target || target.requestId !== action.requestId) return state;
      return {
        ...state,
        workspaceNotification: null,
        workspace: {
          systemId: target.systemId,
          eventId: target.eventId,
          requestId: (state.workspace?.requestId ?? 0) + 1,
        },
      };
    }
    case "clear_workspace_notification":
      return { ...state, workspaceNotification: null };
    case "set_notes_text":
      return state.notesText === action.text
        ? state
        : { ...state, notesText: action.text };
    case "mark_morgan_intro_seen":
      return state.morganIntroSeen
        ? state
        : { ...state, morganIntroSeen: true };
  }
}

interface OsSessionContextValue {
  state: OsSessionState;
  dispatch: Dispatch<OsSessionAction>;
}

const OsSessionContext = createContext<OsSessionContextValue | null>(null);

import { readTabValue, writeTabValue } from "../../useTabDraft.js";

/** One provider per CareerDive session — no global singleton. */
export function OsSessionProvider({
  children,
  sessionId,
}: {
  children: ReactNode;
  sessionId?: string;
}) {
  const [state, dispatch] = useReducer(osSessionReducer, undefined, () =>
    sessionId
      ? {
          ...createInitialOsSession(),
          ...readTabValue<Partial<OsSessionState>>(`desk-os:${sessionId}`, {}),
        }
      : createInitialOsSession(),
  );
  useEffect(() => {
    if (sessionId) writeTabValue(`desk-os:${sessionId}`, state);
  }, [sessionId, state]);
  return createElement(
    OsSessionContext.Provider,
    { value: { state, dispatch } },
    children,
  );
}

export function useOsSession(): OsSessionContextValue {
  const value = useContext(OsSessionContext);
  if (!value) {
    throw new Error("useOsSession requires an OsSessionProvider ancestor");
  }
  return value;
}

/** For tools also rendered outside Desk OS (tests, accessibility recovery). */
export function useOptionalOsSession(): OsSessionContextValue | null {
  return useContext(OsSessionContext);
}
