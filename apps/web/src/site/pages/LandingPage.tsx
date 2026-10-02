import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { PublicCareer } from "../../careers/types.js";
import {
  availabilityLabel,
  FIRST_SHIFT_DURATION_COMPACT,
} from "../../careers/publicCopy.js";
import { HOME_FAQ } from "../faqData.js";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { careers } from "../../careers/careers.js";
import {
  ArtifactStage,
  ChapterSeparator,
  PublicChapter,
  MotionReveal,
  ScrollArrival,
  type MediaProvenance,
} from "../ArtDirection.js";
import { HandoffExcerpt } from "../careers/CareerWorkSamples.js";
import {
  ElectricianWiringSchematic,
  LawyerRedline,
  MechanicalAnnotatedDrawing,
  NurseHandoffSheet,
} from "../workshop/index.js";
import { hasHomeMedia, HomeMediaSlot } from "../homeMedia.js";
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

type CareerAction =
  | { kind: "link"; href: NonNullable<PublicCareer["simulationRoute"]> }
  | { kind: "disabled"; label: string };

/**
 * Career-aware CTA. A playable career with a route gets an active action; every
 * other career gets a concise "Taking shape" state that never launches Cyber.
 * Adding a future career route is a data change, not a component change.
 */
function careerAction(career: {
  availability: string;
  simulationRoute?: PublicCareer["simulationRoute"];
}): CareerAction {
  if (career.availability === "ready_now" && career.simulationRoute) {
    return { kind: "link", href: career.simulationRoute };
  }
  return { kind: "disabled", label: "Taking shape" };
}

function heroCue(careerId: string): string {
  return HERO_CARDS.find((card) => card.careerId === careerId)?.cue ?? "";
}

const SHIFT_ACTS = [
  { act: "Prepare", claim: "Context first. Then the actual work." },
  { act: "Decide", claim: "You decide before the picture is complete." },
  {
    act: "Pass it on",
    claim: "The work isn't done until someone else can continue it.",
  },
] as const;

/**
 * Real Work is a PREVIEW: the alert plus ONE supporting evidence transition.
 * The simulation owns discovery — the homepage establishes that real work
 * exists, it does not walk through the whole investigation.
 */
const EVIDENCE_VIEWS = [
  {
    key: "alert",
    label: "Alert A-1042",
    id: "a-01",
    slot: "home-case-a1042",
    caption: "Alert record · A-1042",
    alt: "Product capture: alert record A-1042, a sign-in from an unfamiliar device, open for review.",
  },
  {
    key: "signin",
    label: "Sign-in record",
    id: "a-02",
    slot: "home-evidence-auth",
    caption: "Sign-in record · S-0741",
    alt: "Product capture: the sign-in record for session S-0741, from the Cybersecurity Analyst first day.",
  },
] as const;

type EvidenceKey = (typeof EVIDENCE_VIEWS)[number]["key"];

/**
 * Compact hero cards: career name, field, availability, and one restrained
 * visual cue. No detailed artifacts here — the hero states what exists.
 */
const HERO_CARDS = [
  { careerId: "cybersecurity-analyst", cue: "CY" },
  { careerId: "registered-nurse", cue: "RN" },
  { careerId: "mechanical-engineer", cue: "ME" },
  { careerId: "electrician", cue: "EL" },
  { careerId: "lawyer-attorney", cue: "LA" },
] as const;

/** Cards rearrange once through the sequence (~12s), then settle on Cyber. */
const HERO_CARD_STEP_MS = 2000;

