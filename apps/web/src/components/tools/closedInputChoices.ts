import {
  AlertStateSchema,
  DeviceAssignmentStateSchema,
  VpnStatusSchema,
  type ClientView,
  type DatasetId,
} from "@sim/schemas";

export const NOTE_CHOICES = [
  "Compare IDs",
  "Check the device label",
  "Record what is known and unknown",
  "Prepare the next check",
] as const;

/** Only already authorized previews, opened artifacts, and returned rows supply identifiers. */
export function recordFilterChoices(view: ClientView, field: string, datasetId: DatasetId): string[] {
  if (field === "assignmentState") return DeviceAssignmentStateSchema.options;
  if (field === "state") return AlertStateSchema.options;
  if (field === "status" && datasetId === "vpn") return VpnStatusSchema.options;
  const values = view.queryResults.flatMap(result => result.records.flatMap(record => {
    const value: unknown = (record as Record<string, unknown>)[field];
    return typeof value === "string" ? [value] : [];
  }));
  const text = view.artifacts.map(a => [a.title, a.summary, a.observed ? a.body : "", ...(a.lookupKeys ?? [])].join(" ")).join("\n");
  const patterns: Record<string, RegExp> = {
    user: /\b[\w.+-]+@[\w.-]+\.[a-z]+\b/gi,
    assignedUser: /\b[\w.+-]+@[\w.-]+\.[a-z]+\b/gi,
    account: /\b[\w.+-]+@[\w.-]+\.[a-z]+\b/gi,
    sourceIp: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    sessionId: /\bS-\d+\b/g,
    vpnId: /\bV-\d+\b/g,
    alertId: /\bA-\d+\b/g,
    scannerId: /\bvuln-scan-[\w-]+\b/g,
    runId: /\b(?:SCAN|RUN)-[\w-]+\b/g,
  };
  const pattern = patterns[field];
  if (pattern) values.push(...(text.match(pattern) ?? []));
  if (field === "deviceLabel") {
    values.push(...view.artifacts.flatMap(a => a.lookupKeys ?? []));
    values.push(...(text.match(/\b(?:unknown-laptop|corp-macbook|corp-laptop|corp-phone|phone|loaner-pool)-[\w-]+\b/g) ?? []));
  }
  return [...new Set(values)].filter(Boolean).sort();
}
