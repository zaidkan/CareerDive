CREATE TABLE session_write_limits (
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('session', 'reflection')),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  write_count integer NOT NULL CHECK (write_count > 0),
  PRIMARY KEY (owner_id, operation)
);
ALTER TABLE session_write_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON session_write_limits FROM PUBLIC, anon, authenticated;
