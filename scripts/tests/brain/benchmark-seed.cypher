// T8 disposable benchmark corpus. Both projects deliberately share query text
// and vector values so post-filter leakage or global-top-k truncation is visible.
MATCH (n) DETACH DELETE n;

CREATE (ea:Fact {id:'bench-exact-a', project_id:'career-expo', subject:'shared exact subject', predicate:'owns', object:'alpha exact', confidence:1.0, created_at:datetime()});
CREATE (eb:Fact {id:'bench-exact-b', project_id:'other-project', subject:'shared exact subject', predicate:'owns', object:'beta exact', confidence:1.0, created_at:datetime()});

CREATE (fa:Fact:Coordination {id:'bench-fulltext-a', project_id:'career-expo', subject:'FT-A', predicate:'documents', object:'sharedfulltexttoken alpha', confidence:1.0, created_at:datetime()});
CREATE (fb:Fact:Coordination {id:'bench-fulltext-b', project_id:'other-project', subject:'FT-B', predicate:'documents', object:'sharedfulltexttoken beta', confidence:1.0, created_at:datetime()});

CREATE (va:Fact {id:'bench-vector-a', project_id:'career-expo', subject:'vector alpha', predicate:'matches', object:'shared vector query', confidence:1.0, embedding:[1.0] + [x IN range(1,383) | 0.0], created_at:datetime()});
CREATE (vb:Fact {id:'bench-vector-b', project_id:'other-project', subject:'vector beta', predicate:'matches', object:'shared vector query', confidence:1.0, embedding:[1.0] + [x IN range(1,383) | 0.0], created_at:datetime()});

CREATE (sa:Fact {id:'bench-seed-a', project_id:'career-expo', subject:'shared graph seed', predicate:'links', object:'alpha', confidence:1.0, created_at:datetime()});
CREATE (sb:Fact {id:'bench-seed-b', project_id:'other-project', subject:'shared graph seed', predicate:'links', object:'beta', confidence:1.0, created_at:datetime()});
CREATE (ga:Fact {id:'bench-graph-a', project_id:'career-expo', subject:'graph alpha result', predicate:'belongs', object:'alpha', confidence:1.0, created_at:datetime()});
CREATE (gb:Fact {id:'bench-graph-b', project_id:'other-project', subject:'graph beta result', predicate:'belongs', object:'beta', confidence:1.0, created_at:datetime()});
MATCH (sa:Fact {id:'bench-seed-a'}), (ga:Fact {id:'bench-graph-a'}) CREATE (sa)-[:RELATED_TO]->(ga);
MATCH (sb:Fact {id:'bench-seed-b'}), (gb:Fact {id:'bench-graph-b'}) CREATE (sb)-[:RELATED_TO]->(gb);
// Hostile cross-project edge: graph expansion must still enforce both endpoints.
MATCH (sa:Fact {id:'bench-seed-a'}), (gb:Fact {id:'bench-graph-b'}) CREATE (sa)-[:RELATED_TO]->(gb);
