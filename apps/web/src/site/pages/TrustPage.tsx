export function TrustPage() {
  return (
    <>
      <section className="page-section" aria-labelledby="trust-title">
        <p className="eyebrow">Privacy and safety</p>
        <h2 id="trust-title">Honest beta summary</h2>
        <div className="beta-banner" role="note">
          <p>
            <strong>Beta scope:</strong> this page is an honest engineering
            summary of the current implementation. The final published policy
            will be substantially different. Public launch requires spec plus
            legal review, live RLS proof, retention runner, and finalized copy.
          </p>
        </div>
      </section>

      <section className="page-section" aria-labelledby="stored">
        <h2 id="stored">What is stored</h2>
        <p className="lede">
          Sessions, action logs, state snapshots, evidence signals,
          reflections, sharing grants, telemetry. Reflections default to
          owner-only. Sharing needs an explicit expiring grant with revocation.
          Local development without DATABASE_URL uses in-memory storage and
          loses sessions on restart.
        </p>
      </section>

      <section className="page-section" aria-labelledby="controls">
        <h2 id="controls">Your controls</h2>
        <p className="lede">
          Export, session deletion, profile reset, and account deletion exist
          as API foundations. Owner identity comes from the authenticated
          session, never from client-supplied IDs. Institutional and school-
          managed deployment stays disabled in beta.
        </p>
      </section>

      <section className="page-section" aria-labelledby="ai-limits">
        <h2 id="ai-limits">AI limits</h2>
        <p className="lede">
          Bounded NPC dialogue phrasing only, after deterministic intent
          resolution. No invented facts, procedures, deadlines, evidence, or
          outcomes. Restricted facts filtered before prompts. Unvalidated
          output never reaches the user. Deterministic actions continue during
          provider failure.
        </p>
      </section>

      <section className="page-section" aria-labelledby="assessment">
        <h2 id="assessment">No scores, no rankings</h2>
        <p className="lede">
          No numeric fit score, compatibility label, diagnosis, or
          recommendation such as “you should become”. Debrief has eight
          qualitative sections with confidence and limitations. Competence,
          enjoyment, stress, and engagement stay separate. Audience is age 13
          and older.
        </p>
      </section>
    </>
  );
}
