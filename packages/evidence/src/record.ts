import { EvidenceSignalSchema, type EvidenceSignal } from "@sim/schemas";

export function recordEvidence(signal: EvidenceSignal): EvidenceSignal {
  return EvidenceSignalSchema.parse(signal);
}
