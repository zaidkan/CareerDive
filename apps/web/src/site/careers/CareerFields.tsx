import { careers } from "../../careers/careers.js";
import type { PublicCareer } from "../../careers/types.js";
import { SiteLink } from "../SiteLink.js";

type FieldTone = "cyber" | "nurse" | "mechanical" | "electrician" | "lawyer";

type FieldSpec = {
  tone: FieldTone;
  verbs: readonly string[];
  silhouette: "alert" | "vitals" | "blueprint" | "schematic" | "brief";
};

const FIELD_SPECS: Record<string, FieldSpec> = {
  "cybersecurity-analyst": {
    tone: "cyber",
    verbs: ["Review alerts", "Compare evidence", "Document judgment"],
    silhouette: "alert",
  },
  "registered-nurse": {
    tone: "nurse",
    verbs: ["Notice change", "Prioritize", "Communicate"],
    silhouette: "vitals",
  },
  "mechanical-engineer": {
    tone: "mechanical",
    verbs: ["Read requirements", "Test", "Revise"],
    silhouette: "blueprint",
  },
  electrician: {
    tone: "electrician",
    verbs: ["Read plans", "Diagnose", "Verify"],
    silhouette: "schematic",
  },
  "lawyer-attorney": {
    tone: "lawyer",
    verbs: ["Sort facts", "Research", "Advise"],
    silhouette: "brief",
  },
};

function FieldSilhouette({ shape }: { shape: FieldSpec["silhouette"] }) {
  if (shape === "vitals") {
    return (
      <svg viewBox="0 0 120 44" aria-hidden="true" className="field-glyph">
        <polyline
          points="2,30 18,30 26,12 36,36 46,8 56,30 74,30 84,20 94,32 104,16 118,26"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line x1="2" y1="38" x2="118" y2="38" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      </svg>
    );
  }
  if (shape === "blueprint") {
    return (
      <svg viewBox="0 0 120 44" aria-hidden="true" className="field-glyph">
        <rect x="8" y="6" width="62" height="32" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="39" cy="22" r="9" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <line x1="78" y1="12" x2="112" y2="12" stroke="currentColor" strokeWidth="1.4" />
        <line x1="78" y1="12" x2="78" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="112" y1="12" x2="112" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="80" y1="32" x2="110" y2="32" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <line x1="16" y1="38" x2="62" y2="38" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }
  if (shape === "schematic") {
    return (
      <svg viewBox="0 0 120 44" aria-hidden="true" className="field-glyph">
        <line x1="10" y1="22" x2="34" y2="22" stroke="currentColor" strokeWidth="1.6" />
        <rect x="34" y="12" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <line x1="54" y1="22" x2="76" y2="22" stroke="currentColor" strokeWidth="1.6" />
        <path d="M76 12 L90 22 L76 32 Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <line x1="90" y1="22" x2="110" y2="22" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="110" cy="22" r="2.4" fill="currentColor" />
      </svg>
    );
  }
  if (shape === "brief") {
    return (
      <svg viewBox="0 0 120 44" aria-hidden="true" className="field-glyph">
        <rect x="14" y="4" width="66" height="36" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <line x1="22" y1="13" x2="72" y2="13" stroke="currentColor" strokeWidth="2" opacity="0.7" />
        <line x1="22" y1="21" x2="72" y2="21" stroke="currentColor" strokeWidth="1" opacity="0.45" />
        <line x1="22" y1="28" x2="58" y2="28" stroke="currentColor" strokeWidth="1" opacity="0.45" />
        <line x1="88" y1="8" x2="106" y2="8" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
        <line x1="88" y1="15" x2="106" y2="15" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
        <line x1="88" y1="22" x2="100" y2="22" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 44" aria-hidden="true" className="field-glyph">
      <rect x="10" y="5" width="70" height="34" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="20" cy="14" r="3" fill="currentColor" />
      <line x1="28" y1="14" x2="72" y2="14" stroke="currentColor" strokeWidth="1.6" opacity="0.6" />
      <line x1="16" y1="24" x2="76" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="16" y1="31" x2="56" y2="31" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="90" y1="10" x2="106" y2="10" stroke="currentColor" strokeWidth="1.4" opacity="0.5" />
      <line x1="90" y1="18" x2="106" y2="18" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
    </svg>
  );
}

function FieldCard({ career, spec }: { career: PublicCareer; spec: FieldSpec }) {
  const ready = career.availability === "ready_now";
  return (
    <article className={`field-card field-card--${spec.tone}`}>
      <div className="field-card-glyph" aria-hidden="true">
        <FieldSilhouette shape={spec.silhouette} />
      </div>
      <p className="field-card-field">{career.field}</p>
      <h3 className="field-card-title">{career.title}</h3>
      <p className="field-card-verbs">
        {spec.verbs.map((verb, index) => (
          <span key={verb}>
            {index > 0 ? (
              <span className="field-verb-arrow" aria-hidden="true">
                {" "}
                →{" "}
              </span>
            ) : null}
            {verb}
          </span>
        ))}
      </p>
      <p className={`field-card-status ${ready ? "is-ready" : ""}`}>
        {ready ? "Playable now" : "Workshop concept"}
      </p>
      {ready ? (
        <SiteLink className="field-card-link" to="/start">
          Start this first day <span aria-hidden="true">↗</span>
        </SiteLink>
      ) : null}
    </article>
  );
}

export function CareerFields() {
  return (
    <section
      className="v2-section v2-fields-section"
      aria-labelledby="v2-fields-title"
    >
      <div className="v2-section-intro">
        <h2 id="v2-fields-title">
          Different careers.
          <br />
          Different kinds of work.
        </h2>
        <p>
          Every Career Expo first day follows the same shape. The work changes —
          the judgment does not. One career is playable now; the others show the
          decisions you would make.
        </p>
      </div>
      <div className="field-grid">
        {careers.map((career) => {
          const spec: FieldSpec = FIELD_SPECS[career.id] ?? {
            tone: "cyber",
            verbs: ["Review work", "Make a call", "Leave a record"],
            silhouette: "alert",
          };
          return <FieldCard key={career.id} career={career} spec={spec} />;
        })}
      </div>
      <p className="field-honesty">
        Workshop roles show researched decision sequences as concepts. They are
        not playable yet and no career is ranked above another.
      </p>
    </section>
  );
}
