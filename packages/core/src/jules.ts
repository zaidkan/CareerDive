import type {
  ClientView,
  JulesTopic,
  WorkSystemId,
  WorldState,
} from "@sim/schemas";
import { toClientView } from "./serializer.js";

export type JulesDialogueReply = {
  speaker: "Jules";
  text: string;
  nextSystemId?: WorkSystemId;
};

type JulesDialoguePublicState = Pick<
  ClientView,
  "events" | "availableActions" | "artifacts" | "workplace"
>;

function publicDialogueState(view: ClientView): JulesDialoguePublicState {
  return {
    events: view.events,
    availableActions: view.availableActions,
    artifacts: view.artifacts,
    workplace: view.workplace,
  };
}

function currentWorkReply(
  state: JulesDialoguePublicState,
  repeated: boolean,
): JulesDialogueReply {
  const available = new Set(state.availableActions.map(({ id }) => id));
  const prefix = repeated ? "Quick follow-up: " : "From what we can see, ";

  if (available.has("check_device_inventory")) {
    return {
      speaker: "Jules",
      text: `${prefix}the device inventory is the useful public reference now. Open Guides, compare the device record, and keep your conclusion in your notes.`,
      nextSystemId: "knowledge_base",
    };
  }

  if (available.has("search_knowledge_base")) {
    return {
      speaker: "Jules",
      text: `${prefix}the next safe step is to compare the visible alert with the approved reference in Guides, then record what matched in your notes.`,
      nextSystemId: "knowledge_base",
    };
  }

  if (available.has("document_ticket")) {
    return {
      speaker: "Jules",
      text: `${prefix}the public context is ready to document. Open Tickets and separate what you observed from what is still uncertain.`,
      nextSystemId: "ticket_queue",
    };
  }

  if (available.has("inspect_login_context")) {
    return {
      speaker: "Jules",
      text: `${prefix}the login context in Alerts is the next useful record. Compare the visible device, network, and account context, then note what still needs checking.`,
      nextSystemId: "alert_dashboard",
    };
  }

  if (available.has("inspect_account_history")) {
    return {
      speaker: "Jules",
      text: `${prefix}the account history in Alerts is still available. Compare the usual pattern with the visible login context and record the difference without choosing an outcome yet.`,
      nextSystemId: "alert_dashboard",
    };
  }

  if (available.has("review_alert")) {
    return {
      speaker: "Jules",
      text: `${prefix}Alerts has the next visible record. Read the alert, note what needs checking, and avoid treating one clue as the whole answer.`,
      nextSystemId: "alert_dashboard",
    };
  }

  if (available.has("read_handoff")) {
    return {
      speaker: "Jules",
      text: `${prefix}open Email and read the shift handoff. Note the unfinished work so it stays visible while you decide what to pick up next.`,
      nextSystemId: "email",
    };
  }

  if (available.has("escalate_alert") || available.has("dismiss_alert")) {
    return {
      speaker: "Jules",
      text: `${prefix}the case is at a decision point. Review your notes in Tickets and send the decision to Morgan; I won't choose the outcome for you.`,
      nextSystemId: "ticket_queue",
    };
  }

  const activeWork = state.events.some(({ status }) => status === "active");
  return {
    speaker: "Jules",
    text:
      state.availableActions.length > 0
        ? `${prefix}public work is available, but I can't safely summarize that step here. Open the available item at your desk, read its purpose, and ask Morgan if the procedure is unclear.`
        : activeWork
          ? `${prefix}no new public step is showing yet. Keep your notes current and watch the queue for the next visible update.`
          : `${prefix}the visible queue is settled. Check your notes, then ask Morgan what should happen next.`,
  };
}

function resolveDialogue(
  state: JulesDialoguePublicState,
  topic: JulesTopic,
): JulesDialogueReply {
  const repeated = state.workplace.julesTopicsSeen.includes(topic);

  switch (topic) {
    case "first_day":
      return {
        speaker: "Jules",
        text: repeated
          ? "Quick recap: monitor the queue, keep short notes, and expect interruptions. When a decision needs procedural guidance, ask Morgan."
          : "The first-day rhythm is monitoring the queue, keeping short notes, and handling interruptions without losing your next step. Ask Morgan when a decision needs procedural guidance.",
      };
    case "current_work":
      return currentWorkReply(state, repeated);
    case "break_room": {
      const needsEnergy =
        state.workplace.energy.current * 2 <= state.workplace.energy.max;
      return {
        speaker: "Jules",
        text: repeated
          ? "Same break-room rule: write one next step, take a short break, then return to that step."
          : needsEnergy
            ? "A short break can help when energy is low. Write one next step first, use an available snack or coffee if you need it, then return to that step."
            : "A short break works best when you write one next step first. Step away briefly, then return to that specific step instead of restarting the whole case.",
      };
    }
    case "team_context":
      return {
        speaker: "Jules",
        text: repeated
          ? "Peer view only: I can help you frame what you noticed, but send procedural decisions to Morgan."
          : "I can offer a peer perspective on the work you can see, but Morgan owns procedural guidance. Send decision questions to Morgan in Team Chat.",
      };
  }
}

export function julesDialogueFromClientView(
  view: ClientView,
  topic: JulesTopic,
): JulesDialogueReply {
  return resolveDialogue(publicDialogueState(view), topic);
}

export function julesDialogue(
  state: WorldState,
  topic: JulesTopic,
): JulesDialogueReply {
  return julesDialogueFromClientView(toClientView(state), topic);
}
