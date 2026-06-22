SELECT
  date_trunc('day', created_at) AS day,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms) AS median_latency_ms,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency_ms,
  avg(cost_usd) AS average_cost_per_turn,
  sum(cost_usd) AS total_cost,
  avg((cache_hit)::int) AS cache_hit_rate,
  avg((deep_validation_used)::int) AS deep_validation_rate,
  avg((safety_result <> 'allowed')::int) AS safety_block_rate
FROM telemetry
GROUP BY 1
ORDER BY 1 DESC;

SELECT
  session_id,
  sum(cost_usd) AS session_cost,
  count(*) FILTER (WHERE safety_result = 'blocked_valid') AS blocked_valid_turns
FROM telemetry
GROUP BY session_id
ORDER BY session_cost DESC;
