// BrainV2 T4/T5 concurrency-schema prerequisite (SYNTHETIC harness only).
// Idempotent (IF NOT EXISTS). Must be applied BEFORE idempotency/concurrency
// tests. A missing constraint is a SETUP/INFRA failure, not an app-test failure.
CREATE CONSTRAINT operation_op_id    IF NOT EXISTS FOR (n:Operation)   REQUIRE n.op_id   IS UNIQUE;
CREATE CONSTRAINT task_claim_task_id IF NOT EXISTS FOR (n:TaskClaim)   REQUIRE n.task_id IS UNIQUE;
CREATE CONSTRAINT counter_name       IF NOT EXISTS FOR (n:Counter)     REQUIRE n.name    IS UNIQUE;
CREATE CONSTRAINT counter_lock_name  IF NOT EXISTS FOR (n:CounterLock) REQUIRE n.name    IS UNIQUE;
