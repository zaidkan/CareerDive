import { allStatusGroups } from "@sim/core";
import type { ActionLogEntry, Debrief, WorldState } from "@sim/schemas";
type StatusReview = NonNullable<
  NonNullable<Debrief["decisionReview"]>["statusReview"]
>;
export function statusReview(
  state: WorldState,
  log: ActionLogEntry[],
): StatusReview | undefined {
  const sends = log.filter(
    (e) =>
      e.interaction.type === "action" &&
      e.interaction.action.id === "send_status_update" &&
      e.interaction.action.ticketPayload?.statusOptionIds !== undefined,
  );
  const first = sends[0];
  if (first?.interaction.type !== "action") return undefined;
  const ids = first.interaction.action.ticketPayload?.statusOptionIds ?? [];
  const groups = allStatusGroups(state);
  const selected = groups.flatMap((g) =>
    g.options.filter((o) => ids.includes(o.id)),
  );
  const contradictions: Record<string, string> = {
    "confirmed-person":
      "A source address and grouped checks do not identify who controlled S-0741.",
    "nothing-accessed":
      "The export collected no file/mail fields; missing coverage cannot establish no access.",
    "close-on-location":
      "A displayed city cannot establish S-0741's route or authorize a safe closure.",
  };
  const gaps = [
    ...groups
      .filter((g) => !g.options.some((o) => ids.includes(o.id)))
      .map((g) => `No claim sent for ${g.title.toLowerCase()}.`),
    ...ids.flatMap((id) => (contradictions[id] ? [contradictions[id]] : [])),
  ];
  const weak = selected.find((o) => contradictions[o.id]);
  const example = weak ?? selected[0];
  const source = example?.sourceId
    ? state.artifacts[example.sourceId]
    : undefined;
  return {
    message: selected.map((o) => o.label).join(" ") || "No claims selected.",
    outcomeLabel: gaps.length
      ? "needs_more_evidence"
      : ids.includes("confirmed-source")
        ? "partially_supported"
        : "supported",
    gaps: [
      ...gaps,
      ...(ids.includes("confirmed-source")
        ? [
            "The source address was carried, but the failed-then-created sequence was omitted.",
          ]
        : []),
    ],
    corrections: sends.slice(1).map((e) =>
      e.interaction.type === "action"
        ? groups
            .flatMap((g) =>
              g.options.filter(
                (o) =>
                  e.interaction.type === "action" &&
                  e.interaction.action.ticketPayload?.statusOptionIds?.includes(
                    o.id,
                  ),
              ),
            )
            .map((o) => o.label)
            .join(" ") || "No claims selected."
        : "",
    ),
    ...(example && source?.body.includes(example.excerpt ?? "")
      ? {
          claim: example.label,
          excerpt: example.excerpt,
          sourceTitle: source.title,
        }
      : {}),
    nextCheck: weak
      ? "Correct the unsupported claim using the exact session records and collection limit; carry the actual pending recipient."
      : "Keep the memo's recorded questions, sources and recipient available for the next analyst.",
  };
}
