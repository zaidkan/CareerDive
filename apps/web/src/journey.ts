import type { ClientView, WorkSystemId } from "@sim/schemas";
import { getShiftGuidance, getTutorialStep, TUTORIAL_STEPS } from "./guidance.js";
import type { HotspotId, RoomId, SpatialPhase } from "./world/worldTypes.js";

export type JourneyStepId =
  | "find_room"
  | "find_desk"
  | "sign_in"
  | "read_handoff"
  | "confirm_handoff"
  | "investigate_alert"
  | "ready";

/** What the player should aim at next, highlighted but never enforced. */
export type JourneyTarget =
  | { kind: "room"; roomId: RoomId }
  | { kind: "hotspot"; hotspotId: HotspotId }
  | { kind: "system"; systemId: WorkSystemId };

export type JourneyStep = {
  id: JourneyStepId;
  index: number;
  total: number;
  title: string;
  body: string;
  target?: JourneyTarget;
};

const JOURNEY_ORDER: JourneyStepId[] = [
  "find_room",
  "find_desk",
  "sign_in",
  "read_handoff",
  "confirm_handoff",
  "investigate_alert",
  "ready",
];

export const JOURNEY_TOTAL = JOURNEY_ORDER.length;

const DESK_STEP_BY_TUTORIAL_ID: Record<
  (typeof TUTORIAL_STEPS)[number]["id"],
  JourneyStepId
> = {
  email: "read_handoff",
  "handoff-done": "confirm_handoff",
  alerts: "investigate_alert",
};

function step(
  id: JourneyStepId,
  copy: { title: string; body: string; target?: JourneyTarget },
): JourneyStep {
  return {
    id,
    index: JOURNEY_ORDER.indexOf(id) + 1,
    total: JOURNEY_TOTAL,
    title: copy.title,
    body: copy.body,
    ...(copy.target ? { target: copy.target } : {}),
  };
}

/** Tutorial titles carry their own "Step 1 · " prefix; the journey numbers itself. */
function withoutStepPrefix(title: string): string {
  return title.replace(/^Step\s+\d+\s+·\s+/u, "");
}

/**
 * One ordered day-one path across the spatial phases and the desk work, so
 * guidance never asks for email while the player is still on the floor map.
 */
export function getJourneyStep({
  phase,
  view,
  visitedDesk = false,
}: {
  phase: SpatialPhase;
  view: ClientView;
  visitedDesk?: boolean;
}): JourneyStep {
  if (phase === "floor_map") {
    return step("find_room", {
      title: "Head to Security Operations",
      body: "Your desk is inside the SOC. Walk the hall to the open door and step in.",
      target: { kind: "room", roomId: "soc" },
    });
  }

  if (phase === "room_walk") {
    return step(
      "find_desk",
      visitedDesk
        ? {
            title: "Sit back down when you are ready",
            body: "Your workstation stays exactly where you left it.",
            target: { kind: "hotspot", hotspotId: "desk_player" },
          }
        : {
            title: "Find your desk",
            body: "Look for the starred name tag, then press E to sit at the computer.",
            target: { kind: "hotspot", hotspotId: "desk_player" },
          },
    );
  }

  if (phase === "desk_login") {
    return step("sign_in", {
      title: "Sign in to your workstation",
      body: "IT left your credentials on the yellow note beside the monitor.",
    });
  }

  const guidance = getShiftGuidance(view);
  const tutorialStep = getTutorialStep(view);

  if (!tutorialStep) {
    return step("ready", {
      title: "You have covered the basics",
      body:
        guidance?.detail ??
        "Keep working the shift, or wrap up when everything is handled.",
    });
  }

  return step(DESK_STEP_BY_TUTORIAL_ID[tutorialStep.id], {
    title: withoutStepPrefix(tutorialStep.title),
    body: guidance?.detail ?? tutorialStep.body,
    ...(guidance ? { target: { kind: "system", systemId: guidance.systemId } } : {}),
  });
}
