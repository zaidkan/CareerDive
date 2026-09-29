import { useEffect, useState } from "react";
import { careers } from "../../careers/careers.js";
import {
  ArtifactStage,
  ChapterSeparator,
  PublicChapter,
  ProvenanceLabel,
  useChapterReveal,
  type MediaProvenance,
} from "../ArtDirection.js";
import { HandoffExcerpt } from "../careers/CareerWorkSamples.js";
import {
  ElectricianWiringSchematic,
  LawyerRedline,
  MechanicalAnnotatedDrawing,
  NurseHandoffSheet,
} from "../workshop/index.js";
import { HomeMediaSlot } from "../homeMedia.js";
import { productMedia, type ProductMediaId } from "../productMedia.js";
import { SiteLink } from "../SiteLink.js";

const GATE_KEY = "first-shift-start-gate";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function useHasSeenFilm(): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    try {
      const value = window.sessionStorage.getItem(GATE_KEY);
      setSeen(value === "briefing" || value === "sim");
    } catch {
      // Session storage may be unavailable.
    }
  }, []);
  return seen;
}

function ratioSize(ratio: string): { width: number; height: number } {
  const [w = 1366, h = 900] = ratio
    .split("/")
    .map((part) => Number(part.trim()));
  return { width: w, height: h };
}

/**
 * Real product capture from the audited media set. Theme variants are swapped
 * by CSS; deterministic data-media-slot names are stable media-integration
 * targets. Never render fabricated product UI here.
 */
function ProductCapture({
  id,
  alt,
  slot,
  eager = false,
}: {
  id: ProductMediaId;
  alt: string;
  slot: string;
  eager?: boolean;
}) {
  const media = productMedia[id];
  const variantMap = media.variants as unknown as Record<
    string,
    Record<string, { src: string; aspectRatio: string }> | undefined
  >;
  return (
    <div className="home-capture" data-media-slot={slot}>
      {(["dark", "light"] as const).map((theme) => {
        const variants = variantMap[theme];
        const desktop = variants?.["desktop"];
        if (!desktop) return null;
        const mobile = variants["mobile"];
        const size = ratioSize(desktop.aspectRatio);
        return (
          <picture
            key={theme}
            className={`home-capture-theme home-capture-theme--${theme}`}
          >
            {mobile ? (
              <source
                media="(max-width: 600px)"
                srcSet={mobile.src}
                width={ratioSize(mobile.aspectRatio).width}
                height={ratioSize(mobile.aspectRatio).height}
              />
            ) : null}
            <img
              src={desktop.src}
              alt={alt}
              width={size.width}
              height={size.height}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
            />
          </picture>
        );
      })}
    </div>
  );
}

const CYBER_PROVENANCE: MediaProvenance = {
  career: "Cybersecurity Analyst",
  kind: "real",
};

const SHIFT_ACTS = [
  { act: "Prepare", claim: "Context first. Then the actual work." },
  { act: "Decide", claim: "You decide before the picture is complete." },
  {
    act: "Pass it on",
    claim: "The work isn't done until someone else can continue it.",
  },
] as const;

/** One alert, one proof at a time. Labels swap the view manually — no autoplay. */
const EVIDENCE_VIEWS = [
  {
    key: "alert",
    label: "Alert A-1042",
    id: "a-01",
    slot: "home-case-a1042",
    caption: "Alert record · A-1042 — actual product capture, synthetic records",
    alt: "Product capture: alert record A-1042, a sign-in from an unfamiliar device, open for review.",
  },
  {
    key: "signin",
    label: "Sign-in",
    id: "a-02",
    slot: "home-evidence-auth",
    caption: "Sign-in record · S-0741 — actual product capture, synthetic records",
    alt: "Product capture: the sign-in record for session S-0741, from the Cybersecurity Analyst first day.",
  },
  {
    key: "device",
    label: "Device",
    id: "a-03",
    slot: "home-evidence-device",
    caption:
      "Device inventory · unknown-laptop-17 — actual product capture, synthetic records",
    alt: "Product capture: the device inventory record for the unfamiliar laptop, from the Cybersecurity Analyst first day.",
  },
  {
    key: "account",
    label: "Account",
    id: "a-04",
    slot: "home-evidence-account",
    caption:
      "Account history · A-1042 review — actual product capture, synthetic records",
    alt: "Product capture: the account history opened during the A-1042 review, from the Cybersecurity Analyst first day.",
  },
  {
    key: "vpn",
    label: "VPN",
    id: "a-05",
    slot: "home-evidence-vpn",
    caption: "VPN record · V-218 — actual product capture, synthetic records",
    alt: "Product capture: the VPN access record V-218, from the Cybersecurity Analyst first day.",
  },
] as const;

type EvidenceKey = (typeof EVIDENCE_VIEWS)[number]["key"];

