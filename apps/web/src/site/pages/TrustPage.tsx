import { SiteLink } from "../SiteLink.js";
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
          CareerDive is for people 13 or older. Clicking Start confirms that you meet that age requirement and agree to the <SiteLink to="/terms">Terms</SiteLink> and <SiteLink to="/privacy">Privacy Policy</SiteLink>.
        </p>
      </header>

      <ChapterSeparator />
      <PublicChapter surface="stage" rhythm="stage" className="trust-kept">
        <div className="trust-section-head">
          <h2 id="trust-kept">What we keep</h2>
          <p>
            CareerDive needs a record of the shift to resume work and explain
            the debrief. Optional reflections save your selected enjoyment and confidence choices when submitted; there is no free-text reflection entry.
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
          Automatic cleanup deletes simulation sessions older than 90 days and their associated activity, observations, and reflections. The database-backed server runs cleanup at startup and hourly; service outages can delay a run. Support reports, authentication records, and provider logs are handled separately. Read the <SiteLink to="/privacy">Privacy Policy</SiteLink> for details.
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
              To request access or deletion, use the contact listed in the <SiteLink to="/privacy">Privacy Policy</SiteLink>. Clearing browser storage can remove your ability to resume, but does not delete stored server data.
            </p>
          </div>
          <div className="trust-control-proof">
            <p>
              <strong>Server operations</strong>
              <span>
                Owner-checked export and deletion of stored shifts
              </span>
            </p>
            <p>
              <strong>Current limit</strong>
              <span>
                These are not yet self-service controls on this public page.
                Authentication records and hosting-provider logs are separate from saved simulation data. Public sharing links are not offered at launch.
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
              The API verifies the browser's authentication token and checks the owner of each stored shift. A valid token for one visitor does not authorize access to another visitor's shift.
            </p>
          </div>
          <div>
            <strong>Data boundaries</strong>
            <p>
              The deployed browser does not directly read or write simulation tables. The server uses a privileged database connection and enforces owner checks. People operating the service and its providers may process stored information to run and support it; anonymous use does not mean no data is collected.
            </p>
          </div>
        </div>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter surface="base" rhythm="standard" className="trust-providers">
        <h2>Services involved</h2>
        <ul>
          <li>
            Supabase provides anonymous authentication and, in the production
            setup, the database for stored CareerDive data.
          </li>
          <li>
            Render is the hosting provider in our deployment configuration and
            handles requests to the hosted site and API.
          </li>
        </ul>
        <p>
          Hosting providers process ordinary network and operational information, including IP addresses and logs. Fonts are served by CareerDive itself. Optional analytics and PostHog are off at launch; there is no session replay or keystroke recording. CareerDive does not sell personal information.
        </p>
      </PublicChapter>

      <ChapterSeparator />
      <PublicChapter surface="base" rhythm="standard" className="trust-dialogue">
        <div className="ui-editorial-split ui-editorial-split--reverse">
          <div className="trust-dialogue-boundary" aria-label="Authored dialogue boundary">
            <span>Always authored</span>
            <strong>Known facts → Morgan&apos;s reply</strong>
            <p>
              Selecting an authored dialogue choice can record an action and use shift time. The simulation's deterministic rules handle that action.
            </p>
          </div>
          <div>
            <h2 id="trust-dialogue">How workplace dialogue works</h2>
            <p>
              Morgan and Jules use prewritten dialogue selected by deterministic rules. Their replies stay within the scenario context they are allowed to know.
            </p>
            <p>
              CareerDive has no generative-AI dialogue provider. Conversations use authored choices; scenario facts and outcomes follow the simulation's deterministic rules.
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
            Source excerpts illustrate the checks described above. They do not verify the configuration of a live deployment.
          </p>
          <div className="trust-wiring-excerpts">
            <div>
              <h3>Owner check</h3>
              <p>Server database query</p>
              <pre>
                <code>
                  {
                    "WHERE id = ${sessionId}::uuid AND owner_id = ${ownerId}::uuid"
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
              <h3>Dialogue boundary</h3>
              <p>Character knowledge and authored dialogue</p>
              <pre>
                <code>
                  {
                    "const body = managerRecap(view, action.eventId, choice);"
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
