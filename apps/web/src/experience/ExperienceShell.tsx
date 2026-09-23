import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import type {
  AvailableAction,
  ClientView,
  JulesTopic,
  WorkplaceInteraction,
} from "@sim/schemas";
import { julesDialogueFromClientView, type JulesDialogueReply } from "@sim/core";
import type {
  NotificationHandler,
  TaskAttemptHandler,
  WorkplaceInteractionHandler,
} from "../components/shared.js";
import type { MutationState } from "../useMutationCoordinator.js";
import {
  BreakRoomPanel,
  CarriedSnackControl,
  EmergencyRecoveryControl,
  EnergyMeter,
} from "../world/BreakRoomPanel.js";
import { JulesDialogue } from "../world/JulesDialogue.js";
import { useMovementExertion } from "../world/useMovementExertion.js";
import "./experience.css";

/** Spatial workplace is code-split; compatibility peers load only when needed. */
const SpatialShell = lazy(async () => {
  const mod = await import("../world/SpatialShell.js");
  return { default: mod.SpatialShell };
});
const WorkSurface = lazy(async () => {
  const mod = await import("../components/WorkSurface.js");
  return { default: mod.WorkSurface };
});
const AccessibleMode = lazy(async () => {
  const mod = await import("../components/AccessibleMode.js");
  return { default: mod.AccessibleMode };
});

/**
 * Internal presentation only. Product entry is always spatial ("walk").
 * "desk" / "list" remain temporary compatibility fallbacks until A3/R1 —
 * never user-facing peer product modes.
 */
export type ExperienceMode = "walk" | "desk" | "list";

type ExperienceShellProps = {
  /**
   * Optional forced presentation for tests / temporary compatibility.
   * Omit in the product path so the shell always starts spatial.
   */
  mode?: ExperienceMode;
  onModeChange?: (mode: ExperienceMode) => void;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onNotification?: NotificationHandler;
  onRetryMutation?: () => void;
  onTaskAttempt?: TaskAttemptHandler;
  onWorkplaceInteraction?: WorkplaceInteractionHandler;
  mutationState?: MutationState;
  guided?: boolean;
  view: ClientView;
};

/**
 * Single product entry: always the 3D workplace → Desk OS path.
 * On WebGL/spatial failure (or explicit compatibility escape), renders a
 * bounded compatibility presentation — not another equal Career Expo mode.
 */
