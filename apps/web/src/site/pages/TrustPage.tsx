export function TrustPage() {
  return (
    <>
      <section className="page-section" aria-labelledby="trust-title" style={{borderTop:0, marginTop:"1.5rem"}}>
        <p className="eyebrow">Privacy and safety · Honest beta</p>
        <h1 id="trust-title" style={{fontFamily:"var(--font-display)", color:"var(--paper)", letterSpacing:"-0.03em", lineHeight:0.98, fontSize:"clamp(2rem,4.5vw,2.9rem)", margin:"0.35rem 0 0.7rem"}}>Honest beta summary</h1>
        <p className="lede" style={{maxWidth:"65ch"}}>
          Career Expo may serve teens, so privacy is architecture, not a setting. This page is the current engineering
          truth — not final legal copy. Public launch waits on spec + legal review, live RLS proof, retention runner, and a finalized data-category table.
        </p>
        <div className="beta-banner" role="note">
          <p style={{margin:0}}>
            <strong>Beta scope:</strong> this page is an honest engineering summary of the current implementation. The final published policy will be substantially different. Public launch requires spec plus legal review, live Supabase RLS proof against staging, retention/deletion runner rehearsal, and finalized copy.
          </p>
        </div>
        <nav aria-label="On this page" className="trust-toc">
          <p className="mono-label" style={{margin:"1.2rem 0 0.45rem"}}>ON THIS PAGE</p>
          <ol>
            <li><a href="#stored">What is stored</a></li>
            <li><a href="#controls">Your controls</a></li>
            <li><a href="#rls">Row-level security</a></li>
            <li><a href="#ai-limits">AI limits</a></li>
            <li><a href="#assessment">No scores, no rankings</a></li>
            <li><a href="#gate">Institutional gate</a></li>
          </ol>
        </nav>
      </section>

      <article className="prose">
        <section aria-labelledby="stored">
          <h2 id="stored"><span className="trust-num">01</span> What is stored</h2>
          <p>
            Verdaly sessions are event-sourced: an append-only <code>action_log</code> per session (action + accepted state delta) folded into <code>WorldState</code> snapshots. Evidence signals carry provenance (action, event, session, pacing mode). Tables are separate by category: accounts, simulation telemetry, reflections, research data, counselor-visible summaries.
          </p>
          <p>What we keep today (so you can decide):</p>
          <ul>
            <li><strong>Sessions</strong> — action logs, state snapshots, ledger entries, pacing mode.</li>
            <li><strong>Evidence</strong> — behavioral / outcome / reflective signals with confidence taxonomy (<code>insufficient_evidence</code> → <code>strong_repeated_pattern</code> — never a percentage).</li>
            <li><strong>Reflections</strong> — your words about the work. Owner-only by default.</li>
            <li><strong>Sharing grants</strong> — explicit, expiring, revocable rows; not auto-shared.</li>
            <li><strong>Telemetry</strong> — per-turn cost, latency, cache hits (answers “is this sustainable?”).</li>
          </ul>
          <p className="mode-note" style={{marginTop:"1rem"}}>Local dev without <code>DATABASE_URL</code> uses in-memory storage and loses sessions on restart. Production requires Supabase Postgres + RLS + Storage.</p>
        </section>

        <section aria-labelledby="controls">
          <h2 id="controls"><span className="trust-num">02</span> Your controls</h2>
          <p>From day one you can:</p>
          <ul>
            <li>Export your data</li>
            <li>Delete a single session or a reflection</li>
            <li>Reset the longitudinal profile</li>
            <li>Revoke sharing</li>
            <li>Delete your account (and its RLS-owned rows)</li>
          </ul>
          <p>
            Owner identity comes from the authenticated session, never from a client-supplied ID. Sharing a reflection creates a grant row that a counselor/guardian can read only while it is alive; revocation is immediate at the RLS boundary — application code is convenience, not the gate.
          </p>
        </section>

        <section aria-labelledby="rls">
          <h2 id="rls"><span className="trust-num">03</span> Row-level security — the gate</h2>
          <p>
            Reflection rows are <code>default-deny</code> to anyone but the owner. A second human can read them only through an explicit grant row. School-managed accounts get their own policies (what the school sees — summaries vs raw reflections, whether sim data becomes an educational record, retention, guardian rights). RLS is versioned in <code>apps/server/drizzle/0001_initial.sql</code> alongside the tables.
          </p>
          <div className="info-card" style={{marginTop:"0.9rem"}}>
            <p className="mono-label">DATA CATEGORY × ROLE</p>
            <p style={{margin:0, fontFamily:"var(--font-mono)", fontSize:"0.82rem", lineHeight:1.6}}>
              accounts → self only · sessions → self only · reflections → owner, grant-revokable · evidence → owner, grant-summaries only · telemetry → owner + platform aggregate (no PII)
            </p>
          </div>
        </section>

        <section aria-labelledby="ai-limits">
          <h2 id="ai-limits"><span className="trust-num">04</span> AI limits</h2>
          <p>
            The language model never owns truth. Time, state, actions, consequences, rules, NPC knowledge, and safety are decided by deterministic TypeScript in <code>@sim/core</code>. The model only phrases bounded NPC dialogue after intent is resolved — validated against a Zod schema, never free prose.
          </p>
          <ul>
            <li>May generate: dialogue wording, tone, follow-up question</li>
            <li>May never change: procedures, deadlines, credentials, evidence, outcomes, knowledge permissions</li>
            <li>Restricted facts are redacted <em>before</em> the prompt; leakage is checked <em>after</em> generation (Layers A+B, conditional Layer D)</li>
            <li>On provider failure: prewritten safe responses, deterministic actions continue — nothing unvalidated reaches you</li>
          </ul>
        </section>

        <section aria-labelledby="assessment">
          <h2 id="assessment"><span className="trust-num">05</span> No scores, no rankings</h2>
          <p>
            No numeric fit score, compatibility label, diagnosis, or “you should become ___”. Debrief has eight qualitative sections (what happened / what you did / consequences / early evidence / experience / confidence and limitations / career reality / next steps) with confidence and limitations stated. Competence, enjoyment, stress, and engagement stay separate — you can do well and still find it draining.
          </p>
          <p>
            Guardrails G1/G2/G3 are tests, not promises: a lint rule bans meters, user-facing evidence uses an enum only, debrief templates are claim-bounded and pass a prohibited-phrase check. Audience is age 13 and older; age-tiered access is jurisdiction config, not hardcoded thresholds.
          </p>
        </section>

        <section aria-labelledby="gate">
          <h2 id="gate"><span className="trust-num">06</span> Institutional gate — not yet</h2>
          <p>
            Before any school deployment we encode “not approved for institutional use” as a deploy flag and route through privacy, education-law, accessibility, and child-safety review. Until that gate passes, Career Expo is self-directed exploration only — no placement, no hiring signal, no high-stakes decision (G7).
          </p>
          <p style={{marginBottom:0}}>
            Questions? Implementation is public at <a href="https://github.com/zaidkan/Career-Expo">github.com/zaidkan/Career-Expo</a> — see <code>career-sim-build-spec.md</code> Sections 1, 11, 19 and <code>docs/validation-gate.md</code>. Trust copy will change before public launch; this page tracks the delta.
          </p>
        </section>
      </article>
    </>
  );
}
