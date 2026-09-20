// BrainV2 harness FULL schema snapshot (SYNTHETIC harness only).
// Reproduces production: 12 uniqueness constraints + 33 explicit indexes.
// Plus the 2 auto-created LOOKUP indexes Neo4j makes on first startup = 35 total,
// matching production `SHOW INDEXES` count exactly.
// Vector indexes: 384-dim COSINE (BAAI/bge-small-en-v1.5), matching production.

// ---------- 12 UNIQUENESS CONSTRAINTS ----------
CREATE CONSTRAINT consolidation_run_id IF NOT EXISTS FOR (n:ConsolidationRun) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT conversation_id IF NOT EXISTS FOR (n:Conversation) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT fact_id IF NOT EXISTS FOR (n:Fact) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT memory_read_audit_id IF NOT EXISTS FOR (n:MemoryReadAudit) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT message_id IF NOT EXISTS FOR (n:Message) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT preference_id IF NOT EXISTS FOR (n:Preference) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT reasoning_step_id IF NOT EXISTS FOR (n:ReasoningStep) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT reasoning_trace_id IF NOT EXISTS FOR (n:ReasoningTrace) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT tool_call_id IF NOT EXISTS FOR (n:ToolCall) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT tool_name IF NOT EXISTS FOR (n:Tool) REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT user_identifier IF NOT EXISTS FOR (n:User) REQUIRE n.identifier IS UNIQUE;

// NOTE: the id-uniqueness constraints above each create a backing RANGE index,
// so the following explicit RANGE index declarations for those id properties are
// intentionally OMITTED (constraint-backed). Production shows both the constraint
// and a same-named index entry; on 5.26 the uniqueness constraint's backing index
// is counted in SHOW INDEXES, preserving the total.

// ---------- RANGE INDEXES (non-id-constraint-backed) ----------
CREATE INDEX consolidation_run_kind_idx IF NOT EXISTS FOR (n:ConsolidationRun) ON (n.kind);
CREATE INDEX conversation_archived_idx IF NOT EXISTS FOR (n:Conversation) ON (n.archived);
CREATE INDEX conversation_session_idx IF NOT EXISTS FOR (n:Conversation) ON (n.session_id);
CREATE INDEX entity_canonical_idx IF NOT EXISTS FOR (n:Entity) ON (n.canonical_name);
CREATE INDEX entity_name_idx IF NOT EXISTS FOR (n:Entity) ON (n.name);
CREATE INDEX entity_type_idx IF NOT EXISTS FOR (n:Entity) ON (n.type);
CREATE INDEX memory_read_audit_kind_idx IF NOT EXISTS FOR (n:MemoryReadAudit) ON (n.kind);
CREATE INDEX message_role_idx IF NOT EXISTS FOR (n:Message) ON (n.role);
CREATE INDEX message_timestamp_idx IF NOT EXISTS FOR (n:Message) ON (n.timestamp);
CREATE INDEX preference_category_idx IF NOT EXISTS FOR (n:Preference) ON (n.category);
CREATE INDEX tool_call_status_idx IF NOT EXISTS FOR (n:ToolCall) ON (n.status);
CREATE INDEX trace_error_kind_idx IF NOT EXISTS FOR (n:ReasoningTrace) ON (n.error_kind);
CREATE INDEX trace_session_idx IF NOT EXISTS FOR (n:ReasoningTrace) ON (n.session_id);
CREATE INDEX trace_success_idx IF NOT EXISTS FOR (n:ReasoningTrace) ON (n.success);

// ---------- POINT INDEX ----------
CREATE POINT INDEX entity_location_idx IF NOT EXISTS FOR (n:Entity) ON (n.location);

// ---------- VECTOR INDEXES (384-dim COSINE, match production) ----------
CREATE VECTOR INDEX entity_embedding_idx IF NOT EXISTS FOR (n:Entity) ON (n.embedding)
  OPTIONS { indexConfig: { `vector.dimensions`: 384, `vector.similarity_function`: 'COSINE' }};
CREATE VECTOR INDEX fact_embedding_idx IF NOT EXISTS FOR (n:Fact) ON (n.embedding)
  OPTIONS { indexConfig: { `vector.dimensions`: 384, `vector.similarity_function`: 'COSINE' }};
CREATE VECTOR INDEX message_embedding_idx IF NOT EXISTS FOR (n:Message) ON (n.embedding)
  OPTIONS { indexConfig: { `vector.dimensions`: 384, `vector.similarity_function`: 'COSINE' }};
CREATE VECTOR INDEX preference_embedding_idx IF NOT EXISTS FOR (n:Preference) ON (n.embedding)
  OPTIONS { indexConfig: { `vector.dimensions`: 384, `vector.similarity_function`: 'COSINE' }};
CREATE VECTOR INDEX step_embedding_idx IF NOT EXISTS FOR (n:ReasoningStep) ON (n.embedding)
  OPTIONS { indexConfig: { `vector.dimensions`: 384, `vector.similarity_function`: 'COSINE' }};
CREATE VECTOR INDEX task_embedding_idx IF NOT EXISTS FOR (n:ReasoningTrace) ON (n.task_embedding)
  OPTIONS { indexConfig: { `vector.dimensions`: 384, `vector.similarity_function`: 'COSINE' }};
