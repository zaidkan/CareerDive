import { Component, useCallback, useState, type ReactNode } from "react";
import type {
  AvailableAction,
  ClientView,
  JulesTopic,
  WorkplaceInteraction,
} from "@sim/schemas";
import {
  julesDialogueFromClientView,
  type JulesDialogueReply,
} from "@sim/core";
import { AccessibleMode } from "../components/AccessibleMode.js";
import { MutationStatus } from "../components/MutationStatus.js";
import type {
  NotificationHandler,
  TaskAttemptHandler,
  WorkplaceInteractionHandler,
} from "../components/shared.js";
import { WorkSurface } from "../components/WorkSurface.js";
import type { MutationState } from "../useMutationCoordinator.js";
import {
  BreakRoomPanel,
  CarriedSnackControl,
  EnergyMeter,
} from "../world/BreakRoomPanel.js";
import { JulesDialogue } from "../world/JulesDialogue.js";
import { SpatialShell } from "../world/SpatialShell.js";

export type ExperienceMode = "walk" | "desk" | "list";

type ExperienceShellProps = {
  mode: ExperienceMode;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onModeChange: (mode: ExperienceMode) => void;
  onNotification?: NotificationHandler;
  onRetryMutation?: () => void;
  onTaskAttempt?: TaskAttemptHandler;
  onWorkplaceInteraction?: WorkplaceInteractionHandler;
  mutationState?: MutationState;
  guided?: boolean;
  view: ClientView;
};

const MODES: ReadonlyArray<{ id: ExperienceMode; label: string }> = [
  { id: "walk", label: "Walk the office" },
  { id: "desk", label: "Desk only" },
  { id: "list", label: "Simple list" },
];

/** Chooses a peer renderer without owning simulation state or mutations. */
export function ExperienceShell({
  mode,
  onAction,
  onModeChange,
  onNotification,
  onRetryMutation,
  onTaskAttempt,
  onWorkplaceInteraction,
  mutationState,
  guided = false,
  view,
}: ExperienceShellProps) {
  const sharedProps = {
    view,
    onAction,
    ...(onTaskAttempt ? { onTaskAttempt } : {}),
    ...(onNotification ? { onNotification } : {}),
    ...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {}),
    ...(mutationState ? { mutationState } : {}),
  };

  return (
    <section aria-label="Experience mode">
      <nav aria-label="Choose how to experience the shift">
        {MODES.map(({ id, label }) => (
          <button
            aria-pressed={mode === id}
            key={id}
            onClick={() => {
              onModeChange(id);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {mode === "walk" ? (
        <SpatialModeBoundary
          key={mode}
          onFallback={() => {
            onModeChange("desk");
          }}
        >
          <SpatialShell
            guided={guided}
            onAction={onAction}
            {...(onTaskAttempt ? { onTaskAttempt } : {})}
            {...(onNotification ? { onNotification } : {})}
            {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
            {...(mutationState ? { mutationState } : {})}
            {...(onRetryMutation ? { onRetryMutation } : {})}
            view={view}
          />
        </SpatialModeBoundary>
      ) : (
        <>
          <MutationStatus
            state={mutationState ?? {}}
            {...(onRetryMutation ? { onRetry: onRetryMutation } : {})}
          />
          <NonspatialResources
            {...(mutationState ? { mutationState } : {})}
            {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
            view={view}
          />
          {mode === "desk" ? (
            <WorkSurface guided={guided} {...sharedProps} />
          ) : (
            <AccessibleMode {...sharedProps} />
          )}
        </>
      )}
    </section>
  );
}

function NonspatialResources({
  view,
  onWorkplaceInteraction,
  mutationState,
}: Pick<
  ExperienceShellProps,
  "view" | "onWorkplaceInteraction" | "mutationState"
>) {
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
      {canUseEmergencyRecovery(view) ? (
        <button
          disabled={pending}
          onClick={() => {
            submit({ type: "emergency_recovery" });
          }}
          type="button"
        >
          Use emergency recovery
        </button>
      ) : null}
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

function canUseEmergencyRecovery(view: ClientView) {
  const workplace = view.workplace;
  return (
    workplace.energy.current === 0 &&
    !workplace.emergencyRecoveryUsed &&
    workplace.carriedSnackBites === 0 &&
    workplace.fridgeSnackBars === 0 &&
    workplace.coffeeServings === 0 &&
    workplace.coffeeStage === "idle"
  );
}

class SpatialModeBoundary extends Component<
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
        The office view is unavailable. Opening desk-only mode.
      </p>
    ) : (
      this.props.children
    );
  }
}
