CREATE TABLE IF NOT EXISTS decision_reviews (
  session_id uuid NOT NULL REFERENCES simulation_sessions(id) ON DELETE CASCADE,
  career_id text NOT NULL,
  career_version text NOT NULL,
  decision_id text NOT NULL,
  choice_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, decision_id)
);

CREATE INDEX IF NOT EXISTS decision_reviews_cohort_idx
  ON decision_reviews (career_id, career_version, decision_id, choice_id);

ALTER TABLE decision_reviews ENABLE ROW LEVEL SECURITY;
-- No client policy: only the privileged simulation server reads aggregate rows.
