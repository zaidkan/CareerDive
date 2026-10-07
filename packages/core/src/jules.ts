import { handoffFollowUps } from "./handoff-summary.js";
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
  | "events"
  | "availableActions"
  | "artifacts"
  | "workplace"
  | "structuredTickets"
  | "teamMessages"
>;

function publicDialogueState(view: ClientView): JulesDialoguePublicState {
  return {
    events: view.events,
    availableActions: view.availableActions,
    artifacts: view.artifacts,
    workplace: view.workplace,
    structuredTickets: view.structuredTickets,
    teamMessages: view.teamMessages,
  };
}

function currentWorkReply(
  state: JulesDialoguePublicState,
  repeated: boolean,
): JulesDialogueReply {
  const lastSource = state.artifacts.find(
    (a) => a.id === state.workplace.lastInspectedArtifactId,
  );
  const contextEvent =
    state.events.find(
      (e) => lastSource?.eventIds.includes(e.id) && e.status === "active",
    ) ??
    state.events.find(
      (e) => e.id === "suspicious-login-1" && e.status === "active",
    ) ??
    state.events.find(
      (e) => e.status === "active" && e.category !== "handoff",
    ) ??
    state.events.find((e) => e.status === "active");
  if (!contextEvent)
    return {
      speaker: "Jules",
      text: `No active case decision remains on your desk. ${handoffFollowUps(state.events, state.teamMessages).join(" ")} Keep recorded follow-ups in the handoff; check the queue for any remaining shift step.`,
      nextSystemId: "team_chat",
    };
  const available = new Set(
    state.availableActions
      .filter((a) => a.eventId === contextEvent.id)
      .map(({ id }) => id),
  );
  if (
    contextEvent.category === "handoff" &&
    available.has("submit_shift_handoff")
  )
    return {
      speaker: "Jules",
      text: "The case decisions are recorded. Send the shift handoff with checked sources, remaining uncertainty, and an owner for any pending review or approval.",
      nextSystemId: "team_chat",
    };
  const ticket = state.structuredTickets?.[`ticket-${contextEvent.id}`];
  if (ticket)
    return {
      speaker: "Jules",
      text: `You saved a note for ${contextEvent.title}. ${ticket.uncertainty ? `The question you left open is: ${ticket.uncertainty}` : "There is no open question written there yet."} I need that uncertainty alongside the decision when I pick up the ticket.`,
      nextSystemId: "ticket_queue",
    };
  if (
    state.workplace.comparisons?.some(
      (c) =>
        c.eventId === contextEvent.id &&
        ["login-session-timeline", "vpn-context-1"].every((id) =>
          c.artifactIds.includes(id),
        ),
    )
  )
    return {
      speaker: "Jules",
      text: "You recorded a source comparison. What differs between the sessions matters more than whether the city sounds familiar. Keep the comparison with the case note so I can follow your reasoning.",
      nextSystemId: "ticket_queue",
    };
  if (!["suspicious-login-1", "handoff-1"].includes(contextEvent.id))
    return {
      speaker: "Jules",
      text: `${contextEvent.title} is on your desk now. ${lastSource?.eventIds.includes(contextEvent.id) ? `You opened ${lastSource.title}.` : "I haven't seen a source opened for it yet."} Follow the selected item's next available step, and leave any unresolved question with its owner. Return to login work only if its decision is still open.`,
      nextSystemId: contextEvent.systemId,
    };

  const prefix = repeated ? "Quick follow-up: " : "From what we can see, ";

  if (available.has("check_device_inventory")) {
    return {
      speaker: "Jules",
      text: `${prefix}the device inventory is still an open question. A device label is not a person. I need the exact reference before I can pick this up from you.`,
      nextSystemId: "knowledge_base",
    };
  }

  if (available.has("search_knowledge_base")) {
    return {
      speaker: "Jules",
      text: `${prefix}the scanner alert needs its own approved reference. Yesterday’s familiar alert is not evidence about today’s source or time window.`,
      nextSystemId: "knowledge_base",
    };
  }

  if (available.has("document_ticket")) {
    return {
      speaker: "Jules",
      text: `${prefix}the case is ready for your ticket notes. I can continue from a named source and an open question; “looked into it” leaves me starting over.`,
      nextSystemId: "ticket_queue",
    };
  }

  if (available.has("inspect_login_context")) {
    return {
      speaker: "Jules",
      text: `${prefix}the login context is still unfinished. When Finance interrupts us, I leave a question beside the source so an unfinished check does not become an assumed fact.`,
      nextSystemId: "alert_dashboard",
    };
  }

  if (available.has("inspect_account_history")) {
    return {
      speaker: "Jules",
      text: `${prefix}the account history still needs context. An earlier pattern gives us a comparison point, not proof about this session.`,
      nextSystemId: "alert_dashboard",
    };
  }

  if (available.has("review_alert")) {
    return {
      speaker: "Jules",
      text: `${prefix}the alert is waiting. I would rather hear what does not line up than a confident answer from one clue.`,
      nextSystemId: "alert_dashboard",
    };
  }

  if (available.has("read_handoff")) {
    return {
      speaker: "Jules",
      text: `${prefix}read the shift handoff when you get in. The previous analyst left unfinished work; I need to know what you are taking over.`,
      nextSystemId: "email",
    };
  }

  if (available.has("escalate_alert") || available.has("dismiss_alert")) {
    return {
      speaker: "Jules",
      text: `${prefix}the case is at a decision point. A review request and a closure leave different work for me. Keep what you checked and what remains unresolved together.`,
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
          ? "Same rhythm: monitor, leave short notes, handle interruptions. The useful question is what the next person will need from you."
          : "Morning. We monitor, compare records, and leave notes another person can use. Interruptions are normal. If you take the login alert, leave me the question you have not answered yet.",
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
    case "team_context": {
      const receipt = state.teamMessages?.findLast(
        (m) => m.actionId === "submit_shift_handoff" && m.author !== "player",
      );
      if (receipt)
        return {
          speaker: "Jules",
          text: `The next shift replied: ${receipt.body}`,
        };
      const consultation = state.workplace.julesConsultations?.at(-1);
      const ticket =
        consultation &&
        state.structuredTickets?.[`ticket-${consultation.eventId}`];
      if (ticket)
        return {
          speaker: "Jules",
          text: `Following up on the case we discussed: your saved ticket has ${String(ticket.sourceArtifactIds?.length ?? 0)} source references. ${ticket.uncertainty ? `I will carry this question forward: ${ticket.uncertainty}` : "I still need the unresolved question to carry forward."}`,
          nextSystemId: "ticket_queue",
        };
      return {
        speaker: "Jules",
        text: repeated
          ? "Peer view: I can pick up a named source and an unresolved question. Morgan owns routing decisions. If your note changes after review, leave the correction alongside the original."
          : "Morgan handles routing; I help carry unfinished work between shifts. Tell me which source you compared and what still needs an owner. Sounding certain does not make a handoff usable.",
      };
    }
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
