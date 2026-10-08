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
          CareerDive is the platform. Verdaly is just a fictional workplace inside the Cybersecurity Analyst simulation—it does not collect any data. Here is what CareerDive currently saves, what it checks, and where its limits are.
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
            CareerDive needs a record of the shift to resume work and explain
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
                <span>CareerDive boundary</span>
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
          There is no single fixed retention period. Depending on how CareerDive is currently running, your data may only last until the system restarts, or it may be saved so you can resume your shift later.
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
              shift, or deleting CareerDive session and profile records.
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
                Deleting CareerDive data does not prove deletion of an
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
          You do not need to enter a name or email or sign up manually. In the production setup, CareerDive automatically creates an anonymous Supabase identity and stores its authentication token in your browser. The token is refreshed so you can return to your own requests and shifts. Clearing browser storage can remove that access. Identity and owner checks protect one person's stored data from another person's requests.
        </p>
        <div className="trust-access-lines">
          <div>
            <strong>Session checks</strong>
            <p>
              The system requires proof of the active session. It is designed to block access if someone tries to request a shift that belongs to another session.
            </p>
          </div>
          <div>
            <strong>Data boundaries</strong>
            <p>
              Database rules are designed to keep one session's data separate from another. Those protections depend on the deployed database configuration being applied correctly.
            </p>
          </div>
        </div>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter surface="base" rhythm="standard" className="trust-providers">
        <h2>Services involved</h2>
        <ul>
          <li>
            Google Fonts serves the site's fonts. Loading them sends network
            requests to Google, including your IP address.
          </li>
          <li>
            Supabase provides anonymous authentication and, in the production
            setup, the database for stored CareerDive data.
          </li>
          <li>
            When AI dialogue is enabled, Anthropic receives the dialogue request
            and the limited scenario context used to phrase Morgan's reply.
          </li>
          <li>
            Render is the hosting provider in our deployment configuration and
            handles requests to the hosted site and API.
          </li>
        </ul>
        <p>
          Which services are active depends on the deployment. Local development
          can use server memory and prepared dialogue instead.
        </p>
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
              AI can help phrase Morgan&apos;s answer. CareerDive limits which scenario facts the dialogue can use. Without an AI connection, it uses a prepared line.
            </p>
            <p>
              If the generated reply tries to break the rules, the game falls back to a prepared line. These checks help keep the simulation on track.
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
            The debrief reviews recorded actions and evidence from one
            ~10–15-minute simulated shift, including what remains unknown. It has
            eight written sections and a confidence label. It does not calculate
            a career-fit score, grade, ranking, or job recommendation.
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
          CareerDive is presented for individual exploration, not as a school
          assessment. The platform is not currently built for institutional enrollment
          or classroom management. We make no school approval or legal-compliance claim.
        </p>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter surface="base" rhythm="compact" className="trust-wiring">
        <details>
          <summary>See how this works</summary>
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
