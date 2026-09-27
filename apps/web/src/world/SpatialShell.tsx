import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
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
import { MutationStatus } from "../components/MutationStatus.js";
import {
  BreakRoomPanel,
  CarriedSnackControl,
  EmergencyRecoveryControl,
  EnergyMeter,
} from "./BreakRoomPanel.js";
import { coffeeControl, fridgeControl } from "./breakRoom.js";
import { ControlsHelp } from "./ControlsHelp.js";
import { LaptopOverlay } from "./deskOs/LaptopOverlay.js";
import { OsSessionProvider, useOsSession } from "./deskOs/osSession.js";
import { FloorMap } from "./FloorMap.js";
import { JulesDialogue } from "./JulesDialogue.js";
import { getJourneyStep } from "../journey.js";
import { INITIAL_SPATIAL, reduceSpatialEvent } from "./presentation.js";
import { isTypingTarget, useFullscreen } from "./useFullscreen.js";
import type { HotspotId } from "./worldTypes.js";
import type {
  NotificationHandler,
  TaskAttemptHandler,
  WorkplaceInteractionHandler,
} from "../components/shared.js";
import {
  EMPTY_MUTATION_STATE,
  workplaceMutationKey,
  type MutationState,
} from "../useMutationCoordinator.js";
import {
  loadMouseSensitivity,
  MAX_MOUSE_SENSITIVITY,
  MIN_MOUSE_SENSITIVITY,
  MOUSE_SENSITIVITY_STEP,
  saveMouseSensitivity,
} from "./mouseSensitivity.js";

const RoomCanvas = lazy(async () => {
  const mod = await import("./RoomCanvas.js");
  return { default: mod.RoomCanvas };
});

const FLAVOR: Partial<Record<HotspotId, string>> = {
  break_door:
    "Glass break corner in the far wall — coffee with Jules if you want a breather.",
  alert_wall:
    "Shared alert boards. Sit at your desk when you are ready to work them.",
  morgan_station:
    "Morgan can help — ask from Team chat once you are at your desk.",
  door_exit: "Back to the floor map.",
};

const INTERACT_LABEL: Partial<Record<HotspotId, string>> = {
  desk_player: "Sit at computer",
  break_door: "Use door",
  door_exit: "Exit to map",
  jules: "Talk to Jules",
  storage: "Open cabinets",
};

