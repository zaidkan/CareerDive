CREATE TABLE IF NOT EXISTS career_requests (
  requester_key uuid NOT NULL,
  career_id text NOT NULL CHECK (career_id IN (
    'registered-nurse', 'mechanical-engineer', 'electrician', 'lawyer-attorney'
  )),
  requested_at timestamptz NOT NULL DEFAULT now(),
  unrequested_at timestamptz,
  last_action_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (requester_key, career_id)
);

CREATE INDEX IF NOT EXISTS career_requests_career_idx ON career_requests (career_id);

ALTER TABLE career_requests ENABLE ROW LEVEL SECURITY;
-- No client policies: only the server's privileged database connection and
-- operators can inspect rows. Public routes expose only the caller's state.
