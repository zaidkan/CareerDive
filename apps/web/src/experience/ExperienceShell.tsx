import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { WorkstationProps } from "../components/shared.js";
import { useMovementExertion } from "../world/useMovementExertion.js";
import { compatibilityDetails } from "./diagnostics.js";
import { readTabValue } from "../useTabDraft.js";
import { INITIAL_SPATIAL } from "../world/presentation.js";
import { ProblemReport } from "./ProblemReport.js";

function workplaceLoader() {
  return lazy(async () => {
    const mod = await import("../world/SpatialShell.js");
    return { default: mod.SpatialShell };
  });
}
// Stable across suspended first renders; retry uses a fresh chunk-import promise.
const InitialWorkplace = workplaceLoader();
const RetriedWorkplace = workplaceLoader();

const WorkSurface = lazy(async () => {
  const mod = await import("../components/WorkSurface.js");
  return { default: mod.WorkSurface };
});

/** Recovery changes presentation only; the caller retains session and mutations. */
export function ExperienceShell(props: WorkstationProps) {
  const [phase, setPhase] = useState<
    "workplace" | "retry" | "compatibility" | "workstation"
  >("workplace");
  const [attempt, setAttempt] = useState(0);
  const recoveryPresentation = useRef(
    readTabValue(`spatial:${props.view.sessionId}`, INITIAL_SPATIAL),
  );
  const [failure, setFailure] = useState("none");
  const [compatibility, setCompatibility] =
    useState<ReturnType<typeof compatibilityDetails>>();
  const focus = useCallback((node: HTMLHeadingElement | null) => {
    node?.focus();
  }, []);
  const SpatialShell = attempt === 0 ? InitialWorkplace : RetriedWorkplace;
  const movement = useMovementExertion(
    props.view,
    props.onWorkplaceInteraction,
    props.mutationState ?? {},
  );
  useEffect(() => {
    if (phase !== "retry") return;
    const timer = setTimeout(() => {
      setAttempt(1);
      setPhase("workplace");
    }, 400);
    return () => {
      clearTimeout(timer);
    };
  }, [phase]);
  function failed(error: Error) {
    const assetFailure = /import|fetch|load|chunk/i.test(error.message)
      ? "asset-unavailable"
      : "workplace-initialization";
    setFailure(assetFailure);
    if (attempt === 0) setPhase("retry");
    else {
      setCompatibility(
        compatibilityDetails({ phase: "compatibility", assetFailure }),
      );
      setPhase("compatibility");
    }
  }
  return (
    <>
      {phase === "retry" && (
        <section aria-label="Workplace retry">
          <h2 ref={focus} tabIndex={-1}>
            Trying your workplace once more
          </h2>
          <p role="status">
            The office couldn't open. Your shift and work are kept.
          </p>
        </section>
      )}
      {phase === "compatibility" && (
        <section className="app-alert" aria-label="Workplace compatibility">
          <h2 ref={focus} tabIndex={-1}>
            Continue in the recovery workstation
          </h2>
          <p role="status">
            {compatibility?.webgl2
              ? "Graphics are available, but the office still couldn't open."
              : "This browser couldn't provide the graphics needed for the office."}{" "}
            Your current shift and work are kept.
          </p>
          <button
            type="button"
            onClick={() => {
              setPhase("workstation");
            }}
          >
            Open recovery workstation
          </button>
        </section>
      )}
      <Suspense
        fallback={
          <p className="app-loading" role="status">
            Opening your workplace…
          </p>
        }
      >
        {phase === "workstation" && (
          <section aria-label="Workplace recovery">
            <h2 ref={focus} tabIndex={-1}>
              Recovery workstation
            </h2>
            <p role="status">
              Continue your current shift here. Your work is preserved.
            </p>
            <WorkSurface {...props} />
          </section>
        )}
        {phase === "workplace" && (
          <SpatialBoundary key={attempt} onFailure={failed}>
            <SpatialShell
              recoveryPresentation={recoveryPresentation}
              {...props}
              onAcceptedDistance={movement.addDistance}
              onRoomExit={movement.resetDistance}
            />
            <div className="spatial-utility">
              <p className="spatial-utility-label">
                Trouble navigating the office?
              </p>
              <details className="spatial-utility-details">
                <summary>Accessibility recovery</summary>
                <div className="spatial-utility-body">
                  <p>
                    Continue at your workstation instead. Your current work is
                    preserved.
                  </p>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                      setPhase("workstation");
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
      <ProblemReport context={{ phase, assetFailure: failure }} />
    </>
  );
}

class SpatialBoundary extends Component<
  { children: ReactNode; onFailure: (error: Error) => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onFailure(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
