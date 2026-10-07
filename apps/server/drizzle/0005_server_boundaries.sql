ALTER TABLE simulation_sessions ADD COLUMN create_request_id uuid;
CREATE UNIQUE INDEX simulation_sessions_owner_create_request_idx
  ON simulation_sessions (owner_id, create_request_id);

-- Server owns authoritative state. Preserve existing SELECT sharing rules,
-- but remove every browser write privilege, including grants inherited from PUBLIC.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'guardian_relationships', 'simulation_sessions', 'action_log',
    'state_snapshots', 'evidence_signals', 'reflections', 'interpretations',
    'sharing_grants', 'pathway_records', 'telemetry', 'consent_records',
    'deletion_jobs', 'decision_reviews', 'career_requests'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
  END LOOP;
END $$;
-- Defense in depth: replace owner-all policies on authoritative tables.
DROP POLICY simulation_sessions_owner_all ON simulation_sessions;
CREATE POLICY simulation_sessions_owner_select ON simulation_sessions
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY action_log_owner_all ON action_log;
CREATE POLICY action_log_owner_select ON action_log
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY state_snapshots_owner_all ON state_snapshots;
CREATE POLICY state_snapshots_owner_select ON state_snapshots
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
DROP POLICY evidence_signals_owner_all ON evidence_signals;
CREATE POLICY evidence_signals_owner_select ON evidence_signals
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
-- No browser table grants. All product reads/writes go through verified API.