const CAREER_SHOWCASE = [
  {
    careerId: "cybersecurity-analyst",
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
  {
    careerId: "registered-nurse",
    statement: "Notice the change. Communicate it clearly.",
    artifact: <NurseHandoffSheet />,
    provenance: { career: "Registered Nurse", kind: "workshop" },
  },
  {
    careerId: "mechanical-engineer",
    statement: "Read the result. Decide what needs revision.",
    artifact: <MechanicalAnnotatedDrawing />,
    provenance: { career: "Mechanical Engineer", kind: "workshop" },
  },
  {
    careerId: "electrician",
    statement: "Spot the hazard. Decide how the work proceeds.",
    artifact: <ElectricianWiringSchematic />,
    provenance: { career: "Electrician", kind: "workshop" },
  },
  {
    careerId: "lawyer-attorney",
    statement: "Separate settled facts from open questions.",
    artifact: <LawyerRedline />,
    provenance: { career: "Lawyer", kind: "workshop" },
  },
] as const;

function ShiftStep({
  entry,
  index,
  progress,
}: {
  entry: (typeof SHIFT_ACTS)[number];
  index: number;
  progress: MotionValue<number>;
}) {
  const reduced = useReducedMotion();
  const emphasis = useTransform(progress, [0, 1], [0, 2]);
  const opacity = useTransform(
    emphasis,
    (value) => 1 - Math.min(1, Math.abs(value - index)) * 0.48,
  );
  const y = useTransform(
    emphasis,
    (value) => Math.min(1, Math.abs(value - index)) * 18,
  );
  const scale = useTransform(
    emphasis,
    (value) => 1 - Math.min(1, Math.abs(value - index)) * 0.035,
  );
  return (
    <motion.li style={reduced ? {} : { opacity, y, scale }}>
      <h3>{entry.act}</h3>
      <p className="home-act-claim">{entry.claim}</p>
    </motion.li>
  );
}

function CareerDepth({
  index,
  progress,
  active,
  children,
  careerSlug,
}: {
  index: number;
  progress: MotionValue<number>;
  active: boolean;
  children: ReactNode;
  careerSlug: string;
}) {
  const reduced = useReducedMotion();
  const distance = useTransform(progress, (value) => index - value);
  const y = useTransform(distance, [-1, 0, 1], [-46, 0, 64]);
  const scale = useTransform(distance, [-1, 0, 1], [0.97, 1, 0.98]);
  const opacity = useTransform(
    distance,
    [-1, -0.5, 0, 0.5, 1],
    [0, 0.45, 1, 0.45, 0],
  );
  return (
    <motion.div
      className="home-career-panel"
      data-career={active ? "active" : "inactive"}
      data-media-slot={`career-artifact-${careerSlug}`}
      aria-hidden={!active}
      style={reduced ? { opacity: active ? 1 : 0 } : { y, scale, opacity }}
    >
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  const hasSeenFilm = useHasSeenFilm();
  const careerRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const dragX = useMotionValue(0);
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(
    null,
  );
  const dragged = useRef(false);
  const careerControlled = useRef<number | null>(null);
  const careerProgress = useMotionValue(0);
  const careerIndex = useRef(0);
  const shiftRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress: shiftProgress } = useScroll({
    target: shiftRef,
    offset: ["start 75%", "end 35%"],
  });
  const { scrollYProgress } = useScroll({
    target: careerRef,
    offset: ["start start", "end end"],
  });

  const [evidence, setEvidence] = useState<EvidenceKey>("alert");
  // Hero cards: one finite rearrangement cycle, settling on Cyber.
  const [heroActive, setHeroActive] = useState(0);
  const [heroStep, setHeroStep] = useState(0);
  const [heroAuto, setHeroAuto] = useState(() => !prefersReducedMotion());

  const heroCardRefs = useRef(new Map<number, HTMLButtonElement>());
  // Detailed switcher: scroll sequence, overridden by deliberate selection.
  const [careerPanels, setCareerPanels] = useState(() => ({
    active: 0,
  }));

  useEffect(() => {
    if (reduceMotion) setHeroAuto(false);
  }, [reduceMotion]);

  useEffect(() => {
    const stop = () => {
      setHeroAuto(false);
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const event of events)
      document.addEventListener(event, stop, {
        once: true,
        passive: true,
        capture: true,
      });
    const onVisibility = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      for (const event of events)
        document.removeEventListener(event, stop, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (reduceMotion) return;
    const position = progress * 4;
    const index = Math.min(4, Math.round(position));
    // Manual choice holds until scroll enters another career's interval.
    if (careerControlled.current === index) return;
    careerControlled.current = null;
    careerProgress.stop();
    careerProgress.set(position);
    if (careerIndex.current !== index) {
      careerIndex.current = index;
      setCareerPanels({ active: index });
    }
  });

  useEffect(() => {
    if (!heroAuto || reduceMotion) return;
    const nextStep = heroStep + 1;
    if (nextStep > HERO_CARDS.length) {
      setHeroAuto(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setHeroActive(nextStep % HERO_CARDS.length);
      setHeroStep(nextStep);
    }, HERO_CARD_STEP_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [heroAuto, heroStep, reduceMotion]);

  const selectCareer = (index: number) => {
    careerControlled.current = Math.round(scrollYProgress.get() * 4);
    if (reduceMotion) careerProgress.set(index);
    else
      void animate(careerProgress, index, {
        duration: 0.42,
        ease: [0.16, 1, 0.3, 1],
      });
    careerIndex.current = index;
    setCareerPanels({ active: index });
  };

  const startLabel = hasSeenFilm
    ? "Continue your first day"
    : "Start your first day";
  const heroCareer = careers.find(
    (item) => item.id === HERO_CARDS[heroActive]?.careerId,
  );
  const heroAction = heroCareer
    ? careerAction(heroCareer)
    : { kind: "disabled" as const, label: "Taking shape" };
  const activeShowcase =
    CAREER_SHOWCASE[careerPanels.active] ?? CAREER_SHOWCASE[0];
  const activeCareer = careers.find(
    (item) => item.id === activeShowcase.careerId,
  );
  const activeAction: CareerAction = activeCareer
    ? careerAction(activeCareer)
    : { kind: "disabled", label: "Taking shape" };
  const activeEvidence =
    EVIDENCE_VIEWS.find((view) => view.key === evidence) ?? EVIDENCE_VIEWS[0];

  return (
    <div className="v2-home">
      <section
        className="home-hero"
        aria-labelledby="home-hero-title"
        onPointerDownCapture={() => {
          setHeroAuto(false);
        }}
        onKeyDownCapture={() => {
          setHeroAuto(false);
        }}
        onFocusCapture={() => {
          setHeroAuto(false);
        }}
      >
        <PublicChapter
          as="div"
          surface="base"
          rhythm="expansive"
          className="home-hero-chapter"
        >
          <div className="home-hero-grid ui-editorial-split">
            <div className="home-hero-copy">
              <h1 id="home-hero-title">
                {"Know the work before you choose the career."
                  .split(" ")
                  .map((word, index) => (
                    <motion.span
                      key={`${word}-${String(index)}`}
                      className="home-headline-word"
                      initial={reduceMotion ? false : { opacity: 1, y: 0 }}
                      animate={
                        reduceMotion
                          ? { opacity: 1, y: 0 }
                          : { opacity: [0, 1], y: [12, 0] }
                      }
                      transition={{
                        duration: 0.4,
                        delay: index * 0.035,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      {word}
                      {index < 8 ? " " : ""}
                    </motion.span>
                  ))}
              </h1>
              <p className="ui-type-proof">
                You can read about a career — or step into its first shift.
              </p>
              <div className="home-hero-actions">
                {heroAction.kind === "link" ? (
                  <SiteLink
                    className="start-shift v2-primary"
                    to={heroAction.href}
                  >
                    {startLabel}
                    <span aria-hidden="true"> ↗</span>
                  </SiteLink>
                ) : (
                  <button
                    type="button"
                    className="start-shift v2-primary home-career-cta-disabled"
                    disabled
                  >
                    Taking shape
                  </button>
                )}
                <SiteLink className="v2-text-link" to="/careers">
                  Explore careers <span aria-hidden="true">→</span>
                </SiteLink>
              </div>
              <p className="home-hero-meta">
                <strong>{FIRST_SHIFT_DURATION_COMPACT}</strong> · one first
                shift
              </p>
            </div>
            <div data-motion-role="artifact" className="home-hero-stage">
              <div
                className="home-hero-cards"
                role="group"
                aria-label="Careers at Career Expo"
                onFocusCapture={() => {
                  setHeroAuto(false);
                }}
                onPointerDown={(event) => {
                  setHeroAuto(false);
                  if (event.button > 0) return;
                  dragged.current = false;
                  pointerStart.current = {
                    x: event.clientX,
                    y: event.clientY,
                    id: event.pointerId,
                  };
                }}
                onPointerMove={(event) => {
                  const start = pointerStart.current;
                  if (!start || start.id !== event.pointerId) return;
                  const dx = event.clientX - start.x;
                  if (
                    Math.abs(dx) < 10 ||
                    Math.abs(dx) < Math.abs(event.clientY - start.y)
                  )
                    return;
                  dragged.current = true;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  if (!reduceMotion)
                    dragX.set(Math.max(-60, Math.min(60, dx * 0.3)));
                }}
                onPointerUp={(event) => {
                  const start = pointerStart.current;
                  if (!start) return;
                  const dx = event.clientX - start.x;
                  if (dragged.current && Math.abs(dx) > 35) {
                    setHeroActive((current) =>
                      Math.max(0, Math.min(4, current + (dx < 0 ? 1 : -1))),
                    );
                  }
                  pointerStart.current = null;
                  if (reduceMotion) dragX.set(0);
                  else
                    void animate(dragX, 0, {
                      type: "spring",
                      stiffness: 260,
                      damping: 28,
                    });
                }}
                onPointerCancel={() => {
                  pointerStart.current = null;
                  dragX.set(0);
                }}
                onKeyDown={(event) => {
                  setHeroAuto(false);
                  let next = heroActive;
                  if (event.key === "ArrowRight" || event.key === "ArrowDown")
                    next = Math.min(4, heroActive + 1);
                  else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
                    next = Math.max(0, heroActive - 1);
                  else if (event.key === "Home") next = 0;
                  else if (event.key === "End") next = 4;
                  else return;
                  event.preventDefault();
                  setHeroActive(next);
                  heroCardRefs.current.get(next)?.focus();
                }}
              >
                {HERO_CARDS.map((card, index) => {
                  const career = careers.find(
                    (item) => item.id === card.careerId,
                  );
                  if (!career) return null;
                  const emphasized = heroActive === index;
                  return (
                    <motion.button
                      key={card.careerId}
                      type="button"
                      className="home-hero-card"
                      data-emphasis={emphasized ? "true" : "false"}
                      data-slot={index}
                      style={{
                        x:
                          emphasized && !reduceMotion
                            ? dragX
                            : (["6%", "-8%", "10%", "-4%", "2%"][index] ?? 0),
                        zIndex: emphasized ? 6 : index + 1,
                      }}
                      initial={false}
                      animate={{
                        y: reduceMotion
                          ? index === 0
                            ? "50%"
                            : 0
                          : emphasized
                            ? `${String([50, 24, -4, -32, -62][index] ?? 0)}%`
                            : 0,
                        rotate: reduceMotion
                          ? index === 0
                            ? 0
                            : ([5, -4, 3, -2, 1][index] ?? 0)
                          : emphasized
                            ? 0
                            : ([5, -4, 3, -2, 1][index] ?? 0),
                        scale: reduceMotion
                          ? index === 0
                            ? 1.04
                            : 0.96
                          : emphasized
                            ? 1.04
                            : 0.96,
                        opacity: emphasized
                          ? 1
                          : ([0.62, 0.75, 0.85, 0.92, 1][index] ?? 1),
                      }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 190, damping: 27 }
                      }
                      aria-pressed={emphasized}
                      ref={(el) => {
                        if (el) heroCardRefs.current.set(index, el);
                        else heroCardRefs.current.delete(index);
                      }}
                      onClick={() => {
                        setHeroAuto(false);
                        if (dragged.current) {
                          dragged.current = false;
                          return;
                        }
                        setHeroActive(index);
                      }}
                    >
                      <span className="home-hero-card-surface">
                        <span className="home-hero-card-cue" aria-hidden="true">
                          {card.cue}
                        </span>
                        <span className="home-hero-card-name">
                          {career.title}
                        </span>
                        <span className="home-hero-card-field">
                          {career.field}
                        </span>
                        <span className="home-hero-card-status">
                          {availabilityLabel(career.availability)}
                        </span>
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              <div
                className="home-shelf-selectors"
                role="group"
                aria-label="Select a career"
              >
                {HERO_CARDS.map((card, index) => (
                  <button
                    key={card.careerId}
                    type="button"
                    aria-label={
                      careers.find((career) => career.id === card.careerId)
                        ?.title
                    }
                    aria-pressed={heroActive === index}
                    onFocus={() => {
                      setHeroAuto(false);
                    }}
                    onClick={() => {
                      setHeroAuto(false);
                      setHeroActive(index);
                    }}
                  >
                    {card.cue}
                  </button>
                ))}
              </div>
              <p className="home-shelf-helper">
                Pick one. See what the work feels like.
              </p>
              <div className="home-shelf-intro-control">
                {heroAuto && !reduceMotion ? (
                  <button
                    type="button"
                    onClick={() => {
                      setHeroAuto(false);
                    }}
                  >
                    Pause introduction
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </PublicChapter>
      </section>

      <section
        className="home-place"
        aria-label="The Verdaly security operations floor"
      >
        <PublicChapter
          as="div"
          surface="base"
          rhythm="compact"
          width="full"
          className="home-place-chapter"
        >
          <ScrollArrival className="home-place-crop" y={52} scale={0.94} opacity={0.75}>
            <HomeMediaSlot slotId="home-media-arrival" eager hideCaption />
          </ScrollArrival>
          <MotionReveal delay={0.12}>
            <p className="home-media-note">Actual product capture · synthetic records <span aria-hidden="true">·</span> Cybersecurity Analyst · Playable now</p>
          </MotionReveal>
        </PublicChapter>
      </section>

      <section className="home-realwork" aria-labelledby="home-realwork-title">
        <PublicChapter
          as="div"
          surface="chapter"
          rhythm="stage"
          className="home-realwork-chapter"
        >
          <div>
            <div className="home-realwork-intro">
              <MotionReveal>
              <h2 id="home-realwork-title" data-motion-role="argument">
                Real work, not a job description.
              </h2>
              </MotionReveal>
              <MotionReveal delay={0.12}>
                <p className="ui-type-proof">
                  One alert. A decision you have to justify.
                </p>
              </MotionReveal>
            </div>
            <ScrollArrival y={48} scale={0.96}>
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
            />
            </ScrollArrival>
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
                Actual product capture · synthetic records.
              </p>
            </div>
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
          <MotionReveal>
            <h2 id="home-shift-title" data-motion-role="argument">
              How a shift works
            </h2>
            <ol ref={shiftRef} className="home-acts">
              {SHIFT_ACTS.map((entry, index) => (
                <ShiftStep key={entry.act} entry={entry} index={index} progress={shiftProgress} />
              ))}
            </ol>
          </MotionReveal>
        </PublicChapter>
      </section>

      <section className="home-handoff" aria-labelledby="home-handoff-title">
        <PublicChapter
          as="div"
          surface="chapter"
          rhythm="standard"
          className="home-handoff-chapter"
        >
          <div className="home-handoff-grid">
            <MotionReveal className="home-handoff-copy">
              <h2 id="home-handoff-title" data-motion-role="argument">
                Your shift ends. The work does not.
              </h2>
              <p className="ui-type-proof">
                You won’t finish everything. Before you leave, you record what
                you found and what the next analyst still needs to check.
              </p>
            </MotionReveal>
            <ScrollArrival y={32} scale={0.97}>
              <div data-motion-role="artifact"><HandoffExcerpt /></div>
            </ScrollArrival>
          </div>
        </PublicChapter>
      </section>

      <section
        ref={careerRef}
        className="home-careers"
        data-scroll-motion={reduceMotion ? "off" : "on"}
        aria-labelledby="home-careers-title"
      >
        <PublicChapter
          as="div"
          surface="stage"
          rhythm="standard"
          className="home-careers-chapter"
        >
          <div className="home-careers-sticky">
            <MotionReveal>
              <h2 id="home-careers-title" data-motion-role="argument">
                Different careers. Different work.
              </h2>
              <p className="ui-type-proof">
                One playable now. Four taking shape.
              </p>
            </MotionReveal>
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
                    aria-label={career.title}
                    aria-pressed={careerPanels.active === index}
                    onClick={() => {
                      selectCareer(index);
                    }}
                  >
                    <span className="home-career-tab-cue" aria-hidden="true">
                      {heroCue(career.id)}
                    </span>
                    <span className="home-career-tab-name">{career.title}</span>
                  </button>
                );
              })}
            </div>
            <div className="home-career-stage" data-motion="career-switch">
              {CAREER_SHOWCASE.map((entry, index) => {
                const career = careers.find(
                  (item) => item.id === entry.careerId,
                );
                if (!career) return null;
                const state =
                  index === careerPanels.active ? "active" : "inactive";
                return (
                  <CareerDepth
                    key={entry.careerId}
                    index={index}
                    progress={careerProgress}
                    active={state === "active"}
                    careerSlug={career.slug}
                  >
                    <div className="home-career-plate" aria-hidden="true">
                      {entry.artifact}
                    </div>
                    <h3>{career.title}</h3>
                    <p className="home-career-statement">{entry.statement}</p>
                    {/* One truth label per artifact block — provenance, not
                        availability. Availability lives in the CTA. */}
                    <span className="ui-provenance home-career-provenance">
                      {entry.provenance.kind === "real"
                        ? "Real product capture · synthetic records"
                        : "Concept artwork · not a product capture"}
                    </span>
                  </CareerDepth>
                );
              })}
            </div>
            <div className="home-career-actions">
              {activeAction.kind === "link" ? (
                <SiteLink
                  className="start-shift v2-primary"
                  to={activeAction.href}
                >
                  {startLabel}
                  <span aria-hidden="true"> ↗</span>
                </SiteLink>
              ) : (
                <button
                  type="button"
                  className="start-shift v2-primary home-career-cta-disabled"
                  disabled
                  aria-disabled="true"
                >
                  {activeAction.label}
                </button>
              )}
              <SiteLink className="v2-text-link" to="/careers">
                Explore careers <span aria-hidden="true">→</span>
              </SiteLink>
            </div>
          </div>
        </PublicChapter>
      </section>

      {hasHomeMedia("home-media-story") ? (
        <section
          className="home-story"
          aria-label="Inside the security operations floor"
        >
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
      ) : null}

      <section className="home-reflect" aria-labelledby="home-reflect-title">
        <PublicChapter
          as="div"
          surface="chapter"
          rhythm="standard"
          width="wide"
          className="home-reflect-chapter"
        >
          <div>
            <MotionReveal>
            <h2 id="home-reflect-title" data-motion-role="argument">
              See how you worked.
            </h2>
            </MotionReveal>
            <MotionReveal delay={0.12}>
              <p className="ui-type-proof">
                Not a score. A record of the calls you made.
              </p>
            </MotionReveal>
            <ScrollArrival className="home-debrief-crop" y={60} scale={0.94}>
              <ProductCapture
                id="a-10"
                slot="home-debrief-reflection"
                alt="Product capture: one decision block from the shift debrief, reviewing what happened and what stayed uncertain."
              />
            </ScrollArrival>
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
          <MotionReveal>
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
          </MotionReveal>
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
          <MotionReveal className="home-final-inner">
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
          </MotionReveal>
        </PublicChapter>
      </section>
    </div>
  );
}