function SpatialShellStage({
  view,
  onAction,
  onTaskAttempt,
  onNotification,
  onWorkplaceInteraction,
  mutationState = EMPTY_MUTATION_STATE,
  onRetryMutation,
  onAcceptedDistance,
  onRoomExit,
}: {
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onTaskAttempt?: TaskAttemptHandler;
  onNotification?: NotificationHandler;
  onWorkplaceInteraction?: WorkplaceInteractionHandler;
  mutationState?: MutationState;
  onRetryMutation?: () => void;
  onAcceptedDistance?: (meters: number) => void;
  onRoomExit?: () => void;
}) {
  const [spatial, dispatch] = useReducer(reduceSpatialEvent, INITIAL_SPATIAL);
  const { dispatch: osDispatch } = useOsSession();
  const [nearbyLabel, setNearbyLabel] = useState<string>();
  const [pointerLocked, setPointerLocked] = useState(false);
  const [mouseSensitivity, setMouseSensitivity] = useState(
    loadMouseSensitivity,
  );
  const [workplacePending, setWorkplacePending] = useState(false);
  const [julesOpen, setJulesOpen] = useState(false);
  const [julesReply, setJulesReply] = useState<JulesDialogueReply>();
  const [walkBlocked, setWalkBlocked] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const workplacePendingRef = useRef(false);
  const closeFridgeIntentRef = useRef(false);
  const { active: fullscreen, toggle: toggleFullscreen } =
    useFullscreen(stageRef);

  useEffect(() => {
    if (spatial.phase === "floor_map") onRoomExit?.();
    return () => {
      onRoomExit?.();
    };
  }, [spatial.phase === "floor_map", onRoomExit]);

  useEffect(() => {
    const syncLock = () => {
      setPointerLocked(document.pointerLockElement != null);
    };
    document.addEventListener("pointerlockchange", syncLock);
    document.addEventListener("pointerlockerror", syncLock);
    return () => {
      document.removeEventListener("pointerlockchange", syncLock);
      document.removeEventListener("pointerlockerror", syncLock);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (spatial.phase !== "room_walk") return;
      if (event.code !== "KeyF" || event.repeat) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      void toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [spatial.phase, toggleFullscreen]);

  const onNearbyChange = useCallback((id?: HotspotId, label?: string) => {
    if (id === undefined) {
      dispatch({ type: "set_nearby" });
    } else {
      dispatch({ type: "set_nearby", hotspotId: id });
    }
    setNearbyLabel(label);
  }, []);

  const submitWorkplaceInteraction = useCallback(
    async (interaction: WorkplaceInteraction) => {
      if (!onWorkplaceInteraction || workplacePendingRef.current) return;
      const isMovementExertion = interaction.type === "movement_exertion";
      workplacePendingRef.current = true;
      if (!isMovementExertion) setWorkplacePending(true);

      const attemptQueuedClose = async (shouldAttempt: boolean) => {
        if (!closeFridgeIntentRef.current) return;
        closeFridgeIntentRef.current = false;
        if (!shouldAttempt) return;

        try {
          await onWorkplaceInteraction({ type: "close_fridge" });
        } catch {
          dispatch({
            type: "set_flavor",
            message:
              "The fridge did not close. Return to the break room and try again.",
          });
        }
      };

      try {
        const result = await onWorkplaceInteraction(interaction);
        await attemptQueuedClose(result.view.workplace.fridgeOpen);
        return result;
      } catch {
        dispatch({
          type: "set_flavor",
          message:
            interaction.type === "close_fridge"
              ? "The fridge did not close. Try again."
              : "That break-room action did not go through. Try again.",
        });
        await attemptQueuedClose(interaction.type !== "close_fridge");
        return undefined;
      } finally {
        closeFridgeIntentRef.current = false;
        workplacePendingRef.current = false;
        if (!isMovementExertion) setWorkplacePending(false);
      }
    },
    [onWorkplaceInteraction],
  );

  const handleJulesTopic = useCallback(
    (topic: JulesTopic) => {
      const reply = julesDialogueFromClientView(view, topic);
      void (async () => {
        const result = await submitWorkplaceInteraction({
          type: "talk_to_jules",
          topic,
        });
        if (result) setJulesReply(reply);
      })();
    },
    [submitWorkplaceInteraction, view],
  );

  const requestWorkplaceInteraction = useCallback(
    (interaction: WorkplaceInteraction) => {
      void submitWorkplaceInteraction(interaction);
    },
    [submitWorkplaceInteraction],
  );

  const requestFridgeCloseOnExit = useCallback(() => {
    if (!onWorkplaceInteraction) return;
    if (workplacePendingRef.current) {
      closeFridgeIntentRef.current = true;
      return;
    }
    if (view.workplace.fridgeOpen) {
      requestWorkplaceInteraction({ type: "close_fridge" });
    }
  }, [
    onWorkplaceInteraction,
    requestWorkplaceInteraction,
    view.workplace.fridgeOpen,
  ]);

  const handleInteract = useCallback(
    (id: HotspotId) => {
      switch (id) {
        case "desk_player":
          setJulesOpen(false);
          dispatch({ type: "sit_desk" });
          break;
        case "door_exit":
          setJulesOpen(false);
          requestFridgeCloseOnExit();
          dispatch({ type: "leave_room" });
          break;
        case "break_door":
          window.dispatchEvent(new Event("soc-break-door"));
          {
            const message = FLAVOR[id];
            if (message) dispatch({ type: "set_flavor", message });
          }
          break;
        case "jules": {
          setJulesOpen(true);
          break;
        }
        case "fridge": {
          const interaction = fridgeControl(view.workplace).interaction;
          if (interaction) requestWorkplaceInteraction(interaction);
          break;
        }
        case "coffee": {
          const interaction = coffeeControl(view.workplace).interaction;
          if (interaction) requestWorkplaceInteraction(interaction);
          break;
        }
        /** The drawer sliding open is the whole feedback — no caption needed. */
        case "storage":
          window.dispatchEvent(new Event("soc-storage"));
          break;
        case "alert_wall":
        case "morgan_station": {
          const message = FLAVOR[id];
          if (message) dispatch({ type: "set_flavor", message });
          break;
        }
        default:
          break;
      }
    },
    [requestFridgeCloseOnExit, requestWorkplaceInteraction, view.workplace],
  );

  const journey = getJourneyStep({
    phase: spatial.phase,
    view,
    ...(spatial.visitedDesk ? { visitedDesk: true } : {}),
  });
  const stepLabel = `Step ${String(journey.index)} of ${String(journey.total)}`;
  const walking = spatial.phase === "room_walk";
  const atDesk =
    spatial.phase === "desk_login" ||
    spatial.phase === "seated_monitor" ||
    spatial.phase === "focus_desk";

  useLayoutEffect(() => {
    if (atDesk && typeof stageRef.current?.scrollIntoView === "function") {
      stageRef.current.scrollIntoView({ block: "start" });
    }
  }, [atDesk, spatial.phase]);

  if (spatial.phase === "floor_map") {
    return (
      <FloorMap
        hint={journey.body}
        onEnterRoom={(roomId) => {
          dispatch({ type: "enter_room", roomId });
        }}
        stepLabel={stepLabel}
        title={journey.title}
        {...(journey.target?.kind === "room"
          ? { highlightRoomId: journey.target.roomId }
          : {})}
      />
    );
  }

  const nearbyHotspotId = spatial.nearbyHotspotId;
  const nearbyPrompt = nearbyLabel
    ? nearbyLabel === "Your chair"
      ? "At your chair — press E or Sit to use the computer"
      : `Near: ${nearbyLabel} · press E or Interact`
    : undefined;
  const energyLow =
    view.workplace.energy.current / view.workplace.energy.max <= 0.28;
  const energyEmpty = view.workplace.energy.current === 0;
  const highlightHotspotId: HotspotId | undefined =
    journey.target?.kind === "hotspot" ? journey.target.hotspotId : undefined;
  /** Spawning beside the exit should not bury the step the player is actually on. */
  const nearbyIsTarget =
    highlightHotspotId !== undefined &&
    highlightHotspotId === spatial.nearbyHotspotId;

  const maximized = spatial.phase === "focus_desk";
  const deskPhase =
    spatial.phase === "desk_login" ||
    spatial.phase === "seated_monitor" ||
    spatial.phase === "focus_desk"
      ? spatial.phase
      : undefined;
  const roomLabel = "Security Operations";
  const fullscreenLabel = fullscreen ? "Exit fullscreen" : "Fullscreen";
  const compass = energyEmpty
    ? "Energy empty · use a carried snack or visit the break-room fridge and coffee maker"
    : energyLow
      ? "Energy getting low · carry a snack or use the coffee maker in the break room"
      : highlightHotspotId === "desk_player"
        ? "Your desk · follow the gold marker"
        : undefined;
  const breakStation =
    nearbyHotspotId === "fridge" || nearbyHotspotId === "coffee"
      ? nearbyHotspotId
      : undefined;
  const canonicalMutationPending = Boolean(mutationState.pendingKey);
  const resourcePending = workplacePending || canonicalMutationPending;
  const movementMutationPending =
    mutationState.pendingKey ===
    workplaceMutationKey({ type: "movement_exertion", distanceMeters: 5 });
  const playerMovementBlocked =
    workplacePending || (canonicalMutationPending && !movementMutationPending);

  return (
    <section
      className={`spatial-shell${atDesk ? " spatial-shell-engaged" : ""}`}
      aria-label="Workplace space"
    >
      <div
        className={`room-stage${atDesk ? " room-stage-desk" : ""}${maximized ? " room-stage-desk-max" : ""}${fullscreen ? " room-stage-fs" : ""}`}
        ref={stageRef}
      >
        <Suspense
          fallback={<p className="room-loading">Entering {roomLabel}…</p>}
        >
          <RoomCanvas
            enabled={walking && !playerMovementBlocked}
            {...(onAcceptedDistance ? { onAcceptedDistance } : {})}
            onBreakRoomExit={requestFridgeCloseOnExit}
            onInteract={handleInteract}
            onNearbyChange={onNearbyChange}
            seated={atDesk}
            workplace={view.workplace}
            mouseSensitivity={mouseSensitivity}
            onWalkBlocked={() => {
              setWalkBlocked(true);
            }}
            onRecover={() => {
              setWalkBlocked(false);
            }}
            {...(highlightHotspotId ? { highlightHotspotId } : {})}
          />
        </Suspense>
        {atDesk && deskPhase ? (
          <LaptopOverlay
            maximized={maximized}
            onAction={onAction}
            mutationState={mutationState}
            {...(onRetryMutation ? { onRetryMutation } : {})}
            {...(onTaskAttempt ? { onTaskAttempt } : {})}
            {...(onNotification ? { onNotification } : {})}
            {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
            onLoginSuccess={() => {
              dispatch({ type: "login_success" });
              osDispatch({ type: "mark_morgan_intro_seen" });
            }}
            onStand={() => {
              dispatch({ type: "stand" });
            }}
            phase={deskPhase}
            view={view}
          />
        ) : null}
        {walking && !pointerLocked ? (
          <p className="room-look-hint">Click to look around</p>
        ) : null}
        {walking && julesOpen ? (
          <JulesDialogue
            onClose={() => {
              setJulesOpen(false);
            }}
            onTopic={handleJulesTopic}
            pending={
              workplacePending ||
              canonicalMutationPending ||
              !onWorkplaceInteraction
            }
            seenTopics={view.workplace.julesTopicsSeen}
            {...(julesReply ? { reply: julesReply } : {})}
          />
        ) : null}
        {walking ? (
          <div className="room-hud">
            <div className="room-hud-brief">
              {mutationState.error ||
              mutationState.pendingKey ||
              mutationState.success ? (
                <MutationStatus
                  state={mutationState}
                  {...(onRetryMutation ? { onRetry: onRetryMutation } : {})}
                />
              ) : null}
              <p className="room-hud-step">
                <span className="room-hud-count">{stepLabel}</span>
                {journey.title}
              </p>
              <p className="room-hud-line">
                {nearbyIsTarget && nearbyPrompt ? nearbyPrompt : journey.body}
              </p>
              {compass ? <p className="room-hud-compass">{compass}</p> : null}
              {!nearbyIsTarget && nearbyPrompt ? (
                <p className="room-hud-nearby">{nearbyPrompt}</p>
              ) : null}
              {spatial.flavorMessage ? (
                <p className="room-flavor">{spatial.flavorMessage}</p>
              ) : null}
              {walkBlocked ? (
                <div className="room-flavor" role="status">
                  That way is blocked — head back to the aisle.
                  <button className="guidance-secondary" type="button" onClick={() => {
                    window.dispatchEvent(new Event("soc-recover-aisle"));
                    setWalkBlocked(false);
                  }}>Return to aisle</button>
                </div>
              ) : null}
              {breakStation ? (
                <BreakRoomPanel
                  onSubmit={requestWorkplaceInteraction}
                  pending={resourcePending || !onWorkplaceInteraction}
                  station={breakStation}
                  workplace={view.workplace}
                />
              ) : null}
            </div>
            <div className="room-hud-status">
              <EnergyMeter workplace={view.workplace} />
              <details className="room-hud-details">
                <summary>Supplies</summary>
                <EmergencyRecoveryControl workplace={view.workplace} onSubmit={requestWorkplaceInteraction} pending={resourcePending || !onWorkplaceInteraction} />
                <CarriedSnackControl
                  onSubmit={requestWorkplaceInteraction}
                  pending={resourcePending || !onWorkplaceInteraction}
                  workplace={view.workplace}
                />
              </details>
            </div>
            <div className="room-hud-actions">
              <label className="room-sensitivity" htmlFor="mouse-sensitivity">
                Mouse sensitivity
                <input
                  id="mouse-sensitivity"
                  type="range"
                  min={MIN_MOUSE_SENSITIVITY}
                  max={MAX_MOUSE_SENSITIVITY}
                  step={MOUSE_SENSITIVITY_STEP}
                  value={mouseSensitivity}
                  onChange={(event) => {
                    const next = Number(event.currentTarget.value);
                    setMouseSensitivity(next);
                    saveMouseSensitivity(next);
                  }}
                />
                <output htmlFor="mouse-sensitivity">
                  {mouseSensitivity.toFixed(1)}×
                </output>
              </label>
              {nearbyHotspotId && !breakStation ? (
                <button
                  className="start-shift"
                  onClick={() => {
                    handleInteract(nearbyHotspotId);
                  }}
                  type="button"
                >
                  {INTERACT_LABEL[nearbyHotspotId] ?? "Interact"}
                </button>
              ) : null}
              <button
                aria-pressed={fullscreen}
                className="guidance-secondary"
                onClick={() => {
                  void toggleFullscreen();
                }}
                type="button"
              >
                {fullscreenLabel}
              </button>
              <button
                className="guidance-secondary"
                onClick={() => {
                  setJulesOpen(false);
                  requestFridgeCloseOnExit();
                  dispatch({ type: "leave_room" });
                }}
                type="button"
              >
                Floor map
              </button>
              <ControlsHelp />
            </div>
          </div>
        ) : null}
        {atDesk ? (
          <div className="room-desk-hud">
            <div>
              <p className="room-hud-step">
                {stepLabel} · {journey.title}
              </p>
              <p>
                {spatial.phase === "desk_login"
                  ? "Sign in on the laptop — credentials are on the yellow note"
                  : "Use the laptop for the full desk view"}
              </p>
              {energyLow ? (
                <p className="room-hud-compass">
                  Energy low · use a carried snack here, or stand and visit the
                  break room
                </p>
              ) : null}
              <EnergyMeter workplace={view.workplace} />
              <EmergencyRecoveryControl workplace={view.workplace} onSubmit={requestWorkplaceInteraction} pending={resourcePending || !onWorkplaceInteraction} />
              <CarriedSnackControl
                onSubmit={requestWorkplaceInteraction}
                pending={resourcePending || !onWorkplaceInteraction}
                workplace={view.workplace}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/**
 * OS session state lives above the LaptopOverlay mount so leave/return and
 * future window work do not depend on DeskOs mount lifetime.
 */
export function SpatialShell(props: Parameters<typeof SpatialShellStage>[0]) {
  return (
    <OsSessionProvider>
      <SpatialShellStage {...props} />
    </OsSessionProvider>
  );
}
