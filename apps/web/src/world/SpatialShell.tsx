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
import { writeTabValue } from "../useTabDraft.js";
import { OsSessionProvider, useOsSession } from "./deskOs/osSession.js";
import { FloorMap } from "./FloorMap.js";
import { MorganDialogue } from "./dialogue/MorganDialogue.js";
import { ShiftHints } from "./dialogue/ShiftHints.js";
import { unlockDialogueAudio } from "./dialogue/audio.js";
import { JulesDialogue } from "./JulesDialogue.js";
import { getJourneyStep } from "../journey.js";
import { INITIAL_SPATIAL, reduceSpatialEvent } from "./presentation.js";
import { isTypingTarget, useFullscreen } from "./useFullscreen.js";
import type { HotspotId, SpatialState } from "./worldTypes.js";
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

const loadRoomCanvas = () => import("./RoomCanvas.js");
const RoomCanvas = lazy(async () => {
  const mod = await loadRoomCanvas();
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
  morgan_station: "Talk to Morgan",
  storage: "Open cabinets",
  alert_wall: "Review alert wall",
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
  recoveryPresentation,
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
  recoveryPresentation?: { current: SpatialState };
}) {
  const [spatial, dispatch] = useReducer(
    reduceSpatialEvent,
    recoveryPresentation?.current ?? INITIAL_SPATIAL,
  );
  useLayoutEffect(() => {
    if (recoveryPresentation) recoveryPresentation.current = spatial;
    writeTabValue(`spatial:${view.sessionId}`, spatial);
  }, [recoveryPresentation, spatial, view.sessionId]);
  const { dispatch: osDispatch } = useOsSession();
  const [nearbyLabel, setNearbyLabel] = useState<string>();
  const [nearbyChoices, setNearbyChoices] = useState<HotspotId[]>([]);
  const [interactionMiss, setInteractionMiss] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [mouseSensitivity, setMouseSensitivity] =
    useState(loadMouseSensitivity);
  const [workplacePending, setWorkplacePending] = useState(false);
  const [morganOpen, setMorganOpen] = useState(false);
  const [julesOpen, setJulesOpen] = useState(false);
  const [julesReply, setJulesReply] = useState<JulesDialogueReply>();
  const [walkBlocked, setWalkBlocked] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const workplacePendingRef = useRef(false);
  const closeFridgeIntentRef = useRef(false);
  const { active: fullscreen, toggle: toggleFullscreen } =
    useFullscreen(stageRef);

  useEffect(() => {
    if (spatial.phase === "floor_map") void loadRoomCanvas().catch(() => {});
  }, [spatial.phase]);

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

  const onNearbyChange = useCallback(
    (id?: HotspotId, label?: string, choices?: HotspotId[]) => {
      setNearbyChoices(choices ?? (id ? [id] : []));
      if (id) setInteractionMiss(false);
      if (id === undefined) {
        dispatch({ type: "set_nearby" });
      } else {
        dispatch({ type: "set_nearby", hotspotId: id });
      }
      setNearbyLabel(label);
    },
    [],
  );

  useEffect(() => {
    const miss = () => {
      setInteractionMiss(true);
    };
    window.addEventListener("soc-interaction-miss", miss);
    return () => {
      window.removeEventListener("soc-interaction-miss", miss);
    };
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
      unlockDialogueAudio();
      const reply = julesDialogueFromClientView(view, topic);
      const source = view.artifacts.find(
        (a) => a.id === view.workplace.lastInspectedArtifactId,
      );
      const eventId =
        view.events.find(
          (e) => source?.eventIds.includes(e.id) && e.status === "active",
        )?.id ??
        view.events.find(
          (e) => e.id === "suspicious-login-1" && e.status === "active",
        )?.id ??
        view.events.find(
          (e) => e.status === "active" && e.category !== "handoff",
        )?.id ??
        view.events.find((e) => e.status === "active")?.id;
      void (async () => {
        const result = await submitWorkplaceInteraction({
          type: "talk_to_jules",
          topic,
          ...(eventId ? { eventId } : {}),
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
      unlockDialogueAudio();
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
          if (
            julesReply ||
            view.workplace.julesTopicsSeen.includes("current_work")
          )
            setJulesReply(julesDialogueFromClientView(view, "current_work"));
          setMorganOpen(false);
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
        case "morgan_station":
          setJulesOpen(false);
          setMorganOpen(true);
          break;
        case "alert_wall": {
          const message = FLAVOR[id];
          if (message) dispatch({ type: "set_flavor", message });
          break;
        }
        default:
          break;
      }
    },
    [julesReply, requestFridgeCloseOnExit, requestWorkplaceInteraction, view],
  );

  const journey = getJourneyStep({
    phase: spatial.phase,
    view,
    ...(spatial.visitedDesk ? { visitedDesk: true } : {}),
  });
  const stepLabel = spatial.visitedDesk
    ? "Current shift"
    : `Step ${String(journey.index)} of ${String(journey.total)}`;
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

  const isFloorMap = spatial.phase === "floor_map";

  const nearbyHotspotId = spatial.nearbyHotspotId;
  const labelFor = (id: HotspotId): string =>
    id === "coffee"
      ? coffeeControl(view.workplace).label
      : id === "fridge"
        ? fridgeControl(view.workplace).label
        : id === "break_door"
          ? id === nearbyHotspotId
            ? (nearbyLabel ?? "Use door")
            : "Use door"
          : (INTERACT_LABEL[id] ?? "Interact");
  const nearbyPrompt = nearbyLabel
    ? nearbyLabel === "Your chair"
      ? "At your chair — press E or Sit to use the computer"
      : `Near: ${nearbyLabel} · press E to ${nearbyHotspotId ? labelFor(nearbyHotspotId) : "interact"}`
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
        ? "Your desk · follow the blue marker · approach the open front of the cubicle"
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
    julesOpen ||
    morganOpen ||
    workplacePending ||
    (canonicalMutationPending && !movementMutationPending);

  return (
    <>
      {isFloorMap ? (
        <FloorMap
          returning={Boolean(spatial.visitedDesk)}
          hint={journey.body}
          onEnterRoom={(roomId) => {
            dispatch({ type: "enter_room", roomId });
          }}
          onRequestFullscreen={() => {
            if (!fullscreen) void toggleFullscreen();
          }}
          stepLabel={stepLabel}
          title={journey.title}
          {...(journey.target?.kind === "room"
            ? { highlightRoomId: journey.target.roomId }
            : {})}
        />
      ) : null}
      <section
        className={`spatial-shell${atDesk ? " spatial-shell-engaged" : ""}`}
        aria-label="Workplace space"
        aria-hidden={isFloorMap ? true : undefined}
        {...(isFloorMap ? { inert: true } : {})}
        style={
          isFloorMap
            ? { position: "absolute", opacity: 0, pointerEvents: "none", zIndex: -1 }
            : undefined
        }
      >
        <div
          className={`room-stage${atDesk ? " room-stage-desk" : ""}${maximized ? " room-stage-desk-max" : ""}${fullscreen ? " room-stage-fs" : ""}`}
          ref={stageRef}
        >
        {!atDesk ? (
          <ShiftHints
            view={view}
            phase={spatial.phase}
            paused={julesOpen || morganOpen}
          />
        ) : null}
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
        {walking && morganOpen ? (
          <MorganDialogue
            view={view}
            actions={view.availableActions.filter(
              (a) => a.id === "ask_manager",
            )}
            onAction={onAction}
            pending={resourcePending}
            onClose={() => {
              setMorganOpen(false);
            }}
          />
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
                  focusSuccess={!julesOpen && !morganOpen}
                  state={mutationState}
                  {...(onRetryMutation ? { onRetry: onRetryMutation } : {})}
                />
              ) : null}
              <p className="room-hud-step">
                <span className="room-hud-count">{stepLabel}</span>
                {journey.title}
              </p>
              {nearbyHotspotId && !playerMovementBlocked ? (
                <p className="room-context-action">
                  <kbd>E</kbd> {labelFor(nearbyHotspotId)}
                </p>
              ) : null}
              <p className="room-hud-line">
                {nearbyIsTarget && nearbyPrompt ? nearbyPrompt : journey.body}
              </p>
              {compass ? <p className="room-hud-compass">{compass}</p> : null}
              <p className="room-hud-nearby" role="status">
                {playerMovementBlocked
                  ? "Interaction paused · finish the current action or close the conversation to move and use E"
                  : nearbyPrompt
                    ? `Ready · ${nearbyPrompt}`
                    : "Out of reach · move closer to a floor marker to use E"}
              </p>
              {nearbyChoices.length > 1 ? (
                <div className="room-hud-choices" aria-label="Nearby actions">
                  <p>
                    More than one action in reach — choose below. E uses the
                    action shown above.
                  </p>
                  {nearbyChoices
                    .filter((id) => id !== nearbyHotspotId)
                    .map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="guidance-secondary"
                        disabled={playerMovementBlocked}
                        onClick={() => {
                          handleInteract(id);
                        }}
                      >
                        {labelFor(id)}
                      </button>
                    ))}
                </div>
              ) : null}

              {interactionMiss ? (
                <p className="room-flavor" role="status">
                  Nothing in reach yet — move closer to a floor marker. When
                  ready, the prompt shows E and the action.
                </p>
              ) : null}
              {spatial.flavorMessage ? (
                <p className="room-flavor">{spatial.flavorMessage}</p>
              ) : null}
              {walkBlocked ? (
                <div className="room-flavor" role="status">
                  That way is blocked — head back to the aisle.
                  <button
                    className="guidance-secondary"
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(new Event("soc-recover-aisle"));
                      setWalkBlocked(false);
                    }}
                  >
                    Return to aisle
                  </button>
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
                <EmergencyRecoveryControl
                  workplace={view.workplace}
                  onSubmit={requestWorkplaceInteraction}
                  pending={resourcePending || !onWorkplaceInteraction}
                />
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
                  disabled={playerMovementBlocked}
                  onClick={() => {
                    handleInteract(nearbyHotspotId);
                  }}
                  type="button"
                >
                  {labelFor(nearbyHotspotId)}
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
      </div>
      {atDesk ? (
        <details className="room-desk-hud">
          <summary>
            Desk resources · energy {view.workplace.energy.current}/
            {view.workplace.energy.max}
          </summary>
          <div>
            {energyLow ? (
              <p className="room-hud-compass">
                Energy low · use a carried snack here, or stand and visit the
                break room
              </p>
            ) : null}
            <EnergyMeter workplace={view.workplace} />
            <EmergencyRecoveryControl
              workplace={view.workplace}
              onSubmit={requestWorkplaceInteraction}
              pending={resourcePending || !onWorkplaceInteraction}
            />
            <CarriedSnackControl
              onSubmit={requestWorkplaceInteraction}
              pending={resourcePending || !onWorkplaceInteraction}
              workplace={view.workplace}
            />
          </div>
        </details>
      ) : null}
    </section>
    </>
  );
}

/**
 * OS session state lives above the LaptopOverlay mount so leave/return and
 * future window work do not depend on DeskOs mount lifetime.
 */
export function SpatialShell(props: Parameters<typeof SpatialShellStage>[0]) {
  return (
    <OsSessionProvider sessionId={props.view.sessionId}>
      <SpatialShellStage {...props} />
    </OsSessionProvider>
  );
}
