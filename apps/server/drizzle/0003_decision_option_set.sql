ALTER TABLE decision_reviews
  ADD COLUMN IF NOT EXISTS option_set_key text NOT NULL DEFAULT '';

DROP INDEX IF EXISTS decision_reviews_cohort_idx;
CREATE INDEX decision_reviews_cohort_idx
  ON decision_reviews (career_id, career_version, decision_id, option_set_key, choice_id);
