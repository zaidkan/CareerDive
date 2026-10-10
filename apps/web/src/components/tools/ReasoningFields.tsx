import type {
  ClientArtifact,
  ReasoningGroup,
  ReasoningSelection,
} from "@sim/schemas";
import { OptionGroup } from "./OptionGroup.js";

export function ReasoningFields({
  groups,
  selected,
  onChange,
  onOpenArtifact,
  pending,
  sourceTitles,
  artifacts,
}: {
  groups: ReasoningGroup[];
  selected: ReasoningSelection;
  onChange: (value: ReasoningSelection) => void;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  pending: boolean;
  sourceTitles?: Record<string, string>;
  artifacts?: ClientArtifact[];
}) {
  return (
    <>
      {groups
        .filter((g) => g.options.length)
        .map((group) => (
          <OptionGroup
            key={group.id}
            prompt={group.prompt}
            options={group.options.map((o) => ({
              ...o,
              disabled:
                o.sourceArtifactIds.length > 0 && !o.inspectedSourceIds.length,
            }))}
            selected={selected[group.id]}
            pending={pending}
            onOpenArtifact={onOpenArtifact}
            {...(artifacts ? { artifacts } : {})}
            {...(sourceTitles ? { sourceTitles } : {})}
            onChange={(ids) => {
              onChange({ ...selected, [group.id]: ids });
            }}
          />
        ))}
    </>
  );
}
