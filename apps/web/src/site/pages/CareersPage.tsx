import { PublicChapter, ChapterSeparator, ArtifactStage } from "../ArtDirection.js";
import { selectProductMedia, type ProductMediaId } from "../productMedia.js";
import {
  NurseHandoffSheet,
  NurseVitalsTrend,
  MechanicalAnnotatedDrawing,
  MechanicalToleranceCallout,
  ElectricianWiringSchematic,
  ElectricianVerificationChecklist,
  LawyerCaseFactSheet,
  LawyerRedline,
} from "../workshop/index.js";
import { CareerRequestToggle } from "../careers/CareerRequestToggle.js";
import { getCareerBySlug, careerPath } from "../../careers/careers.js";
import { SiteLink } from "../SiteLink.js";

function ThemedMedia({ id, alt }: { id: ProductMediaId; alt: string }) {
  const l_desktop = selectProductMedia(id, "light", "desktop").src;
  const l_mobile = selectProductMedia(id, "light", "mobile").src;
  const d_desktop = selectProductMedia(id, "dark", "desktop").src;
  const d_mobile = selectProductMedia(id, "dark", "mobile").src;

  return (
    <div className="themed-media-wrapper">
      <style>{`
        .themed-media-wrapper picture { display: block; width: 100%; height: auto; }
        .themed-media-wrapper img { display: block; width: 100%; height: auto; object-fit: contain; border-radius: var(--ui-radius, 8px); }
        :root[data-theme="light"] .themed-media-wrapper .pm-dark { display: none; }
        :root[data-theme="dark"] .themed-media-wrapper .pm-light { display: none; }
      `}</style>
      <picture className="pm-light">
        <source srcSet={l_mobile} media="(max-width: 600px)" />
        <img src={l_desktop} alt={alt} decoding="async" loading="lazy" />
      </picture>
      <picture className="pm-dark">
        <source srcSet={d_mobile} media="(max-width: 600px)" />
        <img src={d_desktop} alt={alt} decoding="async" loading="lazy" />
      </picture>
    </div>
  );
}

export function CareersPage() {
  const cyber = getCareerBySlug("cybersecurity-analyst");
  const rn = getCareerBySlug("registered-nurse");
  const mech = getCareerBySlug("mechanical-engineer");
  const elec = getCareerBySlug("electrician");
  const law = getCareerBySlug("lawyer-attorney");

  return (
    <div className="careers-page-v4">
      {/* 1. HERO */}
      <PublicChapter surface="base" rhythm="expansive" width="full" className="cp-hero">
        <div className="ui-width--reading">
          <h1 className="ui-type-display">Explore careers through the work</h1>
          <p className="ui-type-lede">1 career is playable now. 4 more are taking shape.</p>
        </div>
        <ArtifactStage
          emphasis="center"
          provenance={{ career: "Cybersecurity Analyst", kind: "real" }}
          dominant={<ThemedMedia id="a-12" alt="Verdaly Desk OS interface" />}
        />
      </PublicChapter>

      <ChapterSeparator />

      {/* 2. PLAYABLE NOW */}
      <PublicChapter surface="stage" rhythm="stage" width="wide" className="cp-playable-now">
        <div className="cp-chapter-head">
          <h2 className="ui-type-eyebrow" id="playable-now-heading">Playable now</h2>
          <p className="ui-type-hero">{cyber?.title || "Cybersecurity Analyst"}</p>
          <p className="ui-type-body-large">{cyber?.shortSummary}</p>
          <div className="cp-actions">
            <SiteLink to="/start" className="button-primary">Start your first day</SiteLink>
            {cyber && <SiteLink to={careerPath(cyber)} className="button-secondary" aria-label={`${cyber.title} details`}>View career</SiteLink>}
          </div>
        </div>
        <ArtifactStage
          emphasis="center"
          provenance={{ career: "Cybersecurity Analyst", kind: "real" }}
          dominant={<ThemedMedia id="a-01" alt="A-1042 Suspicious login alert" />}
        />
      </PublicChapter>

      <ChapterSeparator />

      {/* 3. TAKING SHAPE */}
      <PublicChapter surface="chapter" rhythm="expansive" width="wide" className="cp-taking-shape">
        <div className="cp-chapter-head ui-width--reading">
          <h2 className="ui-type-eyebrow">Taking shape</h2>
          <p className="ui-type-h1">Four careers in the workshop</p>
          <p className="ui-type-body-large cp-honesty-note">
            These roles show the kinds of decisions you'll make — previews only, for now.
            Local requests help us understand interest, but they stay on your device and don't guarantee build order.
          </p>
        </div>

        <div className="cp-workshop-stack">
          {/* RN */}
          <article className="cp-workshop-career" aria-labelledby="rn-heading">
            <div className="cp-workshop-info">
              <h3 id="rn-heading" className="ui-type-h2">{rn?.title}</h3>
              <p className="ui-type-body">{rn?.shortSummary}</p>
              <CareerRequestToggle careerId="registered-nurse" careerTitle={rn?.title || "Registered Nurse"} />
            </div>
            <ArtifactStage
              emphasis="left"
              dominant={<NurseHandoffSheet />}
              secondary={[<NurseVitalsTrend key="vitals" />]}
            />
          </article>

          {/* Mechanical */}
          <article className="cp-workshop-career" aria-labelledby="mech-heading">
            <div className="cp-workshop-info">
              <h3 id="mech-heading" className="ui-type-h2">{mech?.title}</h3>
              <p className="ui-type-body">{mech?.shortSummary}</p>
              <CareerRequestToggle careerId="mechanical-engineer" careerTitle={mech?.title || "Mechanical Engineer"} />
            </div>
            <ArtifactStage
              emphasis="right"
              dominant={<MechanicalAnnotatedDrawing />}
              secondary={[<MechanicalToleranceCallout key="tol" />]}
            />
          </article>

          {/* Electrician */}
          <article className="cp-workshop-career" aria-labelledby="elec-heading">
            <div className="cp-workshop-info">
              <h3 id="elec-heading" className="ui-type-h2">{elec?.title}</h3>
              <p className="ui-type-body">{elec?.shortSummary}</p>
              <CareerRequestToggle careerId="electrician" careerTitle={elec?.title || "Electrician"} />
            </div>
            <ArtifactStage
              emphasis="left"
              dominant={<ElectricianWiringSchematic />}
              secondary={[<ElectricianVerificationChecklist key="ver" />]}
            />
          </article>

          {/* Lawyer */}
          <article className="cp-workshop-career" aria-labelledby="law-heading">
            <div className="cp-workshop-info">
              <h3 id="law-heading" className="ui-type-h2">{law?.title}</h3>
              <p className="ui-type-body">{law?.shortSummary}</p>
              <CareerRequestToggle careerId="lawyer-attorney" careerTitle={law?.title || "Lawyer"} />
            </div>
            <ArtifactStage
              emphasis="right"
              dominant={<LawyerCaseFactSheet />}
              secondary={[<LawyerRedline key="redline" />]}
            />
          </article>
        </div>
      </PublicChapter>

    </div>
  );
}
