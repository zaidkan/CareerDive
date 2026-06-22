CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  age_tier text NOT NULL CHECK (age_tier IN ('teen', 'adult')),
  jurisdiction text NOT NULL,
  institutional_use_allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS guardian_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'active', 'revoked')),
  permitted_categories text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS simulation_sessions (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  career_id text NOT NULL,
  session_kind text NOT NULL CHECK (session_kind IN ('tutorial', 'assessed')),
  pacing_mode text NOT NULL,
  seed integer NOT NULL,
  current_state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS action_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES simulation_sessions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  action jsonb NOT NULL,
  accepted_delta jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, sequence)
);
CREATE TABLE IF NOT EXISTS state_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES simulation_sessions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS evidence_signals (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES simulation_sessions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  dimension text NOT NULL,
  observation text NOT NULL,
  provenance jsonb NOT NULL,
  user_annotation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reflections (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES simulation_sessions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  enjoyment text NOT NULL,
  confidence text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS interpretations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_ids uuid[] NOT NULL,
  confidence text NOT NULL,
  statement text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sharing_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categories text[] NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pathway_records (
  id text PRIMARY KEY,
  career_id text NOT NULL,
  region text NOT NULL,
  jurisdiction text NOT NULL,
  payload jsonb NOT NULL,
  last_verified date NOT NULL,
  next_review date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS telemetry (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES simulation_sessions(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turn_sequence integer NOT NULL,
  interaction_kind text NOT NULL,
  model_role text,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(12, 8) NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL,
  cache_hit boolean NOT NULL DEFAULT false,
  deep_validation_used boolean NOT NULL DEFAULT false,
  safety_result text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guardian_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  jurisdiction text NOT NULL,
  consent_version text NOT NULL,
  categories text[] NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS deletion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('session', 'profile', 'account')),
  target_id text,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'complete', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE interpretations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sharing_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathway_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE deletion_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_owner_all ON profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY guardian_relationships_participant_select ON guardian_relationships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = guardian_user_id);
CREATE POLICY simulation_sessions_owner_all ON simulation_sessions
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY action_log_owner_all ON action_log
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY state_snapshots_owner_all ON state_snapshots
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY evidence_signals_owner_all ON evidence_signals
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY reflections_owner_all ON reflections
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY reflections_explicit_grant_select ON reflections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sharing_grants
      WHERE sharing_grants.owner_id = reflections.owner_id
        AND sharing_grants.recipient_id = auth.uid()
        AND 'reflections' = ANY(sharing_grants.categories)
        AND sharing_grants.revoked_at IS NULL
        AND sharing_grants.expires_at > now()
    )
  );
CREATE POLICY interpretations_owner_all ON interpretations
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY sharing_grants_owner_all ON sharing_grants
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY pathway_records_authenticated_select ON pathway_records
  FOR SELECT TO authenticated USING (true);
CREATE POLICY telemetry_owner_select ON telemetry
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY consent_records_owner_select ON consent_records
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = guardian_user_id);
CREATE POLICY deletion_jobs_owner_all ON deletion_jobs
  FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
