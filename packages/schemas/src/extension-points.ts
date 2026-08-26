/**
 * Declared extension seams for the simulation platform.
 *
 * `career-sim-build-spec.md` ("Extension points (the interfaces that make this
 * expandable)") requires that every place the system is meant to grow is a
 * named interface, so that adding a career, a system, a rhythm, a mode, a
 * provider, or a safety check means implementing an interface rather than
 * editing the core:
 *
 * - `SystemModule` — a reusable professional system (inbox, dashboard, ticket
 *   queue); one implementation, configured per career.
 * - `ViewAdapter` — a front-end mode (spatial, accessible, and future modes)
 *   over the shared `SimulationClient`. See also the spec's rendering-model
 *   section, where the R3F shell is described as "just another `ViewAdapter`".
 * - `SafetyCheck` — a pluggable check that runs in safety Layer A or B.
 * - `EvidenceInterpreter` — turns typed `EvidenceSignal`s into a confidence
 *   level and statement for the debrief.
 * - `Cache` — the seam behind "Caching: start in-process, design for Redis":
 *   deterministic responses and pre-generated NPC lines sit behind this
 *   interface with an in-memory implementation first, swappable for Redis once
 *   a second server instance exists.
 *
 * Nothing in the repo implements these yet. They are intentionally kept here as
 * the published contract so the first implementation of each seam does not have
 * to invent its own shape.
 */
import type { AvailableAction, SimulationActionId } from "./actions.js";
import type { ConfidenceLevel, EvidenceSignal } from "./assessment.js";
import type { ClientView } from "./client-view.js";
import type { SafetyResult } from "./safety.js";
import type { WorldState } from "./world.js";

export interface SystemModule {
  id: string;
  availableActions(state: WorldState): AvailableAction[];
}

export interface ViewAdapter {
  id: string;
  actionIds(view: ClientView): SimulationActionId[];
}

export interface SafetyCheck {
  id: string;
  run(input: string): Promise<SafetyResult> | SafetyResult;
}

export interface EvidenceInterpreter {
  interpret(signals: EvidenceSignal[]): {
    confidence: ConfidenceLevel;
    statement: string;
  };
}

export interface Cache {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
}
