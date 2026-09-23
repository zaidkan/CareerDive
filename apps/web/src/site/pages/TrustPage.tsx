export function TrustPage() {
  return (
    <>
      <section className="page-section" aria-labelledby="trust-title" style={{borderTop:0, marginTop:"1.5rem"}}>
        <p className="eyebrow">Privacy and safety — plain talk</p>
        <h1 id="trust-title" style={{fontFamily:"var(--font-display)", color:"var(--paper)", letterSpacing:"-0.03em", lineHeight:0.98, fontSize:"clamp(2rem,4.5vw,2.9rem)", margin:"0.35rem 0 0.7rem"}}>We keep your stuff private. Here’s how.</h1>
        <p className="lede" style={{maxWidth:"65ch"}}>
          If you’re trying this as a teen, you deserve straight answers. This page is what’s actually built right now —
          not fancy legal language. The final policy before launch will be reviewed by real lawyers, but this is the honest
          version while we’re in beta.
        </p>
        <div className="beta-banner" role="note">
          <p style={{margin:0}}>
            <strong>Still in beta:</strong> think of this as a builder’s notes, not the final contract. Before we launch for real,
            we’ll get a legal review, prove our security live, and publish the full, final wording.
          </p>
        </div>
        <nav aria-label="On this page" className="trust-toc">
          <p className="mono-label" style={{margin:"1.2rem 0 0.45rem"}}>ON THIS PAGE</p>
          <ol>
            <li><a href="#stored">What we actually keep</a></li>
            <li><a href="#controls">What you can do about it</a></li>
            <li><a href="#rls">How the lock works</a></li>
            <li><a href="#ai-limits">What the AI can and can’t do</a></li>
            <li><a href="#assessment">No grades. No rankings.</a></li>
            <li><a href="#gate">Not for schools — yet</a></li>
          </ol>
        </nav>
      </section>

      <article className="prose">
        <section aria-labelledby="stored">
          <h2 id="stored"><span className="trust-num">01</span> What we actually keep</h2>
          <p>
            Verdaly remembers your shift as a list of actions — what you clicked, in what order — and replays that list to show you what happened. That’s it. We don’t record your screen or watch you type.
          </p>
          <p>Right now we keep:</p>
          <ul>
            <li><strong>Your shift</strong> — the order you did things, when you did them.</li>
            <li><strong>What stood out</strong> — small notes the system makes about choices (never a score).</li>
            <li><strong>Your reflections</strong> — what you write about how the work felt. Only you can see these unless you choose to share.</li>
            <li><strong>Sharing links</strong> — if you share, we make a single, expiring link you can delete.</li>
            <li><strong>Quiet numbers</strong> — how long a shift took, roughly what it cost to run. Just to see if this can keep running.</li>
          </ul>
          <p className="mode-note" style={{marginTop:"1rem"}}>Playing on your own laptop without a database? Everything lives just in memory and disappears when you restart — that’s normal for local dev.</p>
        </section>

        <section aria-labelledby="controls">
          <h2 id="controls"><span className="trust-num">02</span> What you can do about it</h2>
          <p>You’re in charge. From day one you can:</p>
          <ul>
            <li>Ask for a copy of your data</li>
            <li>Delete a single shift or a note you wrote</li>
            <li>Clear your whole history and start fresh</li>
            <li>Take back a sharing link — it stops working right away</li>
            <li>Delete your account — that’s everything</li>
          </ul>
          <p>
            We know it’s you because you’re logged in — we don’t trust whatever your browser says about who you are.
            If you make a sharing link, someone else can only see it while that link is alive.
          </p>
        </section>

        <section aria-labelledby="rls">
          <h2 id="rls"><span className="trust-num">03</span> How the lock works</h2>
          <p>
            Your notes are locked to you. Not “hidden by the app” — actually locked in the database. No one else — not us, not a school, not a parent — can see them unless you make that expiring link on purpose.
          </p>
          <p>
            The lock itself lives in the database rules (called row-level security) and travels with the data, not just in the app. The rules are saved right alongside the tables in <code>apps/server/drizzle/0001_initial.sql</code> so you can read them.
          </p>
          <div className="info-card" style={{marginTop:"0.9rem"}}>
            <p className="mono-label">WHO SEES WHAT</p>
            <p style={{margin:0, fontFamily:"var(--font-mono)", fontSize:"0.82rem", lineHeight:1.6}}>
              your account → only you · your shifts → only you · your reflections → only you (unless you share that one link) · what you learned → only you · how we run the site → just numbers, no names
            </p>
          </div>
        </section>

        <section aria-labelledby="ai-limits">
          <h2 id="ai-limits"><span className="trust-num">04</span> What the AI can and can’t do</h2>
          <p>
            The computer keeps the story honest. Your manager’s personality is the only thing the AI helps write — and only after the system has already decided what that character is allowed to know.
          </p>
          <ul>
            <li>It <em>can</em> rephrase how Morgan talks to you</li>
            <li>It <em>can’t</em> invent a new deadline, change what’s true, or decide what happens</li>
            <li>It never sees the stuff it shouldn’t — we cut that out before we ask it</li>
            <li>If it ever tries to say something it shouldn’t, we throw that away and show you a safe, written-in-advance line instead</li>
          </ul>
        </section>

        <section aria-labelledby="assessment">
          <h2 id="assessment"><span className="trust-num">05</span> No grades. No “you should be ___”</h2>
          <p>
            There’s no score at the end, no “you’d be perfect for this job” label. When you’re done you get eight short, honest sections about what happened, what you did, and why we’re not very sure yet. How good you are, how much you liked it, how stressed you felt — we keep those ideas separate, because you can do great work and still not love it.
          </p>
          <p>
            That’s not just a promise — it’s a test. The code checks that no number ever sneaks through as a “skill score,” and our writing is checked for phrases we never want to say. You have to be 13 or older to try Career Expo.
          </p>
        </section>

        <section aria-labelledby="gate">
          <h2 id="gate"><span className="trust-num">06</span> Not for schools — yet</h2>
          <p>
            We’re not ready for classrooms. Right now Career Expo is just for you to explore on your own — it’s not a placement test, not for hiring, not for sorting you. Before any school could use it, we’d need real privacy, education-law, and safety reviews, and we mark that with a simple flag in the code: <em>not approved for schools</em>.
          </p>
          <p style={{marginBottom:0}}>
            Want to see the wiring? It’s all open at <a href="https://github.com/zaidkan/Career-Expo">github.com/zaidkan/Career-Expo</a> — especially <code>career-sim-build-spec.md</code> and <code>docs/validation-gate.md</code>. When this page changes before launch, we’ll say exactly what changed.
          </p>
        </section>
      </article>
    </>
  );
}