const CAREER_SHOWCASE = [
  {
    careerId: "registered-nurse",
    workObject: "Handoff sheet · 07:00 report",
    statement: "Notice the change. Communicate it clearly.",
    artifact: <NurseHandoffSheet />,
    provenance: { career: "Registered Nurse", kind: "workshop" },
  },
  {
    careerId: "mechanical-engineer",
    workObject: "Annotated drawing · MB-204 bracket",
    statement: "Read the result. Decide what needs revision.",
    artifact: <MechanicalAnnotatedDrawing />,
    provenance: { career: "Mechanical Engineer", kind: "workshop" },
  },
  {
    careerId: "electrician",
    workObject: "Wiring schematic · Panel L2",
    statement: "Spot the hazard. Decide how the work proceeds.",
    artifact: <ElectricianWiringSchematic />,
    provenance: { career: "Electrician", kind: "workshop" },
  },
  {
    careerId: "lawyer-attorney",
    workObject: "Contract redline · Clause 7.2",
    statement: "Separate settled facts from open questions.",
    artifact: <LawyerRedline />,
    provenance: { career: "Lawyer", kind: "workshop" },
  },
  {
    careerId: "cybersecurity-analyst",
    workObject: "Alert record · A-1042",
    statement: "Compare the records. Say what the evidence supports.",
    artifact: (
      <ProductCapture
        id="a-01"
        slot="home-career-artifact-cybersecurity-analyst"
        alt=""
      />
    ),
    provenance: CYBER_PROVENANCE,
  },
] as const;

/** One full pass through the careers, then it settles on Cyber for good. */
const CAREER_SWITCH_MS = 4000;

const HOME_FAQ = [
  {
    q: "How long does it take?",
    a: "About 10–15 minutes. It's one shift: read the handoff, check an alert, write it up, hand it off.",
  },
  {
    q: "Is this a career test?",
    a: "No. You try selected tasks and reflect on the experience. Career Expo never tells you which career to choose.",
  },
  {
    q: "Are all these careers playable?",
    a: "One is. Cybersecurity Analyst has a playable first shift; the other four are Workshop previews for now.",
  },
] as const;

