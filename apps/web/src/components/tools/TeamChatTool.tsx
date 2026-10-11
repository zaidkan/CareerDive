import { InitialHandoff } from "./InitialHandoff.js";
import { managerRecap } from "@sim/core";
import { useRef, useState } from "react";
import {
  DialogueLine,
  type DialogueController,
} from "../../world/dialogue/DialogueLine.js";
import { AudioToggle } from "../../world/dialogue/AudioToggle.js";
import { MORGAN_CHOICES } from "../../world/dialogue/MorganDialogue.js";
import { unlockDialogueAudio } from "../../world/dialogue/audio.js";
import type { AvailableAction, ClientView } from "@sim/schemas";
import { useOptionalOsSession } from "../../world/deskOs/osSession.js";
import {
  MORGAN_INTRO_BODY,
  MORGAN_INTRO_LABEL,
} from "../../world/deskOs/os/morganIntro.js";
import type { MutationState } from "../../useMutationCoordinator.js";
import { ArtifactDetail } from "../artifacts.js";

/** Both renderers use only canonically observed messages and public guidance. */
export function TeamChatTool({
  view,
  onOpenArtifact,
  mutationState,
  actions = [],
  onAction,
  eventId,
}: {
  view: ClientView;
  eventId?: string | undefined;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  mutationState?: MutationState;
  actions?: AvailableAction[];
  onAction?: (action: AvailableAction, freeText?: string) => void;
}) {
  const [recap, setRecap] = useState<{
    eventId: string;
    body: string;
    question: string;
  }>();
  function consult(action: AvailableAction, question: string) {
    const body = managerRecap(view, action.eventId, question);
    if (body) setRecap({ eventId: action.eventId, body, question });
    else {
      setRecap(undefined);
      onAction?.(action, question);
    }
  }
  const osSession = useOptionalOsSession();
  const morganIntroSeen = osSession?.state.morganIntroSeen ?? false;
  const chatActions = actions.filter(
    ({ id }) => id === "ask_manager" || id === "acknowledge_handoff",
  );
  const messages = view.artifacts.filter(
    (a) =>
      a.systemId === "team_chat" && (!eventId || a.eventIds.includes(eventId)),
  );
  const latestReply = view.teamMessages?.findLast(
    (message) =>
      message.author !== "player" && (!eventId || message.eventId === eventId),
  );
  const dialogueRef = useRef<DialogueController>(null);
  const mountedReplyId = useRef(latestReply?.id);
  return (
    <>
      <article className="team-chat-thread" aria-label="Morgan message thread">
        {morganIntroSeen ? (
          <p className="team-chat-intro" data-testid="morgan-intro">
            <strong>{MORGAN_INTRO_LABEL}: </strong>
            {MORGAN_INTRO_BODY}
          </p>
        ) : null}
        {messages.map((artifact) => (
          <ArtifactDetail
            key={artifact.id}
            artifact={artifact}
            onOpenArtifact={onOpenArtifact}
            mutationState={mutationState}
          />
        ))}
      </article>
      {(view.teamMessages?.length ?? 0) > 0 ? (
        <ol aria-label="Team conversation">
          {view.teamMessages
            ?.filter((message) => !eventId || message.eventId === eventId)
            .map((message) => (
              <li key={message.id}>
                <strong>
                  {
                    (
                      {
                        player: "You",
                        morgan: "Morgan · your manager",
                        reviewer: "Reviewer",
                        employee: "Employee",
                      } as const
                    )[message.author]
                  }{" "}
                  ·{" "}
                  {view.events.find(({ id }) => id === message.eventId)
                    ?.title ?? message.eventId}
                  :
                </strong>{" "}
                {message.actionId === "submit_shift_handoff" ? (
                  <details>
                    <summary>
                      Recorded handoff · sources and continuation
                    </summary>
                    <pre className="artifact-body">{message.body}</pre>
                  </details>
                ) : message.id === latestReply?.id ? (
                  <DialogueLine
                    controller={dialogueRef}
                    key={message.id}
                    text={message.body}
                    animate={message.id !== mountedReplyId.current}
                    onAdvance={() => {
                      document
                        .querySelector<HTMLButtonElement>(
                          "[data-morgan-choice]",
                        )
                        ?.focus();
                    }}
                  />
                ) : (
                  message.body
                )}
              </li>
            ))}
        </ol>
      ) : null}
      {recap &&
      (!eventId || recap.eventId === eventId) &&
      managerRecap(view, recap.eventId, recap.question) === recap.body ? (
        <aside role="status" aria-label="Morgan recap">
          <strong>Recap · no time or energy spent</strong>
          <p>{recap.body}</p>
        </aside>
      ) : null}
      {latestReply || chatActions.some((a) => a.id === "ask_manager") ? (
        <AudioToggle />
      ) : null}
      {chatActions.map((action) => {
        const key = `${action.id}:${action.eventId}`;
        if (action.id === "ask_manager")
          return (
            <section
              key={key}
              className="morgan-case-consultation"
              aria-label={`Discuss ${view.events.find((e) => e.id === action.eventId)?.title ?? action.eventId} with Morgan`}
            >
              <h4>
                Your manager ·{" "}
                {view.events.find((e) => e.id === action.eventId)?.title ??
                  action.eventId}
              </h4>
              <div className="jules-dialogue-topics">
                {MORGAN_CHOICES.map((choice) => (
                  <button
                    data-morgan-choice
                    data-action-id={action.id}
                    data-event-id={action.eventId}
                    type="button"
                    key={choice}
                    disabled={Boolean(mutationState?.pendingKey) || !onAction}
                    onClick={() => {
                      if (dialogueRef.current?.isRevealing()) {
                        dialogueRef.current.finish();
                        return;
                      }
                      unlockDialogueAudio();
                      consult(action, choice);
                    }}
                  >
                    {choice}
                  </button>
                ))}
              </div>

            </section>
          );
        return (
          <InitialHandoff
            key={key}
            view={view}
            action={action}
            onAction={onAction}
            pending={Boolean(mutationState?.pendingKey)}
          />
        );
      })}
    </>
  );
}
