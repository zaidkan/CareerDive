/**
 * Public contract for `@sim/server`.
 *
 * This module is a barrel only: it re-exports the surface that `main.ts` and
 * the test suite consume. Layers are listed bottom-up (domain, policy,
 * repository, transport) and imports must never flow back down that list —
 * persistence in particular imports `domain/` and `repository/` directly
 * rather than this file.
 */
export type { AppContext } from "./domain/session.js";
export {
  DEFAULT_JURISDICTION_POLICIES,
  resolveConsentRequirement,
  type JurisdictionPolicy,
} from "./policy/jurisdiction.js";
export type { SharingGrant, StoredSession } from "./domain/session.js";
export type { SimulationRepository } from "./repository/types.js";
export { InMemoryRepository } from "./repository/in-memory.js";
export { createAppRouter, type AppRouter } from "./trpc/router.js";
