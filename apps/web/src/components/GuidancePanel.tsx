import type { ShiftGuidance } from "../guidance.js";
import { systemLabel } from "../systems.js";

export function GuidancePanel({
  title,
  body,
  guidance,
  onGoToSystem,
  currentSystemId,
}: {
  title: string;
  body: string;
  guidance: ShiftGuidance | null;
  onGoToSystem?: (systemId: ShiftGuidance["systemId"]) => void;
  currentSystemId?: ShiftGuidance["systemId"];
}) {
  return (
    <aside className="guidance-panel" aria-labelledby="guidance-title">
      <p className="eyebrow">{title}</p>
      <h2 id="guidance-title">{guidance?.headline ?? "Explore the desk"}</h2>
      <p>{guidance?.detail ?? body}</p>
      {guidance && onGoToSystem && currentSystemId !== guidance.systemId ? (
        <div className="guidance-actions">
          <button
            className="start-shift guidance-primary"
            onClick={() => {
              onGoToSystem(guidance.systemId);
            }}
            type="button"
          >
            Open {systemLabel(guidance.systemId)}
          </button>
        </div>
      ) : null}
    </aside>
  );
}
