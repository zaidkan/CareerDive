# BrainV2 T7 — provenance and stale candidates

Status: implemented on `worker/brainv2-t7-provenance` (harness scope).

Every new memory carries four explicit provenance fields: `verified`,
`commit_sha`, `branch`, and `agent_id`. The allowed `scope` values are
`PROJECT_ARCHITECTURE`, `BRANCH_OBSERVATION`, `HISTORICAL_DECISION`, and
`TASK_STATUS`.

The `oc-brain` fact writer stores these fields in the SDK fact metadata JSON on
both the normal SDK path and the idempotent `op_id` path. Superseding a fact
stamps the replacement the same way. `oc-memory` stores them as first-class
Fact properties for coordination writes and supersedes. Defaults come from the
trusted gateway process Git checkout (`HEAD`, current branch) and
`OC_BRAIN_AGENT_ID`; callers may provide explicit values.

Read serialization keeps every result. If a non-architecture fact's
`commit_sha` is not an ancestor of the current checkout's `HEAD`, the result
gets `flags: ["STALENESS_CANDIDATE"]` and metadata
`staleness: "STALENESS_CANDIDATE"`. This is a review signal, never a false
classification or a filter. Architecture-scope memory is returned without
this branch reachability flag.

`oc-dispatch inspect_completion` records `resulting_head` and `new_commit`,
but only promotes a worker completion when `new_commit` exists. A COMPLETE
claim with no new commit becomes `BLOCKED` with
`completion_requires_new_commit`, preserving the run for coordinator review.

Read-path changes are localized to `_fact_to_dict`, which is used by
`memory_get_facts`, `memory_search_facts`, and the fact branch of
`memory_search`; `_annotate_staleness` performs the shared check. T8 should
layer retrieval fusion around these serializers rather than replacing them.

Verification: `scripts/tests/brain/provenance.test.sh` passes 3/3 on the
disposable Neo4j 5.26 harness. The full B1 suite must be run before integration.
