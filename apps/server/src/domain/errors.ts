/**
 * Transport-agnostic domain errors.
 *
 * Nothing in this module may import a transport concern such as `TRPCError`.
 * `trpc/core.ts` owns the single mapping from `NotFoundError` to an HTTP/tRPC
 * status, so persistence and domain code can stay unaware of the protocol.
 */

export abstract class NotFoundError extends Error {}

export class SessionNotFoundError extends NotFoundError {
  constructor() {
    super("Session not found");
    this.name = "SessionNotFoundError";
  }
}

export class GrantNotFoundError extends NotFoundError {
  constructor() {
    super("Grant not found");
    this.name = "GrantNotFoundError";
  }
}

export class EvidenceNotFoundError extends NotFoundError {
  constructor() {
    super("Evidence not found");
    this.name = "EvidenceNotFoundError";
  }
}
