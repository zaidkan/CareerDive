import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArtifactStage, ChapterSeparator, PublicChapter } from "../src/site/ArtDirection.js";
import {
  ElectricianCircuitSchedule,
  ElectricianTroubleshootingNote,
  ElectricianVerificationChecklist,
  ElectricianWiringSchematic,
  LawyerCaseFactSheet,
  LawyerIssueAuthorityMatrix,
  LawyerRedline,
  LawyerResearchNote,
  MechanicalAnnotatedDrawing,
  MechanicalRevisionComparison,
  MechanicalToleranceCallout,
  MechanicalTestResult,
  NurseHandoffSheet,
  NurseMedicationTiming,
  NursePriorityNote,
  NurseVitalsTrend,
} from "../src/site/workshop/index.js";
import "../src/foundation.css";
import "../src/site/art-direction.css";
import "./workshop-fixtures.css";

function Fixture() {
  const [light, setLight] = useState(
    () => window.matchMedia("(prefers-color-scheme: light)").matches,
  );
  useEffect(() => {
    document.documentElement.dataset.theme = light ? "light" : "dark";
  }, [light]);
  return (
    <main className="site-main-public fixture">
      <header className="fixture-controls">
        <h1>UI-4 · Workshop artifact components</h1>
        <p className="fixture-lede">
          Representative work objects for four workshop careers — built as
          isolated components, placed here only. Synthetic content, no personal
          data, nothing wired into production pages.
        </p>
        <p className="fixture-meta">
          Representative only · workshop concept provenance · no gameplay
        </p>
        <button
          type="button"
          onClick={() => {
            setLight(!light);
          }}
        >
          Use {light ? "dark" : "light"} surface
        </button>
      </header>

      <PublicChapter surface="base" rhythm="compact" width="full">
        <div className="ui-editorial-split">
          <div>
            <p className="ui-type-eyebrow">Registered Nurse · 4 objects</p>
            <h2 className="ui-type-argument">Report in three seconds.</h2>
            <p className="ui-type-proof">
              Bed-identified patients, SBAR rows, and a time-ranked priority
              note — the paperwork a shift change actually runs on.
            </p>
          </div>
          <ArtifactStage
            dominant={<NurseHandoffSheet />}
            caption="Handoff sheet · dominant slot"
          />
        </div>
        <div className="fixture-grid">
          <NurseVitalsTrend />
          <NurseMedicationTiming />
          <NursePriorityNote />
        </div>
      </PublicChapter>

      <ChapterSeparator />

      <PublicChapter surface="stage" rhythm="stage" width="full">
        <div className="ui-editorial-split ui-editorial-split--reverse">
          <ArtifactStage
            dominant={<MechanicalAnnotatedDrawing />}
            caption="Annotated drawing · dominant slot"
          />
          <div>
            <p className="ui-type-eyebrow">Mechanical Engineer · 4 objects</p>
            <h2 className="ui-type-argument">Measured, not assumed.</h2>
            <p className="ui-type-proof">
              A dimensioned bracket, inspection limits, coupon results, and a
              revision diff — the loop from drawing to lot acceptance.
            </p>
          </div>
        </div>
        <div className="fixture-grid">
          <MechanicalToleranceCallout />
          <MechanicalTestResult />
          <MechanicalRevisionComparison />
        </div>
      </PublicChapter>

      <ChapterSeparator />

      <PublicChapter surface="chapter" rhythm="standard" width="full">
        <div className="ui-editorial-split">
          <div>
            <p className="ui-type-eyebrow">Electrician · 4 objects</p>
            <h2 className="ui-type-argument">Trace, log, verify.</h2>
            <p className="ui-type-proof">
              One-line schematic, panel directory, a measured troubleshooting
              log, and the checklist that clears a circuit for service.
            </p>
          </div>
          <ArtifactStage
            dominant={<ElectricianWiringSchematic />}
            caption="Wiring schematic · dominant slot"
          />
        </div>
        <div className="fixture-grid">
          <ElectricianCircuitSchedule />
          <ElectricianTroubleshootingNote />
          <ElectricianVerificationChecklist />
        </div>
      </PublicChapter>

      <ChapterSeparator />

      <PublicChapter surface="base" rhythm="standard" width="full">
        <div className="ui-editorial-split ui-editorial-split--reverse">
          <ArtifactStage
            dominant={<LawyerRedline />}
            caption="Redline · dominant slot"
          />
          <div>
            <p className="ui-type-eyebrow">Lawyer · 4 objects</p>
            <h2 className="ui-type-argument">Positions with receipts.</h2>
            <p className="ui-type-proof">
              Role-only fact sheet, clause redline, issue-first research note,
              and the issue-authority matrix the hearing runs on.
            </p>
          </div>
        </div>
        <div className="fixture-grid">
          <LawyerCaseFactSheet />
          <LawyerResearchNote />
          <LawyerIssueAuthorityMatrix />
        </div>
      </PublicChapter>
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Fixture />);
