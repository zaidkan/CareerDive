import {
  ArtifactStage,
  ChapterSeparator,
  PublicChapter,
} from "../ArtDirection.js";
import "./TrustPage.css";

export function TrustPage() {
  return (
    <article className="trust-page">
      <header className="trust-hero">
        <h1>Collect less. Explain exactly what remains.</h1>
        <p className="trust-hero-lede">
          Career Expo is the platform. Verdaly is just a fictional workplace inside the Cybersecurity Analyst simulation—it does not collect any data. Here is what Career Expo currently saves, what it checks, and where its limits are.
        </p>
        <p className="trust-hero-note">
          This is a product summary from current code, not a legal policy or a
          promise about every deployment.
        </p>
      </header>

      <ChapterSeparator />
      <PublicChapter surface="stage" rhythm="stage" className="trust-kept">
        <div className="trust-section-head">
          <h2 id="trust-kept">What we keep</h2>
          <p>
            Career Expo needs a record of the shift to resume work and explain
            the debrief. Optional reflections are saved only when submitted.
          </p>
        </div>
        <ArtifactStage
          className="trust-flow-stage"
          dominant={
            <ol className="trust-flow" aria-label="How first-shift data moves">
              <li>
                <span>First shift</span>
                <strong>State, actions, evidence</strong>
                <p>Plus a reflection if you submit one.</p>
              </li>
              <li>
                <span>Career Expo boundary</span>
                <strong>Identity and owner checks</strong>
                <p>
                  Server stores the session in its configured database or in
                  server memory.
                </p>
              </li>
              <li>
                <span>Returned to you</span>
                <strong>Shift view and debrief</strong>
                <p>
                  An authenticated export route can return stored session data.
                </p>
              </li>
            </ol>
          }
          caption="The server stores current state as well as an action log; it does not rebuild the shift from clicks alone."
        />
        <p className="trust-quiet-note">
          No fixed retention period is established here. Server-memory data ends
          when that server process restarts; database mode saves records beyond
          a restart.
        </p>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter
        surface="base"
        rhythm="standard"
        className="trust-controls"
      >
        <div className="ui-editorial-split">
          <div>
            <h2 id="trust-controls">Your controls</h2>
            <p>
              The server supports exporting stored shift data, deleting one
              shift, or deleting Career Expo session and profile records.
            </p>
          </div>
          <div className="trust-control-proof">
            <p>
              <strong>Available in code</strong>
              <span>
                Export data · delete one shift · revoke a recipient grant
              </span>
            </p>
            <p>
              <strong>Current limit</strong>
              <span>
                These are not yet self-service controls on this public page.
                Deleting Career Expo data does not prove deletion of an
                identity-provider account.
              </span>
            </p>
          </div>
        </div>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter
        surface="chapter"
        rhythm="standard"
        className="trust-access"
      >
        <h2 id="trust-access">How access is protected</h2>
        <p className="trust-lead">
          In production, a session request needs a verified account identity.
          Server reads and writes check that identity against the session owner.
        </p>
        <div className="trust-access-lines">
          <div>
            <strong>At the API</strong>
            <p>
              Production requests use a verified sign-in token. Session queries
              include the owner ID; another account&apos;s session is rejected
              in tests.
            </p>
          </div>
          <div>
            <strong>In the database design</strong>
            <p>
              Database rules are written to limit sessions, actions, evidence,
              and reflections to their owner. Live enforcement depends on
              deployed database roles and configuration.
            </p>
          </div>
        </div>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter surface="base" rhythm="standard" className="trust-ai">
        <div className="ui-editorial-split ui-editorial-split--reverse">
          <div className="trust-ai-boundary" aria-label="AI dialogue boundary">
            <span>When AI is configured</span>
            <strong>Known facts → Morgan&apos;s reply</strong>
            <p>
              The dialogue route returns text. It does not apply a case action
              or change the shift state.
            </p>
          </div>
          <div>
            <h2 id="trust-ai">What AI can and cannot do</h2>
            <p>
              AI can help phrase Morgan&apos;s answer when a provider is
              enabled. The server sends a filtered character context and your
              question. Without a provider, it uses a prepared line.
            </p>
            <p>
              Output checks catch declared restricted facts and selected scoring
              language; failed generation falls back to a prepared line. Those
              checks are not a guarantee that every generated sentence is
              correct.
            </p>
          </div>
        </div>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter
        surface="finale"
        rhythm="standard"
        className="trust-no-score"
      >
        <div className="trust-no-score-inner">
          <h2 id="trust-no-score">No grades. No fit score.</h2>
          <p>
            The current debrief has eight written sections and a confidence
            label. Its schema has no career-fit score, grade, ranking, or job
            recommendation field.
          </p>
          <div
            className="trust-debrief-strip"
            aria-label="Examples of debrief sections"
          >
            <span>What happened</span>
            <span>What you did</span>
            <span>Limits of this shift</span>
            <span>What to explore next</span>
          </div>
        </div>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter
        surface="chapter"
        rhythm="compact"
        className="trust-school"
      >
        <h2 id="trust-school">Current school-use status</h2>
        <p>
          Career Expo is presented for individual exploration, not as a school
          assessment. A policy setting marks institutional use as unavailable,
          but the current first shift does not enforce a school-entry gate. We
          make no school approval or legal-compliance claim.
        </p>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter surface="base" rhythm="compact" className="trust-wiring">
        <details>
          <summary>See the wiring</summary>
          <p>
            Short source excerpts behind the claims above. A migration shows
            intended database rules; it is not proof of a live deployment.
          </p>
          <div className="trust-wiring-excerpts">
            <div>
              <h3>Owner policy</h3>
              <p>Database migration</p>
              <pre>
                <code>
                  {
                    "CREATE POLICY simulation_sessions_owner_all ON simulation_sessions\n  FOR ALL USING (auth.uid() = owner_id)\n  WITH CHECK (auth.uid() = owner_id);"
                  }
                </code>
              </pre>
            </div>
            <div>
              <h3>No-score check</h3>
              <p>Evidence and debrief test</p>
              <pre>
                <code>
                  {
                    'expect(signal).not.toHaveProperty("score");\nexpect(Object.keys(debrief.sections)).toHaveLength(8);'
                  }
                </code>
              </pre>
            </div>
            <div>
              <h3>AI boundary</h3>
              <p>Character context and dialogue route</p>
              <pre>
                <code>
                  {
                    "facts: Object.values(state.facts).filter((fact) =>\n  speakerMayKnow(fact, npcId),\n);"
                  }
                </code>
              </pre>
            </div>
          </div>
        </details>
      </PublicChapter>
    </article>
  );
}
