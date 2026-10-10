/** The same public keyword lookup in the tool and reducer; never searches hidden bodies. */
export function matchingGuides<
  T extends {
    systemId: string;
    title: string;
    summary: string;
    searchableText?: string | undefined;
    eventIds: string[];
  },
>(artifacts: T[], query: string, eventId?: string): T[] {
  const normalized = query.trim().toLowerCase();
  return artifacts.filter(
    (a) =>
      a.systemId === "knowledge_base" &&
      (!eventId || a.eventIds.includes(eventId)) &&
      (!normalized ||
        `${a.title} ${a.summary} ${a.searchableText ?? ""}`
          .toLowerCase()
          .includes(normalized)),
  );
}
