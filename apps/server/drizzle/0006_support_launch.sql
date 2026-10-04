CREATE TABLE support_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  create_request_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('Starting a shift', 'Workplace', 'Accessibility', 'Other')),
  description text NOT NULL CHECK (length(description) BETWEEN 1 AND 5000),
  contact text NOT NULL DEFAULT '' CHECK (length(contact) <= 254),
  diagnostics jsonb CHECK (octet_length(diagnostics::text) <= 2048),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, create_request_id)
);
CREATE INDEX support_reports_owner_time_idx ON support_reports (owner_id, created_at);
ALTER TABLE support_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON support_reports FROM PUBLIC, anon, authenticated;

CREATE TABLE launch_events (
  event_id uuid PRIMARY KEY,
  event_name text NOT NULL CHECK (event_name IN (
    'landing', 'career_viewed', 'start_initiated', 'shift_started',
    'meaningful_investigation', 'decision', 'handoff', 'shift_completed',
    'debrief_viewed', 'feedback_report'
  )),
  career_id text CHECK (career_id IN ('cybersecurity-analyst', 'registered-nurse', 'mechanical-engineer', 'electrician', 'lawyer-attorney')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE launch_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON launch_events FROM PUBLIC, anon, authenticated;
-- Private operator-only tables, intentionally no browser policies.
