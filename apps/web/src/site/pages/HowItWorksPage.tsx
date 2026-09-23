export function HowItWorksPage() {
  return (
    <>
      <section className="page-section" aria-labelledby="how-title" style={{borderTop:0, marginTop:"1.5rem"}}>
        <p className="eyebrow">A calm way to try work · No hype</p>
        <h1 id="how-title" style={{fontFamily:"var(--font-display)", color:"var(--paper)", letterSpacing:"-0.03em", lineHeight:0.98, fontSize:"clamp(2rem,4.5vw,2.9rem)", margin:"0.35rem 0 0.7rem"}}>How your Verdaly day actually goes</h1>
        <p className="lede" style={{maxWidth:"65ch"}}>
          One short shift, start to finish. You’ll move between a few simple screens — the same tools a
          junior analyst really uses. No scores chasing you, just work to try at your own pace.
        </p>
        <div className="trust-strip" style={{marginTop:"1.15rem"}}>
          <span className="site-chip">About 10 minutes</span>
          <span className="site-chip">You set the pace</span>
          <span className="site-chip">Same work, three ways to play</span>
          <span className="site-chip site-chip-muted">Desk, walk, or list — your choice</span>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="beat-01">
        <div className="chapter-head">
          <span className="chapter-num">01</span>
          <div>
            <h2 id="beat-01">First, get your bearings</h2>
            <p className="lede">You log in, find your desk on Floor 12, and open the handoff from last night. It’s missing a few things on purpose — that’s the point.</p>
          </div>
        </div>
        <div className="showcase-grid">
          <article className="showcase-card">
            <div style={{height:156, display:"grid", placeItems:"center", background:"var(--desk)", borderBottom:"1px solid var(--line)", fontFamily:"var(--font-mono)", color:"var(--mute)", fontSize:"0.78rem"}}>Your inbox — the handoff is waiting</div>
            <div><h3>Start simple</h3><p>A short hello from the team, then you’re at your desk. No test to pass to get in.</p></div>
          </article>
          <article className="showcase-card">
            <div style={{height:156, display:"grid", placeItems:"center", background:"var(--ink-lift)", borderBottom:"1px solid var(--line)", fontFamily:"var(--font-mono)", color:"var(--mute)", fontSize:"0.78rem"}}>Your desk — clean, calm, yours</div>
            <div><h3>A workstation, not a game</h3><p>Paper-trace desktop. Same calm look as the rest of Career Expo.</p></div>
          </article>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="beat-02">
        <div className="chapter-head">
          <span className="chapter-num">02</span>
          <div>
            <h2 id="beat-02">Then, look closer</h2>
            <p className="lede">One login doesn’t look right. You’ll pull the history, check the device list, peek at the network route — and write down what you actually see, not what you guess.</p>
          </div>
        </div>
        <div className="showcase-grid">
          <article className="showcase-card">
            <img src="/verdaly-tower-doors.svg" alt="Alert detail — who, when, how" loading="lazy" />
            <div><h3>The alert</h3><p>Who logged in, when, from where. You open it before you judge it.</p></div>
          </article>
          <article className="showcase-card">
            <img src="/verdaly-tower-doors.svg" alt="Your notes — what you know and what you don’t" loading="lazy" />
            <div><h3>Your notes</h3><p>What you’ve seen, what’s still unclear, what you’ll ask. That’s the actual ticket.</p></div>
          </article>
        </div>
        <div className="info-card" style={{marginTop:"1rem"}}>
          <p className="mono-label">HOW IT FEELS</p>
          <p style={{margin:0}}>Like sketching — you notice, you mark, you write down what you’d stand behind. No meter tells you if you’re “good.”</p>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="beat-03">
        <div className="chapter-head">
          <span className="chapter-num">03</span>
          <div>
            <h2 id="beat-03">Something pops up — you choose</h2>
            <p className="lede">While you’re still thinking, another piece of work lands. You can switch over, snooze it once, or finish your thought. There’s no timer yelling at you — we’re interested in how you choose, not how fast.</p>
          </div>
        </div>
        <div className="card-grid">
          <article className="info-card"><p className="mono-label">SWITCH</p><h3>Go see</h3><p>Jump to the new item. What you wrote so far stays where you left it.</p></article>
          <article className="info-card"><p className="mono-label">SNOOZE</p><h3>Not yet</h3><p>Mute it once. It’ll wait — it doesn’t disappear.</p></article>
          <article className="info-card"><p className="mono-label">STAY</p><h3>Finish up</h3><p>Wrap your note first. The queue will still be there.</p></article>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="beat-04">
        <div className="chapter-head">
          <span className="chapter-num">04</span>
          <div>
            <h2 id="beat-04">Write it down, then decide</h2>
            <p className="lede">You turn what you found into words someone else could read. Then you send it for a second pair of eyes — or, if you’re unsure, you ask Morgan to talk it through. Both choices matter later.</p>
          </div>
        </div>
        <div className="card-grid">
          <article className="info-card"><p className="mono-label">WRITE</p><h3>A note that counts</h3><p>A simple template: what you saw, what’s still fuzzy, what you’d do next. It sticks around for the replay.</p></article>
          <article className="info-card"><p className="mono-label">TALK</p><h3>Morgan’s there</h3><p>Your team lead. She’ll nudge your thinking, but she won’t decide for you.</p></article>
          <article className="info-card"><p className="mono-label">WRAP</p><h3>See what happened</h3><p>When you’re done, you get a short, honest debrief — what unfolded, not a grade.</p></article>
        </div>
      </section>

      <section className="page-section chapter-section" aria-labelledby="beat-05">
        <div className="chapter-head">
          <span className="chapter-num">05</span>
          <div>
            <h2 id="beat-05">How you want to play</h2>
            <p className="lede">Some people like to walk the floor, some like to just focus at the desk. Both are the same work, same consequences. Pick what feels comfortable — we don’t measure how well you click.</p>
          </div>
        </div>
        <div className="card-grid">
          <article className="info-card"><p className="mono-label">WALK</p><h3>Wander</h3><p>A quiet, low-poly office. Approach a spot and it opens the same desk.</p></article>
          <article className="info-card"><p className="mono-label">DESK</p><h3>Focus</h3><p>Just the screens. Calm, paper-y, like the rest of the site.</p></article>
          <article className="info-card"><p className="mono-label">LIST</p><h3>Simple</h3><p>Keyboard and screen reader friendly. Same buttons, same story — not an afterthought.</p></article>
        </div>
      </section>

      <section className="page-section" aria-labelledby="validation">
        <h2 id="validation">How we’ll know if this is useful</h2>
        <p className="lede" style={{maxWidth:"65ch"}}>
          Not “did you have fun?” alone — we compare what you understood about the job to strong, static
          materials, check if the choices felt real to practitioners, and make sure the accessible version
          isn’t harder to use than the work itself. The whole thing is open at{" "}
          <a href="https://github.com/zaidkan/Career-Expo">github.com/zaidkan/Career-Expo</a> — the shift script lives in <code>content/packs/cybersecurity-analyst/pack.yaml</code>.
        </p>
        <div className="hero-ctas" style={{marginTop:"1rem"}}>
          <a className="start-shift" href="/start" style={{textDecoration:"none"}}>Try your first day →</a>
          <a className="button-secondary" href="/trust">How we keep it honest →</a>
        </div>
      </section>
    </>
  );
}
