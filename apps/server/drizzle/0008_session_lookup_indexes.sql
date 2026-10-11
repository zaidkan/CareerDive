-- Transactional runner: apply before opening traffic, or in a maintenance window.
-- Fail fast if active writes prevent acquiring the index-build table locks.
SET LOCAL lock_timeout = '5s';
CREATE INDEX evidence_signals_session_owner_idx ON evidence_signals (session_id, owner_id);
CREATE INDEX reflections_session_owner_idx ON reflections (session_id, owner_id);
CREATE INDEX sharing_grants_active_owner_idx ON sharing_grants (owner_id, expires_at)
  WHERE revoked_at IS NULL;
