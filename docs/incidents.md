# Incident Playbooks

## LLM provider outage

1. Confirm deterministic actions remain available.
2. Verify all open dialogue uses approved fallback.
3. Disable open-ended dialogue feature flag if failures persist.
4. Review telemetry; never replay unvalidated provider output.

## Restricted-fact leakage

1. Disable affected NPC/pack dialogue immediately.
2. Preserve redacted trace IDs, model role, pack version, and validator result.
3. Delete exposed raw text under retention policy.
4. Add adversarial regression case before re-enabling.

## Harmful or unsupported output

1. Remove output from user-visible history where legally and technically permitted.
2. Route safety concern through approved escalation procedure.
3. Identify failed layer and add invariant test.
4. Narrow generation scope until reliability threshold passes.

## Data-access failure

1. Revoke affected sharing grants and disable related endpoint.
2. Preserve database audit records.
3. Verify RLS policies in staging and production.
4. Notify affected users under applicable policy and law.

## Backup and restore

1. Use Supabase point-in-time recovery or latest encrypted backup.
2. Restore into isolated staging project.
3. Verify session, action-log, evidence, reflection, and grant row counts.
4. Replay sampled action logs and compare canonical state.