export function LandingPage() {
  const hasSeenFilm = useHasSeenFilm();
  const heroRef = useChapterReveal<HTMLDivElement>();
  const realWorkRef = useChapterReveal<HTMLDivElement>();
  const shiftRef = useChapterReveal<HTMLDivElement>();
  const handoffRef = useChapterReveal<HTMLDivElement>();
  const careerRef = useChapterReveal<HTMLDivElement>();
  const reflectRef = useChapterReveal<HTMLDivElement>();
  const faqRef = useChapterReveal<HTMLDivElement>();
  const finalRef = useChapterReveal<HTMLDivElement>();

  const [evidence, setEvidence] = useState<EvidenceKey>("alert");
  const [careerPanels, setCareerPanels] = useState(() => ({
    active: prefersReducedMotion() ? CAREER_SHOWCASE.length - 1 : 0,
    departing: null as number | null,
  }));
  const [autoCycling, setAutoCycling] = useState(!prefersReducedMotion());

  useEffect(() => {
    if (!autoCycling) return;
    if (careerPanels.active >= CAREER_SHOWCASE.length - 1) {
      setAutoCycling(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setCareerPanels((current) => ({
        active: Math.min(current.active + 1, CAREER_SHOWCASE.length - 1),
        departing: current.active,
      }));
    }, CAREER_SWITCH_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [autoCycling, careerPanels.active]);

  useEffect(() => {
    if (careerPanels.departing === null) return;
    const timer = window.setTimeout(() => {
      setCareerPanels((current) => ({ ...current, departing: null }));
    }, 280);
    return () => {
      window.clearTimeout(timer);
    };
  }, [careerPanels.departing]);

  const selectCareer = (index: number) => {
    setCareerPanels((current) =>
      current.active === index
        ? current
        : { active: index, departing: current.active },
    );
  };

  const startLabel = hasSeenFilm
    ? "Continue your first day"
    : "Start your first day";
  const activeEvidence =
    EVIDENCE_VIEWS.find((view) => view.key === evidence) ?? EVIDENCE_VIEWS[0];

  return (
    <div className="v2-home">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <PublicChapter
          as="div"
          surface="base"
          rhythm="expansive"
          className="home-hero-chapter"
        >
          <div
            ref={heroRef}
            data-motion="chapter-reveal"
            className="home-hero-grid ui-editorial-split"
          >
            <div className="home-hero-copy">
              <h1 id="home-hero-title" data-motion-role="argument">
                Know the work before you choose the career.
              </h1>
              <p className="ui-type-proof">
                You can read about a career — or step into its first shift.
              </p>
              <div className="home-hero-actions">
                <SiteLink className="start-shift v2-primary" to="/start">
                  {startLabel}
                  <span aria-hidden="true"> ↗</span>
                </SiteLink>
                <SiteLink className="v2-text-link" to="/careers">
                  Explore careers <span aria-hidden="true">→</span>
                </SiteLink>
              </div>
              <p className="home-hero-meta">
                <strong>Playable now</strong> · ~10–15 min
              </p>
            </div>
            <div data-motion-role="artifact" className="home-hero-stage">
              <ArtifactStage
                dominant={
                  <HomeMediaSlot slotId="home-media-arrival" eager hideCaption />
                }
                caption="Actual product capture · synthetic records"
                provenance={CYBER_PROVENANCE}
              />
            </div>
          </div>
          <ul className="home-rail" aria-label="Career areas">
            {careers.map((career) => (
              <li key={career.id}>
                <span className="home-rail-field">{career.field}</span>
                <strong>{career.title}</strong>
              </li>
            ))}
          </ul>
        </PublicChapter>
      </section>

      <section className="home-realwork" aria-labelledby="home-realwork-title">
        <PublicChapter
          as="div"
          surface="chapter"
          rhythm="stage"
          className="home-realwork-chapter"
        >
          <div
            ref={realWorkRef}
            data-motion="chapter-reveal"
            className="home-realwork-intro"
          >
            <h2 id="home-realwork-title" data-motion-role="argument">
              Real work, not a job description.
            </h2>
            <p className="ui-type-proof">
              One alert. Four records to compare. A call you have to justify.
            </p>
          </div>
          <ArtifactStage
            className="home-realwork-stage"
            dominant={
              <div className="home-evidence-views">
                {EVIDENCE_VIEWS.map((view) => (
                  <div key={view.key} hidden={evidence !== view.key}>
                    <ProductCapture
                      id={view.id}
                      slot={view.slot}
                      alt={view.alt}
                    />
                  </div>
                ))}
              </div>
            }
            caption={activeEvidence.caption}
            provenance={CYBER_PROVENANCE}
          />
          <div className="home-evidence-bar">
            <div
              className="home-evidence-swap"
              role="group"
              aria-label="Evidence views for alert A-1042"
            >
              {EVIDENCE_VIEWS.map((view) => (
                <button
                  key={view.key}
                  type="button"
                  aria-pressed={evidence === view.key}
                  onClick={() => {
                    setEvidence(view.key);
                  }}
                >
                  {view.label}
                </button>
              ))}
            </div>
            <p className="home-evidence-note">
              Sign-in <span aria-hidden="true">·</span> Device{" "}
              <span aria-hidden="true">·</span> Account{" "}
              <span aria-hidden="true">·</span> VPN — one record at a time.
            </p>
          </div>
        </PublicChapter>
      </section>

      <section className="home-shift" aria-labelledby="home-shift-title">
        <PublicChapter
          as="div"
          surface="base"
          rhythm="standard"
          className="home-shift-chapter"
        >
          <div ref={shiftRef} data-motion="chapter-reveal">
            <h2 id="home-shift-title" data-motion-role="argument">
              How a shift works
            </h2>
            <p className="ui-type-proof">
              Every Career Expo first day follows the same shape. The work
              changes — the judgment does not.
            </p>
            <ol className="home-acts">
              {SHIFT_ACTS.map((entry) => (
                <li key={entry.act}>
                  <h3>{entry.act}</h3>
                  <p className="home-act-claim">{entry.claim}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="home-desk">
            <p className="home-desk-note">The work happens at a desk.</p>
            <HomeMediaSlot slotId="home-media-workplace" />
          </div>
          <div className="home-handoff">
            <div ref={handoffRef} data-motion="handoff-pass">
              <div data-motion-role="document">
                <ProductCapture
                  id="a-08"
                  slot="home-handoff-pass"
                  alt="Product capture: the night analyst's handoff email, read at the start of the shift."
                />
                <p className="home-media-note">
                  Handoff · actual product capture, synthetic records
                </p>
              </div>
            </div>
            <div className="home-handoff-words">
              <p className="home-pullquote">
                Your shift ends. The work does not.
              </p>
              <HandoffExcerpt />
            </div>
          </div>
        </PublicChapter>
      </section>

      <section className="home-careers" aria-labelledby="home-careers-title">
        <PublicChapter
          as="div"
          surface="stage"
          rhythm="standard"
          className="home-careers-chapter"
        >
          <div
            onPointerDown={() => {
              setAutoCycling(false);
            }}
            onKeyDown={() => {
              setAutoCycling(false);
            }}
          >
            <div data-motion="chapter-reveal">
              <h2 id="home-careers-title" data-motion-role="argument">
                Different careers. Different work.
              </h2>
              <p className="ui-type-proof">
                One playable now. Four taking shape.
              </p>
            </div>
            <div className="home-career-tabs" role="group" aria-label="Careers">
              {CAREER_SHOWCASE.map((entry, index) => {
                const career = careers.find(
                  (item) => item.id === entry.careerId,
                );
                if (!career) return null;
                return (
                  <button
                    key={entry.careerId}
                    type="button"
                    className="home-career-tab"
                    aria-pressed={careerPanels.active === index}
                    onClick={() => {
                      setAutoCycling(false);
                      selectCareer(index);
                    }}
                  >
                    {career.title}
                  </button>
                );
              })}
            </div>
            <div
              className="home-career-stage"
              data-motion="career-switch"
              ref={careerRef}
            >
              {CAREER_SHOWCASE.map((entry, index) => {
                const career = careers.find(
                  (item) => item.id === entry.careerId,
                );
                if (!career) return null;
                const state =
                  index === careerPanels.active
                    ? "active"
                    : index === careerPanels.departing
                      ? "departing"
                      : "inactive";
                return (
                  <div
                    key={entry.careerId}
                    className="home-career-panel"
                    data-career={state}
                    data-media-slot={`career-artifact-${career.slug}`}
                    aria-hidden={state !== "active"}
                  >
                    <div className="home-career-plate" aria-hidden="true">
                      {entry.artifact}
                    </div>
                    <p className="home-career-field">{career.field}</p>
                    <h3>{career.title}</h3>
                    <p className="home-career-statement">{entry.statement}</p>
                    <p className="home-career-object ui-type-technical">
                      {entry.workObject}
                    </p>
                    <ProvenanceLabel provenance={entry.provenance} />
                  </div>
                );
              })}
            </div>
            <p>
              <SiteLink className="v2-text-link" to="/careers">
                Explore careers <span aria-hidden="true">→</span>
              </SiteLink>
            </p>
          </div>
        </PublicChapter>
      </section>

      <section className="home-story" aria-label="Inside the security operations floor">
        <PublicChapter
          as="div"
          surface="base"
          rhythm="compact"
          width="full"
          className="home-story-chapter"
        >
          <HomeMediaSlot slotId="home-media-story" />
        </PublicChapter>
      </section>

      <section className="home-reflect" aria-labelledby="home-reflect-title">
        <PublicChapter
          as="div"
          surface="chapter"
          rhythm="standard"
          width="reading"
          className="home-reflect-chapter"
        >
          <div ref={reflectRef} data-motion="chapter-reveal">
            <h2 id="home-reflect-title" data-motion-role="argument">
              See how you worked.
            </h2>
            <p className="ui-type-proof">
              Not a score. A record of the calls you made.
            </p>
            <div className="home-debrief-crop">
              <ProductCapture
                id="a-10"
                slot="home-debrief-reflection"
                alt="Product capture: one decision block from the shift debrief, reviewing what happened and what stayed uncertain."
              />
            </div>
            <p className="home-media-note">
              Shift debrief · actual product capture, synthetic records
            </p>
            <p>
              <SiteLink className="v2-text-link" to="/trust">
                Privacy and safety <span aria-hidden="true">→</span>
              </SiteLink>
            </p>
          </div>
        </PublicChapter>
      </section>

      <ChapterSeparator />

      <section className="home-faq" aria-labelledby="home-faq-title">
        <PublicChapter
          as="div"
          surface="base"
          rhythm="compact"
          className="home-faq-chapter"
        >
          <div ref={faqRef} data-motion="chapter-reveal">
            <h2 id="home-faq-title" data-motion-role="argument">
              Questions, answered plainly.
            </h2>
            <div className="v2-faq-list">
              {HOME_FAQ.map(({ q, a }) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
            <p>
              <SiteLink className="v2-text-link" to="/faq">
                More questions <span aria-hidden="true">→</span>
              </SiteLink>
            </p>
          </div>
        </PublicChapter>
      </section>

      <section className="home-final" aria-labelledby="home-final-title">
        <PublicChapter
          as="div"
          surface="finale"
          rhythm="final"
          width="wide"
          className="home-final-chapter"
        >
          <div
            ref={finalRef}
            data-motion="chapter-reveal"
            className="home-final-inner"
          >
            <h2 id="home-final-title" data-motion-role="argument">
              One short day. One real first shift.
            </h2>
            <p>
              Try the work <span aria-hidden="true">→</span> Make the calls{" "}
              <span aria-hidden="true">→</span> See how you worked
            </p>
            <div className="home-final-actions">
              <SiteLink className="start-shift v2-primary" to="/start">
                {startLabel}
                <span aria-hidden="true"> ↗</span>
              </SiteLink>
              <SiteLink className="v2-text-link" to="/careers">
                Explore careers <span aria-hidden="true">→</span>
              </SiteLink>
            </div>
          </div>
        </PublicChapter>
      </section>
    </div>
  );
}
