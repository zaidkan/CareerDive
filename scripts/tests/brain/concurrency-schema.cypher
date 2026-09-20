// BrainV2 T4/T5 concurrency schema (SYNTHETIC harness only).
// Extends the production-parity snapshot WITHOUT touching it: these primitives
// are net-new to BrainV2 and live only on the disposable instance.
//
// T4: uniqueness constraint on Operation.op_id is part of the idempotency gate
//     (serializes concurrent first-writers of the same op_id). payload_sha256
//     is a SEPARATE property, never the identity.
// T5: uniqueness constraint on TaskClaim.task_id is the fail-closed atom for
//     the single-statement MERGE ... ON CREATE dispatch claim.
// T5 CAS: Counter.name / CounterLock.name MUST be unique. Without them, two
//     concurrent MERGE (n:Counter {name}) can both take the create path and
//     mint duplicates (observed: 8 Counter + 8 CounterLock nodes for one name,
//     and 24 increments landing on a wildly off target). The CounterLock unique
//     node is the serialization point for compare-and-set increments.
CREATE CONSTRAINT operation_op_id IF NOT EXISTS FOR (n:Operation) REQUIRE n.op_id IS UNIQUE;
CREATE CONSTRAINT task_claim_task_id IF NOT EXISTS FOR (n:TaskClaim) REQUIRE n.task_id IS UNIQUE;
CREATE CONSTRAINT counter_name IF NOT EXISTS FOR (n:Counter) REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT counter_lock_name IF NOT EXISTS FOR (n:CounterLock) REQUIRE n.name IS UNIQUE;