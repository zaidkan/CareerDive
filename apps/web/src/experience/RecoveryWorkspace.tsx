import type { WorkstationProps } from "../components/shared.js";
import { OpsConsole } from "../world/deskOs/OpsConsole.js";
import { OsSessionProvider } from "../world/deskOs/osSession.js";
import { ShiftHints } from "../world/dialogue/ShiftHints.js";
import "../world/deskOs/workspace.css";

/** Same session, tools, drafts, and objectives; only the 3D host is absent. */
export function RecoveryWorkspace(props: WorkstationProps) {
  return (
    <OsSessionProvider
      key={props.view.sessionId}
      sessionId={props.view.sessionId}
    >
      <h3>Your workstation</h3>
      <div className="desk-os desk-workspace recovery-workspace">
        <ShiftHints view={props.view} phase="seated_monitor" />
        <OpsConsole {...props} />
      </div>
    </OsSessionProvider>
  );
}
