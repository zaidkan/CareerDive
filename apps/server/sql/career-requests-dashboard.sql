-- Run with operator database access. Never expose aggregate through public API.
SELECT career_id,
  count(*) FILTER (WHERE unrequested_at IS NULL) AS active_requests,
  count(*) AS ever_requests,
  count(*) FILTER (WHERE unrequested_at IS NOT NULL) AS unrequested
FROM career_requests
GROUP BY career_id
ORDER BY career_id;
