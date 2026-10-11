# Incident Playbooks

## Authentication or database outage

1. Confirm which service is unavailable and check readiness.
2. Preserve saved session ownership; do not create replacement identities.
3. Restore service connectivity and retry the affected request.
4. Verify session ownership and resume behavior after recovery.

## Restricted-fact leakage

1. Disable affected NPC/pack dialogue immediately.
2. Preserve redacted trace IDs, pack version, and validation result.
3. Delete exposed raw text under retention policy.
4. Add adversarial regression case before re-enabling.

## Harmful or unsupported output

1. Remove output from user-visible history where legally and technically permitted.
2. Route safety concern through approved escalation procedure.
3. Identify failed layer and add invariant test.
4. Narrow affected content until reliability checks pass.

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