export function ExperienceShell({
  mode,
  onModeChange,
  onAction,
  onNotification,
  onRetryMutation,
  onTaskAttempt,
  onWorkplaceInteraction,
  mutationState,
  guided = false,
  view,
}: ExperienceShellProps) {
  const [spatialFailed, setSpatialFailed] = useState(false);
  const movement = useMovementExertion(
    view,
    onWorkplaceInteraction,
    mutationState ?? {},
  );
  const sharedProps = {
    view,
    onAction,
    ...(onTaskAttempt ? { onTaskAttempt } : {}),
    ...(onNotification ? { onNotification } : {}),
    ...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {}),
    ...(mutationState ? { mutationState } : {}),
    ...(onRetryMutation ? { onRetryMutation } : {}),
  };

  const presentation: ExperienceMode =
    mode === "desk" || mode === "list"
      ? mode
      : spatialFailed
        ? "desk"
        : "walk";

  const enterCompatibility = () => {
    setSpatialFailed(true);
    onModeChange?.("desk");
  };

  return (
    <section aria-label="Career Expo experience">
      <p className="mode-note" role="note">
        One shift: walk the office, sit at your workstation, and work through
        Desk OS. Navigation speed never creates career evidence.
      </p>

      {presentation === "walk" ? (
        <>
          <details className="experience-fallback-help">
            <summary>Having trouble with the 3D view?</summary>
            <p>
              If the office will not load on this device, open the compatibility
              view. Same shift and the same actions — not a separate Career Expo
              mode.
            </p>
            <button onClick={enterCompatibility} type="button">
              Open compatibility view
            </button>
          </details>
          <Suspense fallback={<p className="mode-note">Loading workplace…</p>}>
            <SpatialBoundary
              key={presentation}
              onFallback={() => {
                setSpatialFailed(true);
              }}
            >
              <SpatialShell
                onAcceptedDistance={movement.addDistance}
                onRoomExit={movement.resetDistance}
                guided={guided}
                onAction={onAction}
                {...(onTaskAttempt ? { onTaskAttempt } : {})}
                {...(onNotification ? { onNotification } : {})}
                {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
                {...(mutationState ? { mutationState } : {})}
                {...(onRetryMutation ? { onRetryMutation } : {})}
                view={view}
              />
            </SpatialBoundary>
          </Suspense>
        </>
      ) : (
        <Suspense fallback={<p className="mode-note">Loading compatibility view…</p>}>
          <div className="experience-compatibility" data-presentation="compatibility">
            <p role="alert" className="compatibility-notice">
              {spatialFailed
                ? "The 3D office view is unavailable. Opening the compatibility view so you can continue the same shift."
                : "Compatibility view: same Career Expo shift without the 3D office. Use this if the office will not run on your device."}
            </p>
            <NonspatialResources
              onWalk={() => {
                movement.addDistance(5);
              }}
              movementQueued={movement.queued}
              {...(mutationState ? { mutationState } : {})}
              {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
              view={view}
            />
            {presentation === "list" ? (
              <AccessibleMode {...sharedProps} />
            ) : (
              <WorkSurface guided={guided} {...sharedProps} />
            )}
          </div>
        </Suspense>
      )}
    </section>
  );
}

function NonspatialResources({
  view,
  onWorkplaceInteraction,
  mutationState,
  onWalk,
  movementQueued,
}: Pick<
  ExperienceShellProps,
  "view" | "onWorkplaceInteraction" | "mutationState"
> & { onWalk: () => void; movementQueued: boolean }) {
  const [julesOpen, setJulesOpen] = useState(false);
  const [julesReply, setJulesReply] = useState<JulesDialogueReply>();
  const pending = Boolean(mutationState?.pendingKey) || !onWorkplaceInteraction;

  const submit = useCallback(
    (interaction: WorkplaceInteraction) => {
      if (!onWorkplaceInteraction) return;
      void onWorkplaceInteraction(interaction).catch(() => {
        // The app-level mutation coordinator supplies the single retry message.
      });
    },
    [onWorkplaceInteraction],
  );

  const askJules = useCallback(
    (topic: JulesTopic) => {
      if (!onWorkplaceInteraction) return;
      const reply = julesDialogueFromClientView(view, topic);
      void onWorkplaceInteraction({ type: "talk_to_jules", topic })
        .then(() => {
          setJulesReply(reply);
        })
        .catch(() => {
          // The app-level mutation coordinator supplies the single retry message.
        });
    },
    [onWorkplaceInteraction, view],
  );

  return (
    <aside aria-label="Break room and coworker">
      <EnergyMeter workplace={view.workplace} />
      <button
        type="button"
        data-interaction-id="movement_exertion"
        disabled={
          pending ||
          movementQueued ||
          Boolean(mutationState?.error) ||
          view.workplace.energy.current === 0
        }
        onClick={onWalk}
      >
        Walk 5 meters
      </button>
      <p>Optional office movement uses energy, not career evidence.</p>
      <CarriedSnackControl
        onSubmit={submit}
        pending={pending}
        workplace={view.workplace}
      />
      <BreakRoomPanel
        onSubmit={submit}
        pending={pending}
        station="fridge"
        workplace={view.workplace}
      />
      <BreakRoomPanel
        onSubmit={submit}
        pending={pending}
        station="coffee"
        workplace={view.workplace}
      />
      <EmergencyRecoveryControl
        workplace={view.workplace}
        onSubmit={submit}
        pending={pending}
      />
      <button
        disabled={pending}
        onClick={() => {
          setJulesOpen(true);
        }}
        type="button"
      >
        Talk to Jules
      </button>
      {julesOpen ? (
        <JulesDialogue
          onClose={() => {
            setJulesOpen(false);
          }}
          onTopic={askJules}
          pending={pending}
          {...(julesReply ? { reply: julesReply } : {})}
          seenTopics={view.workplace.julesTopicsSeen}
        />
      ) : null}
    </aside>
  );
}

class SpatialBoundary extends Component<
  { children: ReactNode; onFallback: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFallback();
  }

  render() {
    return this.state.failed ? (
      <p role="alert">
        The 3D office view is unavailable. Opening the compatibility view…
      </p>
    ) : (
      this.props.children
    );
  }
}
