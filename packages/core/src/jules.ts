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
      text: `${prefix}the device inventory is the useful public reference now. Open Guides and compare the exact device name, not just the account owner. Keep the record reference and what it actually says in your notes; a missing entry is not a person's identity.`,
      nextSystemId: "knowledge_base",
    };
  }

  if (available.has("search_knowledge_base")) {
    return {
      speaker: "Jules",
      text: `${prefix}the next safe step is to compare the visible alert with the approved reference in Guides. Check source, event time, and scope together, then record what matched in your notes. A familiar-looking alert still needs its own reference.`,
      nextSystemId: "knowledge_base",
    };
  }

  if (available.has("document_ticket")) {
    return {
      speaker: "Jules",
      text: `${prefix}the public context is ready to document. Open Tickets and separate what you observed from what is still uncertain. Imagine the next analyst reading your note without you beside them: name the source and leave a concrete next step, not just "looked into it".`,
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
          ? "Quick recap: monitor the queue, keep short notes, and expect interruptions. Before switching items, write what you checked and what remains open. Asking Morgan a specific procedure question is part of owning the work, not giving up on it."
          : "The first-day rhythm is monitoring the queue, keeping short notes, and handling interruptions without losing your next step. Much of the job is careful comparison and communication, not dramatic discoveries. You do not need to know every term already; open the record, use its explanations, and ask Morgan when the procedure is unclear.",
      };
    case "current_work":
      return currentWorkReply(state, repeated);
    case "break_room": {
      const needsEnergy =
        state.workplace.energy.current * 2 <= state.workplace.energy.max;
      return {
        speaker: "Jules",
        text: repeated
          ? "Same break-room rule: write one next step, take a short break, then return to that step. I like a note that says where to resume so I do not have to hold the whole investigation in my head. Breaks are not work evidence."
          : needsEnergy
            ? "A short break can help when energy is low. Write one next step first, use an available snack or coffee if you need it, then return to that step. The room shows what is left; you do not need to rush, and waiting or reading does not use energy."
            : "A short break works best when you write one next step first. Step away briefly, then return to that specific step instead of restarting the whole case. Leave the record reference with the note so the next check is easy to find.",
      };
    }
    case "team_context":
      return {
        speaker: "Jules",
        text: repeated
          ? "Peer view only: I can help you frame what you noticed, but send procedural decisions to Morgan. Try a short handoff: the record you checked, the detail that needs context, and the question you want reviewed. Leave room for another explanation."
          : "I can offer a peer perspective on the work you can see, but Morgan owns procedural guidance. Send decision questions to Morgan in Team Chat. The team needs both careful investigation and clear handoffs; sounding certain is less useful than explaining what you know and what you still need to check.",
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
