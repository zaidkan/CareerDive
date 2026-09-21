# BrainV2 recovery and restore evidence

Status: recovery design plus one tested disposable-harness drill. No production
backup, restore, migration, deployment, configuration, or network change has
been performed.

## Safety boundary

Only `brainv2-neo4j-test`, its dedicated `brainv2_test_data` volume, and
synthetic data may be destroyed by `scripts/tests/brain/recovery-drill.sh`.
Production Windows Neo4j at `100.99.119.124` is outside this procedure's
execution scope. B3, B4, and B5 require separate explicit user authorization.

Neo4j Community backup is an offline operation. A production backup therefore
requires an approved maintenance window and a controlled write outage. Decision
D2 calls for a daily backup during that agreed window and another mandatory
backup immediately before any approved migration. No production schedule or
acceptable outage duration is approved by this document.

## Tested disposable drill

Run from repository root:

```bash
scripts/tests/brain/recovery-drill.sh
```

The script refuses a production Bolt address or non-local Docker context,
requires the already-local `neo4j:5.26-community` image, and then:

1. Creates the disposable harness and applies the schema plus 49 semantic and
   2 coordination facts.
2. Records node, relationship, property, fact, index, and constraint counts.
   It hashes deterministically ordered node properties, relationships, index
   definitions, and constraint definitions.
3. Stops only the harness and runs offline `neo4j-admin database dump`.
   The dump is written to a host temporary directory, separate from the data
   volume.
4. Restarts the harness to measure the complete backup outage.
5. Destroys the harness volume to simulate total local data-volume loss.
6. Creates a fresh volume, stops its database, loads the dump offline, starts
   Neo4j, and waits for Bolt readiness.
7. Repeats every count and hash comparison, then destroys the harness.

### Measured result — 2026-09-21

Environment: local Docker Desktop, `neo4j:5.26-community`, synthetic harness.

| Measurement | Observed |
|---|---:|
| Offline dump command | 2.391 s |
| Backup write outage (stop through Bolt-ready restart) | 15.028 s |
| Offline load command | 2.316 s |
| Restore interval (loss simulation through fresh Bolt-ready database) | 32.257 s |
| Restored data loss against captured snapshot | 0 |

Pre- and post-restore state both contained 51 nodes, 0 relationships, 359 node
properties, 51 facts, 49 embedded semantic facts, 2 coordination facts, 35
indexes, and 12 constraints. Both fingerprints were:

```text
d5dc46b41aef849b45e1d7ad6323ed094e0dfec387a06e3f62a0029564fed144
```

Result: `fingerprint_match=true`, exit 0.

These numbers are observations, not production targets. The drill's recovery
point was the completed synthetic snapshot, so observed loss was zero. It does
not establish a production RPO: production RPO depends on the approved backup
frequency and writes since the last verified archive. The 32.257-second result
is a harness RTO observation only; production host provisioning, archive
transfer, larger data, service dependencies, and incident response are absent.

## Production backup procedure — requires separate authorization

Do not execute this section until the user approves a maintenance window and
the exact production change batch.

1. Name an incident/maintenance owner, verifier, rollback owner, start time,
   expected write outage, and abort threshold.
2. Record baseline Neo4j version/image digest, database names, counts, schema,
   gateway health, storage free space, and current configuration checksum.
3. Quiesce every sanctioned writer and verify no new writes arrive. Keep
   security and project-isolation checks enabled; inability to prove quiescence
   aborts the backup.
4. Stop the gateway/database according to the approved Windows service
   procedure. Record actual outage start.
5. Offline-dump both application and `system` databases with the installed
   Neo4j 5.26 tooling:

   ```text
   neo4j-admin database dump neo4j --to-path=<staging>
   neo4j-admin database dump system --to-path=<staging>
   ```

   The `system` database is required for Neo4j users/auth metadata. Never treat
   an application-only dump as complete disaster recovery.
6. Create a manifest containing archive names, sizes, SHA-256 hashes, Neo4j
   version, database counts/schema, timestamp, and operator/verifier identity.
7. Restart services, verify Bolt/gateway health and a read-only memory query,
   then record actual outage end. A failed health check remains fail-closed;
   writers do not resume.
8. Copy archives and manifest to encrypted storage on a different device/fault
   domain. Verify hashes after transfer. A dump remaining only on the Neo4j
   host is not a backup.
9. Apply approved retention and immutability controls. Restrict access because
   the application dump contains project memory and the system dump contains
   authentication material.
10. Perform a scheduled isolated restore from the copied archive. Only a
    fingerprint-verified restore marks that backup verified.

## Production restore procedure — requires separate authorization

1. Declare the incident, stop sanctioned writers, isolate the failed media,
   and preserve logs/evidence. Do not overwrite the only failed copy.
2. Select the newest independently stored archive whose manifest, SHA-256
   hashes, Neo4j version, and restore-drill status verify successfully.
3. Rebuild a clean host/runtime at the recorded Neo4j version. Restore reviewed
   `neo4j.conf`, certificates, service definitions, gateway configuration,
   firewall/Tailscale rules, plugin inventory, and file ownership from the
   separate system-configuration backup.
4. With Neo4j offline, load the `system` and application dumps using the same
   5.26 tool family and explicit overwrite approval:

   ```text
   neo4j-admin database load system --from-path=<verified-copy> --overwrite-destination=true
   neo4j-admin database load neo4j --from-path=<verified-copy> --overwrite-destination=true
   ```

5. Run the offline database consistency check supported by the installed 5.26
   distribution. Any error blocks startup and escalation continues.
6. Start Neo4j but keep writers disabled. Verify archive hashes, database and
   schema counts, deterministic fingerprint, auth/service identities, gateway
   authentication, project isolation, provenance, and retrieval parity.
7. Confirm raw production Bolt is not exposed to agent hosts and only the
   approved gateway path works. Security failure blocks recovery completion.
8. Resume traffic gradually only after owner and independent verifier sign off.
   Record actual recovery point, data loss if any, and total RTO. Preserve all
   measurements; do not substitute planned targets.

Application dumps do not recover the host itself. Complete recovery also needs
the Windows service account and secret-recovery process, gateway bearer-token
rotation procedure, protected Neo4j/gateway credentials, TLS material,
firewall/Tailscale policy, service definitions, Neo4j configuration, version
manifest, and operating instructions. Store these separately from database
archives with equivalent encryption, access control, and recovery testing.

## Monitoring and alerts

Production monitoring is not deployed by T9. Before rollout, assign owners and
alert routes for:

- missed/failed daily backup or mandatory pre-migration backup;
- archive age beyond the approved schedule, unexpected size/count drift, hash
  failure, copy failure, retention failure, or low backup/DB disk space;
- restore drill overdue or fingerprint/count mismatch;
- Neo4j/gateway unavailable after the maintenance window;
- authentication failure, project-isolation failure, raw Bolt becoming
  reachable from an agent host, or security control being disabled;
- migration/schema drift, retrieval parity failure, and sustained gateway
  degraded mode.

Every backup run must emit start/end time, outage duration, dump duration,
archive hash/size, copy verification, database/schema counts, and success or
failure. Alerts remain open until acknowledged by the named operator. Backup or
integrity uncertainty blocks migration and cutover; rollback never disables a
security or concurrency guarantee.
