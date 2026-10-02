import { MotionReveal } from "../ArtDirection.js";
import { SiteLink } from "../SiteLink.js";
import "./TrustPage.css";

export function TrustPage() {
  return (
    <article className="trust-page">
      <header className="trust-hero">
        <h1>Privacy and safety</h1>
        <p>
          What stays in your browser, what reaches Career Expo, and what is
          still unconfirmed.
        </p>
      </header>
      <div className="trust-sections">
        <MotionReveal
          className="trust-group"
          amount={0.35}
          margin="0px 0px -64px 0px"
        >
          <section aria-labelledby="trust-collects">
            <h2 id="trust-collects">What we collect</h2>
            <ul>
              <li>Shift IDs, state, actions and evidence.</li>
              <li>Submitted reflections and dialogue questions.</li>
              <li>
                Tab-local report drafts; contact and diagnostics are optional.
              </li>
              <li>
                Server request logs; production logging settings are
                unconfirmed.
              </li>
            </ul>
          </section>
          <section aria-labelledby="trust-why">
            <h2 id="trust-why">Why we use it</h2>
            <ul>
              <li>Resume your shift and explain your decisions.</li>
              <li>Answer scenario questions.</li>
              <li>Check access and diagnose problems.</li>
            </ul>
            <p>
              Career-request previews stay in your browser; current public
              controls do not send them to the server.
            </p>
          </section>
        </MotionReveal>
        <MotionReveal
          className="trust-group"
          amount={0.35}
          margin="0px 0px -64px 0px"
        >
          <section aria-labelledby="trust-not">
            <h2 id="trust-not">What we do not do</h2>
            <ul>
              <li>No career-fit score, grade or job recommendation.</li>
              <li>
                No advertising or fingerprinting integration in the current app.
              </li>
            </ul>
            <p>
              No sign-up in current entry. Production access: to be confirmed
              before launch.
            </p>
          </section>
          <section aria-labelledby="trust-services">
            <h2 id="trust-services">Services and processors</h2>
            <p>
              Live providers: <strong>To be confirmed before launch.</strong>{" "}
              Code/template integrations:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> — configured identity checks.
              </li>
              <li>
                <strong>Anthropic</strong> — optional Morgan dialogue; receives
                your question and filtered scenario facts.
              </li>
              <li>
                <strong>PostgreSQL</strong> — configured shift storage; host
                unconfirmed.
              </li>
              <li>
                <strong>Render</strong> — hosting template.
              </li>
            </ul>
          </section>
        </MotionReveal>
        <MotionReveal
          className="trust-group"
          amount={0.35}
          margin="0px 0px -64px 0px"
        >
          <section aria-labelledby="trust-retention">
            <h2 id="trust-retention">Retention</h2>
            <p>
              There is no single fixed retention period. Server-memory records
              can disappear on restart; database records can persist.
            </p>
            <p>
              Production retention and processor policies:{" "}
              <strong>To be confirmed before launch.</strong>
            </p>
          </section>
          <section aria-labelledby="trust-ai">
            <h2 id="trust-ai">AI and generated content</h2>
            <p>
              Optional AI phrases Morgan’s replies; it does not change shift
              state or decide outcomes. Missing/rejected replies use prepared
              lines. Checks can miss inaccurate generated statements.
            </p>
          </section>
        </MotionReveal>
        <MotionReveal
          className="trust-group"
          amount={0.35}
          margin="0px 0px -64px 0px"
        >
          <section aria-labelledby="trust-reporting">
            <h2 id="trust-reporting">Safety and reporting</h2>
            <p>
              On the shift/recovery screen, choose{" "}
              <strong>Report a problem</strong>. Sends category/description;
              contact and diagnostics are optional.
            </p>
            <p>
              Persistent report storage is not implemented. Failed delivery
              keeps the draft in this tab: use{" "}
              <strong>Copy report details</strong>, or retry later. Avoid
              sensitive personal information.
            </p>
          </section>
          <section aria-labelledby="trust-questions">
            <h2 id="trust-questions">Questions and controls</h2>
            <p>
              <SiteLink to="/faq">Read the FAQ</SiteLink> for questions. For
              privacy/data questions, use <strong>Report a problem</strong>,
              category Other; delivery limits above apply.
            </p>
            <details>
              <summary>Access and data-control details</summary>
              <p>
                Session checks are designed to separate protected data; database
                protection depends on correct deployment. Operator access is not
                independently audited.
              </p>
              <p>
                Server export/deletion routes exist, but are not yet
                self-service controls here. Deleting Career Expo records does
                not delete an identity-provider account.
              </p>
              <p>
                Verdaly is fictional. This code summary is not a legal policy or
                compliance certification; institutional enrollment is not
                supported.
              </p>
            </details>
          </section>
        </MotionReveal>
      </div>
    </article>
  );
}
