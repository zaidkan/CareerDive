import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArtifactStage, ChapterSeparator, PublicChapter } from "../src/site/ArtDirection.js";
import "../src/foundation.css";
import "../src/site/art-direction.css";
import "./art-direction.css";

function Placeholder({ label }: { label: string }) {
  return <div className="fixture-paper">{label}</div>;
}

function Fixture() {
  const [light, setLight] = useState(false);
  const [play, setPlay] = useState(false);
  const [career, setCareer] = useState<"Cybersecurity Analyst" | "Registered Nurse">("Cybersecurity Analyst");
  const [departing, setDeparting] = useState<typeof career | null>(null);
  useEffect(() => {
    if (!departing) return;
    const timer = window.setTimeout(() => { setDeparting(null); }, 420);
    return () => { window.clearTimeout(timer); };
  }, [departing]);
  useEffect(() => {
    document.documentElement.dataset.theme = light ? "light" : "dark";
  }, [light]);
  return (
    <main className="site-main-public fixture">
      <header className="fixture-controls">
        <h1>UI-1 composition proof</h1>
        <button type="button" onClick={() => { setLight(!light); }}>Use {light ? "dark" : "light"} surface</button>
        <button type="button" onClick={() => { setPlay(false); window.setTimeout(() => { setPlay(true); }, 30); }}>Play motion</button>
        <button type="button" onClick={() => { setDeparting(career); setCareer(career === "Cybersecurity Analyst" ? "Registered Nurse" : "Cybersecurity Analyst"); setPlay(true); }}>Switch career</button>
      </header>
      <PublicChapter surface="base" rhythm="compact" width="full">
        <div data-motion="chapter-reveal" data-motion-active={play} className="ui-editorial-split">
          <div data-motion-role="argument">
            <p className="ui-type-eyebrow">Surface A · Base</p>
            <h2 className="ui-type-argument">One argument carries each chapter.</h2>
            <p className="ui-type-proof">A single artifact can hold the visual proof.</p>
          </div>
          <div data-motion-role="artifact" className="fixture-outline">Dominant visual proof</div>
        </div>
      </PublicChapter>
      <ChapterSeparator />
      <PublicChapter surface="chapter" rhythm="standard" width="full">
        <p className="ui-type-eyebrow">Surface B · Chapter</p>
        <h2 className="ui-type-argument">A quiet change in tone.</h2>
      </PublicChapter>
      <PublicChapter surface="stage" rhythm="stage" width="full">
        <p className="ui-type-eyebrow">Surface C · Stage</p>
        <div data-motion="artifact-gather" data-motion-active={play}>
          <ArtifactStage
            eyebrow="Placement system"
            dominant={<Placeholder label="Dominant artifact slot" />}
            secondary={[<span data-motion-role="secondary"><Placeholder label="Related record" /></span>, <span data-motion-role="secondary"><Placeholder label="Secondary context" /></span>]}
            caption="Replace slots with authentic work artifacts."
            provenance={{ career: "Cybersecurity Analyst", kind: "real" }}
          />
        </div>
      </PublicChapter>
      <PublicChapter surface="base" rhythm="expansive" width="full">
        <div className="ui-editorial-split ui-editorial-split--reverse">
          <div className="fixture-outline" data-motion="career-switch" data-motion-active={play}>
            <span data-career={career === "Cybersecurity Analyst" ? "active" : departing === "Cybersecurity Analyst" ? "departing" : "inactive"} aria-hidden={career !== "Cybersecurity Analyst"}>
              Cybersecurity artifact ecosystem
            </span>
            <span data-career={career === "Registered Nurse" ? "active" : departing === "Registered Nurse" ? "departing" : "inactive"} aria-hidden={career !== "Registered Nurse"}>
              Nursing artifact ecosystem
            </span>
          </div>
          <div>
            <h2 className="ui-type-argument">Career context changes.</h2>
            <p className="ui-type-proof">An explicit switch selects next artifact family.</p>
            <p className="ui-type-meta">{career}</p>
          </div>
        </div>
      </PublicChapter>
      <PublicChapter surface="finale" rhythm="final" width="full">
        <p className="ui-type-eyebrow">Surface D · Finale</p>
        <h2 className="ui-type-final">Finish with clear next step.</h2>
        <p className="ui-type-proof">High contrast closes sequence.</p>
      </PublicChapter>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Fixture />);
