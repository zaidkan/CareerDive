ALTER TABLE simulation_sessions ADD COLUMN revision integer NOT NULL DEFAULT 0;
CREATE TABLE launch_event_limits (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  event_count integer NOT NULL DEFAULT 0
);
ALTER TABLE launch_event_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON launch_event_limits FROM PUBLIC, anon, authenticated;
