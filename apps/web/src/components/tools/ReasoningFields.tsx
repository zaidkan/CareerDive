import type { ReasoningGroup, ReasoningSelection } from "@sim/schemas";

export function ReasoningFields({
  groups,
  selected,
  onChange,
  onOpenArtifact,
  pending,
  sourceTitles,
}: {
  groups: ReasoningGroup[];
  selected: ReasoningSelection;
  onChange: (value: ReasoningSelection) => void;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  pending: boolean;
  sourceTitles?: Record<string, string>;
}) {
  return (
    <>
      {groups
        .filter((g) => g.options.length)
        .map((group) => (
          <fieldset key={group.id}>
            <legend>{group.prompt}</legend>
            {group.options.map((option) => (
              <div key={option.id} className="reasoning-option">
                <label>
                  <input
                    type="checkbox"
                    data-option-id={option.id}
                    checked={selected[group.id].includes(option.id)}
                    disabled={
                      pending ||
                      (option.sourceArtifactIds.length > 0 &&
                        !option.inspectedSourceIds.length)
                    }
                    onChange={() => {
                      onChange({
                        ...selected,
                        [group.id]: selected[group.id].includes(option.id)
                          ? selected[group.id].filter((id) => id !== option.id)
                          : [...selected[group.id], option.id],
                      });
                    }}
                  />
                  {option.label}
                </label>
                {option.sourceArtifactIds.map((source) => (
                  <button
                    key={source}
                    data-source-id={source}
                    type="button"
                    disabled={pending || !onOpenArtifact}
                    onClick={() => {
                      void onOpenArtifact?.(source).catch(() => {});
                    }}
                  >
                    {option.inspectedSourceIds.length
                      ? "Opened source"
                      : "Open source"}
                    : {sourceTitles?.[source] ?? source}
                  </button>
                ))}
              </div>
            ))}
          </fieldset>
        ))}
    </>
  );
}
