import { useEffect, useRef } from "react";
import type { AvailableAction, ClientView } from "@sim/schemas";
import {
  DESK_OS_FILL_EVENT,
  isTypingTarget,
  useFullscreen,
} from "../useFullscreen.js";
import { DeskOs } from "./DeskOs.js";
import type {
  NotificationHandler,
  TaskAttemptHandler,
  WorkplaceInteractionHandler,
} from "../../components/shared.js";
import type { MutationState } from "../../useMutationCoordinator.js";

/** Real DOM laptop over the 3D canvas so clicks and typing match the pixels. */
export function LaptopOverlay({
  phase,
  view,
  onAction,
  onTaskAttempt,
  onNotification,
  onWorkplaceInteraction,
  guided = false,
  maximized = false,
  onLoginSuccess,
  onStand,
  mutationState,
  onRetryMutation,
  disabled = false,
}: {
  phase: "desk_login" | "seated_monitor" | "focus_desk";
  view: ClientView;
  onAction: (action: AvailableAction, freeText?: string) => void;
  onTaskAttempt?: TaskAttemptHandler;
  onNotification?: NotificationHandler;
  onWorkplaceInteraction?: WorkplaceInteractionHandler;
  guided?: boolean;
  maximized?: boolean;
  onLoginSuccess: () => void;
  onStand: () => void;
  mutationState?: MutationState;
  onRetryMutation?: () => void;
  disabled?: boolean;
}) {
  const laptopRef = useRef<HTMLDivElement>(null);
  const { active: osFullscreen, toggle: toggleOsFullscreen } =
    useFullscreen(laptopRef);

  useEffect(() => {
    const fill = () => {
      if (disabled) return;
      void toggleOsFullscreen();
    };
    const onKey = (event: KeyboardEvent) => {
      if (disabled) return;
      if (event.code !== "KeyF" || event.repeat) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      fill();
    };
    window.addEventListener(DESK_OS_FILL_EVENT, fill);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(DESK_OS_FILL_EVENT, fill);
      window.removeEventListener("keydown", onKey);
      if (document.fullscreenElement === laptopRef.current) {
        void document.exitFullscreen();
      }
    };
  }, [disabled, toggleOsFullscreen]);

  useEffect(() => {
    if (!disabled) return;
    const focused = document.activeElement;
    if (
      focused instanceof HTMLElement &&
      laptopRef.current?.contains(focused)
    ) {
      focused.blur();
    }
    if (document.fullscreenElement === laptopRef.current) {
      void document.exitFullscreen();
    }
  }, [disabled]);

  return (
    <div
      aria-hidden={disabled || undefined}
      className={`desk-os-overlay${maximized ? " desk-os-overlay-max" : ""}${osFullscreen ? " desk-os-overlay-os-fs" : ""}`}
      data-testid="desk-os-overlay"
      inert={disabled || undefined}
    >
      <div
        className={`desk-os-laptop${maximized ? " desk-os-laptop-max" : ""}`}
        ref={laptopRef}
      >
        <DeskOs
          guided={guided}
          maximized={maximized}
          onAction={onAction}
          {...(onTaskAttempt ? { onTaskAttempt } : {})}
          {...(onNotification ? { onNotification } : {})}
          {...(onWorkplaceInteraction ? { onWorkplaceInteraction } : {})}
          onLoginSuccess={onLoginSuccess}
          {...(mutationState ? { mutationState } : {})}
          {...(onRetryMutation ? { onRetryMutation } : {})}
          onOsFullscreen={() => {
            void toggleOsFullscreen();
          }}
          onStand={onStand}
          osFullscreen={osFullscreen}
          phase={phase}
          view={view}
        />
      </div>
    </div>
  );
}
