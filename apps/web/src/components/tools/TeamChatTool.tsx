import type { ClientView } from "@sim/schemas";
import type { MutationState } from "../../useMutationCoordinator.js";
import { ArtifactDetail } from "../artifacts.js";

/** Both renderers use only canonically observed messages and public guidance. */
export function TeamChatTool({ view, onOpenArtifact, mutationState }: {
  view: ClientView;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  mutationState?: MutationState;
}) {
  const messages = view.artifacts.filter(({ systemId }) => systemId === "team_chat");
  const guidance = view.operationalMessages.filter((message) => message.startsWith("Morgan "));
  return <>
    <article className="team-chat-thread" aria-label="Morgan message thread">
      {messages.map((artifact) => <ArtifactDetail key={artifact.id} artifact={artifact} onOpenArtifact={onOpenArtifact} mutationState={mutationState} />)}
    </article>
    {guidance.length > 0 ? <aside className="manager-guidance" aria-label="Morgan guidance">
      <h4>Morgan’s guidance</h4>
      {guidance.map((message) => <p key={message}>{message}</p>)}
    </aside> : null}
  </>;
}
