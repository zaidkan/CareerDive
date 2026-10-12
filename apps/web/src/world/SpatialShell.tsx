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
import { ArrivalFilm } from "../site/ArrivalFilm.js";
import { MutationStatus } from "../components/MutationStatus.js";
import { BreakRoomPanel, EmergencyRecoveryControl } from "./BreakRoomPanel.js";
import { coffeeControl } from "./breakRoom.js";
import { ControlsHelp } from "./ControlsHelp.js";
import { LaptopOverlay } from "./deskOs/LaptopOverlay.js";
import { writeTabValue } from "../useTabDraft.js";
import { OsSessionProvider, useOsSession } from "./deskOs/osSession.js";
import { FloorMap } from "./FloorMap.js";
import { MorganDialogue } from "./dialogue/MorganDialogue.js";
import { ShiftHints } from "./dialogue/ShiftHints.js";
import { AudioToggle } from "./dialogue/AudioToggle.js";
import "./SocHud.css";
import { playWorldSound, unlockDialogueAudio } from "./dialogue/audio.js";
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

const RoomCanvas = lazy(async () => {
  const mod = await import("./RoomCanvas.js");
  return { default: mod.RoomCanvas };
});

const FLAVOR: Partial<Record<HotspotId, string>> = {
  break_door:
    "Glass break corner beside the entrance — coffee with Jules if you want a breather.",
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
  arrivalFilmEnabled = false,
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
  /** Presentation only; disable without changing session or scene ownership. */
  arrivalFilmEnabled?: boolean;
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
  // Retain camera/door state after entry; no WebGL on the initial map.
  const [roomEntered, setRoomEntered] = useState(spatial.phase !== "floor_map");
  const arrivalPending = useRef(arrivalFilmEnabled && spatial.phase === "floor_map");
  const [arrivalActive, setArrivalActive] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const onSceneReady = useCallback(() => { setSceneReady(true); }, []);
  const [nearbyLabel, setNearbyLabel] = useState<string>();
  const [nearbyChoices, setNearbyChoices] = useState<HotspotId[]>([]);
  const [interactionMiss, setInteractionMiss] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [workplacePending, setWorkplacePending] = useState(false);
  const [morganOpen, setMorganOpen] = useState(false);
  const [julesOpen, setJulesOpen] = useState(false);
  const [julesReply, setJulesReply] = useState<JulesDialogueReply>();
  const [walkBlocked, setWalkBlocked] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const workplacePendingRef = useRef(false);
  const closeFridgeIntentRef = useRef(false);
  const { active: fullscreen, toggle: toggleFullscreen, exit: exitFullscreen } =
    useFullscreen(stageRef);

  const finishArrival = useCallback(() => {
    setArrivalActive(false);
    stageRef.current?.focus({ preventScroll: true });
  }, []);

  const onWalkBlocked = useCallback(() => { setWalkBlocked(true); }, []);
  const onRecover = useCallback(() => { setWalkBlocked(false); }, []);

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
      if (id === "fridge") { id = undefined; label = undefined; }
      setNearbyChoices((choices ?? (id ? [id] : [])).filter((choice) => choice !== "fridge"));
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
      unlockDialogueAudio();
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

  const leaveRoom = useCallback(async () => {
    setJulesOpen(false);
    requestFridgeCloseOnExit();
    if (await exitFullscreen()) {
      dispatch({ type: "leave_room" });
    } else {
      dispatch({
        type: "set_flavor",
        message: "Exit fullscreen with Esc, then try the floor map again.",
      });
    }
  }, [exitFullscreen, requestFridgeCloseOnExit]);

  const handleInteract = useCallback(
    (id: HotspotId) => {
      unlockDialogueAudio();
      switch (id) {
        case "desk_player":
          playWorldSound("sit");
          setJulesOpen(false);
          dispatch({ type: "sit_desk" });
          break;
        case "door_exit":
          void leaveRoom();
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
        case "fridge":
          // Retained ID for saved sessions; no longer an interactive prop.
          break;
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
    [julesReply, leaveRoom, requestWorkplaceInteraction, view],
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
      : id === "break_door"
        ? id === nearbyHotspotId
          ? (nearbyLabel ?? "Use door")
          : "Use door"
        : (INTERACT_LABEL[id] ?? "Interact");
  const highlightHotspotId: HotspotId | undefined =
    journey.target?.kind === "hotspot" ? journey.target.hotspotId : undefined;
  const maximized = spatial.phase === "focus_desk";
  const deskPhase =
    spatial.phase === "desk_login" ||
    spatial.phase === "seated_monitor" ||
    spatial.phase === "focus_desk"
      ? spatial.phase
      : undefined;
  const roomLabel = "Security Operations";
  const fullscreenLabel = fullscreen ? "Exit fullscreen" : "Fullscreen";
  const objectiveCue = highlightHotspotId === "desk_player"
    ? "Follow the blue marker to the open side of your desk."
    : "Return to your desk when you are ready to continue.";
  const breakStation = nearbyHotspotId === "coffee" ? "coffee" : undefined;
  const canonicalMutationPending = Boolean(mutationState.pendingKey);
  const resourcePending = workplacePending || canonicalMutationPending;
  const movementMutationPending =
    mutationState.pendingKey ===
    workplaceMutationKey({ type: "movement_exertion", distanceMeters: 5 });
  const playerMovementBlocked =
    arrivalActive ||
    julesOpen ||
    morganOpen ||
    workplacePending ||
    (canonicalMutationPending && !movementMutationPending);

  return (
    <>
      {isFloorMap ? (
        <FloorMap
          animateTravel={false}
          returning={Boolean(spatial.visitedDesk)}
          hint={journey.body}
          onEnterRoom={(roomId) => {
            if (roomId === "soc" && arrivalPending.current) {
              arrivalPending.current = false;
              setArrivalActive(true);
            }
            setRoomEntered(true);
            dispatch({ type: "enter_room", roomId });
          }}
          onRequestFullscreen={() => {
            // Preload and request fullscreen in the SOC click; the same stage
            // stays mounted through film playback and live gameplay.
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
          className={`room-stage${arrivalActive ? " room-stage-arriving" : ""}${atDesk ? " room-stage-desk" : ""}${maximized ? " room-stage-desk-max" : ""}${fullscreen ? " room-stage-fs" : ""}`}
          ref={stageRef}
          tabIndex={-1}
          data-scene-ready={sceneReady}
        >
        <div className="room-live" aria-hidden={arrivalActive ? true : undefined} inert={arrivalActive}>
        {!atDesk ? (
          <ShiftHints
            view={view}
            phase={spatial.phase}
            paused={arrivalActive || julesOpen || morganOpen}
          />
        ) : null}
        {roomEntered ? <Suspense
          fallback={<p className="room-loading">Entering {roomLabel}…</p>}
        >
          <RoomCanvas
            active={!isFloorMap}
            enabled={walking && !playerMovementBlocked}
            {...(onAcceptedDistance ? { onAcceptedDistance } : {})}
            onBreakRoomExit={requestFridgeCloseOnExit}
            onInteract={handleInteract}
            onNearbyChange={onNearbyChange}
            seated={atDesk}
            workplace={view.workplace}
            onWalkBlocked={onWalkBlocked}
            onRecover={onRecover}
            onReady={onSceneReady}
            {...(highlightHotspotId ? { highlightHotspotId } : {})}
          />
        </Suspense> : null}
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
            canDiscussHandoff={Boolean(spatial.deskAuthenticated)}
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
              <p className="room-hud-line">{objectiveCue}</p>
              <details className="room-objective-details">
                <summary>Objective details</summary>
                <p>{journey.body}</p>
              </details>
              <p className="room-hud-nearby" role="status">
                {playerMovementBlocked
                  ? "Paused · finish the action or close the conversation"
                  : nearbyHotspotId && nearbyLabel
                    ? `Ready · ${nearbyLabel} · E to ${labelFor(nearbyHotspotId)}`
                    : "Out of reach · move closer to use E"}
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
              <EmergencyRecoveryControl
                workplace={view.workplace}
                onSubmit={requestWorkplaceInteraction}
                pending={resourcePending || !onWorkplaceInteraction}
              />
              {breakStation ? (
                <BreakRoomPanel
                  onSubmit={requestWorkplaceInteraction}
                  pending={resourcePending || !onWorkplaceInteraction}
                  station={breakStation}
                  workplace={view.workplace}
                />
              ) : null}
            </div>
            <span className="visually-hidden">Lunchbox by the fridge: My breakfast — DO NOT touch. yeah, I'm talking to you, Reed.</span>
            <div className="room-hud-actions">
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
                  void leaveRoom();
                }}
                type="button"
              >
                Floor map
              </button>
              <AudioToggle />
              <ControlsHelp />
            </div>
          </div>
        ) : null}
        </div>
        {arrivalActive ? <ArrivalFilm sceneReady={sceneReady} onComplete={finishArrival} /> : null}
      </div>
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
