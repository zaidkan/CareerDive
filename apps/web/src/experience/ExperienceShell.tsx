import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import type { WorkstationProps } from "../components/shared.js";
import { useMovementExertion } from "../world/useMovementExertion.js";

const SpatialShell = lazy(async () => {
  const mod = await import("../world/SpatialShell.js");
  return { default: mod.SpatialShell };
});
const WorkSurface = lazy(async () => {
  const mod = await import("../components/WorkSurface.js");
  return { default: mod.WorkSurface };
});

/** One spatial workplace. Recovery preserves the same session and mutations. */
export function ExperienceShell(props: WorkstationProps) {
  const [recover, setRecover] = useState(false);
  const movement = useMovementExertion(
    props.view,
    props.onWorkplaceInteraction,
    props.mutationState ?? {},
  );
  const fallback = (
    <section aria-label="Workplace recovery">
      <p role="status">Continue your current shift here. Your work is preserved.</p>
      <WorkSurface {...props} />
    </section>
  );
  return (
    <Suspense fallback={<p className="app-loading" role="status">Opening your workplace…</p>}>
      {recover ? fallback : (
        <SpatialBoundary fallback={fallback}>
          <SpatialShell
            {...props}
            onAcceptedDistance={movement.addDistance}
            onRoomExit={movement.resetDistance}
          />
          <div className="spatial-utility">
            <p className="spatial-utility-label">Trouble navigating the office?</p>
            <details className="spatial-utility-details">
              <summary>Accessibility recovery</summary>
              <div className="spatial-utility-body">
                <p>
                  Continue at your workstation instead. Your current work is
                  preserved and the shift continues exactly where it is.
                </p>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    setRecover(true);
                  }}
                >
                  Recover workstation access
                </button>
              </div>
            </details>
          </div>
        </SpatialBoundary>
      )}
    </Suspense>
  );
}

class SpatialBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
