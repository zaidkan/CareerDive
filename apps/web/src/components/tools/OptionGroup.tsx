import { useState } from "react";
import type { ClientArtifact } from "@sim/schemas";
import { ArtifactDetail } from "../artifacts.js";
import { ArtifactOpenButton } from "./ArtifactOpenButton.js";

/** Shared native selections. Selecting never submits a simulation action. */
export function OptionGroup({
  prompt,
  options,
  selected,
  onChange,
  pending,
  onOpenArtifact,
  sourceTitles = {},
  artifacts = [],
}: {
  prompt: string;
  options: Array<{
    id: string;
    label: string;
    sourceArtifactIds?: string[];
    disabled?: boolean;
  }>;
  selected: string[];
  onChange: (ids: string[]) => void;
  pending: boolean;
  onOpenArtifact?: ((id: string) => Promise<unknown>) | undefined;
  sourceTitles?: Record<string, string>;
  artifacts?: ClientArtifact[];
}) {
  const [openId, setOpenId] = useState<string>();
  return (
    <fieldset className="reasoning-group" disabled={pending}>
      <legend>{prompt}</legend>
      <p className="selection-help">
        Select all statements you want to include. Select again to remove.
      </p>
      {options.map((option) => (
        <div key={option.id} className="reasoning-option">
          <label data-selected={selected.includes(option.id) || undefined}>
            <input
              type="checkbox"
              data-option-id={option.id}
              checked={selected.includes(option.id)}
              disabled={pending || option.disabled}
              onChange={() => {
                onChange(
                  selected.includes(option.id)
                    ? selected.filter((id) => id !== option.id)
                    : [...selected, option.id],
                );
              }}
            />
            <span>{option.label}</span>
          </label>
          {option.disabled ? (
            <small>Open a source below to make this record available.</small>
          ) : null}
          {option.sourceArtifactIds?.map((id) => (
            <ArtifactOpenButton
              key={id}
              artifactId={id}
              label={`Open source: ${sourceTitles[id] ?? id}`}
              onOpenArtifact={
                onOpenArtifact
                  ? async (id) => {
                      setOpenId(id);
                      return onOpenArtifact(id);
                    }
                  : undefined
              }
            />
          ))}
        </div>
      ))}
      {openId && artifacts.some((a) => a.id === openId) ? (
        <div className="option-source-reader">
          <ArtifactDetail
            artifact={artifacts.find((a) => a.id === openId)}
            focus
            onOpenArtifact={onOpenArtifact}
          />
        </div>
      ) : null}
      <button
        type="button"
        disabled={pending || !selected.length}
        onClick={() => {
          onChange([]);
        }}
      >
        Clear selections
      </button>
    </fieldset>
  );
}
