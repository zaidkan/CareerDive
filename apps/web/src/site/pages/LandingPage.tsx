import {
  animate,
  motion,
  LayoutGroup,
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
import { PublicChapter, MotionReveal } from "../ArtDirection.js";
import { HomeMediaSlot } from "../homeMedia.js";
import { productMedia, type ProductMediaId } from "../productMedia.js";
import { SiteLink } from "../SiteLink.js";

const GATE_KEY = "first-shift-start-gate";

function storyDistance(distance: number): number {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 833px)").matches
    ? distance / 2
    : distance;
}

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
  { act: "Enter", claim: "Get the brief. Find your desk." },
  { act: "Investigate & decide", claim: "Check the evidence. Make the call." },
  { act: "Hand it off", claim: "Leave the next person a clear next step." },
] as const;

/** One coherent scene advances, then recedes as the next scene arrives.
 * The containing section stays untransformed so native layout remains stable. */
function ScrollScene({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 0.35, 0.65, 1],
    [storyDistance(80), 0, 0, -storyDistance(64)],
  );
  const scale = useTransform(
    scrollYProgress,
    [0, 0.35, 0.65, 1],
    [0.92, 1, 1, 0.94],
  );
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.25, 0.75, 1],
    [0.98, 1, 1, 0.98],
  );
  return (
    <div ref={ref} className="home-scene">
      <motion.div
        className={`home-scene-composition ${className}`}
        style={reduced ? {} : { y, scale, opacity }}
      >
        {children}
      </motion.div>
    </div>
  );
}

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
  },
  {
    careerId: "registered-nurse",
    statement: "Notice the change. Communicate it clearly.",
  },
  {
    careerId: "mechanical-engineer",
    statement: "Read the result. Decide what needs revision.",
  },
  {
    careerId: "electrician",
    statement: "Spot the hazard. Decide how the work proceeds.",
  },
  {
    careerId: "lawyer-attorney",
    statement: "Separate settled facts from open questions.",
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
    (value) => 1 - Math.min(1, Math.abs(value - index)) * 0.12,
  );
  const y = useTransform(
    emphasis,
    (value) => Math.max(0, Math.min(1, index - value)) * storyDistance(48),
  );
  const scale = useTransform(
    emphasis,
    (value) => 1 - Math.min(1, Math.abs(value - index)) * 0.06,
  );
  return (
    <motion.li style={reduced ? {} : { opacity, y, scale }}>
      <span className="home-act-number" aria-hidden="true">
        0{index + 1}
      </span>
      <h3>{entry.act}</h3>
      <p className="home-act-claim">{entry.claim}</p>
    </motion.li>
  );
}

// Verbatim excerpts from the existing synthetic handoff and A-1042 alert.
const SHIFT_WORK = [
  {
    title: "Start with the handoff",
    text: "Still watching the unfamiliar login thread. Did not finish device inventory check.",
  },
  {
    title: "Check the sign-in",
    text: "Repeated failures were followed by a successful sign-in from an unfamiliar network.",
  },
  {
    title: "Leave a clear handoff",
    text: "The location estimate is only a lead; I have not confirmed who signed in.",
  },
] as const;

function ShiftWorkState({
  index,
  progress,
  active,
}: {
  index: number;
  progress: MotionValue<number>;
  active: boolean;
}) {
  const reduced = useReducedMotion();
  const distance = useTransform(progress, (value) => index - value * 2);
  // The shared case stays in place; one readable context passes to the next.
  const opacity = useTransform(
    distance,
    [-0.5, -0.35, 0, 0.35, 0.5],
    [0, 1, 1, 1, 0],
  );
  const y = useTransform(
    distance,
    [-1, 0, 1],
    [-storyDistance(28), 0, storyDistance(28)],
  );
  const scale = useTransform(distance, [-1, 0, 1], [0.96, 1, 0.97]);
  const work = SHIFT_WORK[index];
  if (!work) return null;
  return (
    <motion.div
      className="home-shift-work-state"
      data-shift-step={index}
      aria-hidden={!active}
      style={reduced ? { opacity: active ? 1 : 0 } : { opacity, y, scale }}
    >
      <h3>{work.title}</h3>
      <blockquote>{work.text}</blockquote>
      {index === 1 && (
        <p className="home-shift-evidence">
          6 failed identity checks <span aria-hidden="true">→</span> 1
          successful sign-in
        </p>
      )}
    </motion.div>
  );
}

function ShiftWorkPanel({ progress }: { progress: MotionValue<number> }) {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const current = useRef(0);
  useMotionValueEvent(progress, "change", (value) => {
    if (reduced) return;
    const next = Math.min(2, Math.round(value * 2));
    if (current.current !== next) {
      current.current = next;
      setActive(next);
    }
  });
  return (
    <figure
      className="home-shift-proof"
      aria-label="A-1042 from brief to handoff"
    >
      <figcaption>Alert A-1042 · Open sign-in item</figcaption>
      <div className="home-shift-work-states">
        {SHIFT_WORK.map((work, index) => (
          <ShiftWorkState
            key={work.title}
            index={index}
            active={active === index}
            progress={progress}
          />
        ))}
      </div>
      <p className="home-media-note">Excerpts from synthetic work records</p>
      {reduced && (
        <div
          className="home-shift-context-controls"
          role="group"
          aria-label="Shift work context"
        >
          {SHIFT_ACTS.map((step, index) => (
            <button
              key={step.act}
              type="button"
              aria-pressed={active === index}
              onClick={() => {
                setActive(index);
              }}
            >
              {step.act}
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}

function CareerDepth({
  index,
  progress,
  active,
  children,
  careerSlug,
  entrance,
}: {
  index: number;
  progress: MotionValue<number>;
  active: boolean;
  children: ReactNode;
  careerSlug: string;
  entrance: MotionValue<number>;
}) {
  const reduced = useReducedMotion();
  const distance = useTransform(progress, (value) => index - value);
  const y = useTransform(
    distance,
    [-1, 0, 1],
    [-storyDistance(46), 0, storyDistance(64)],
  );
  const sceneY = useTransform(() => y.get() + entrance.get());
  const scale = useTransform(distance, [-1, 0, 1], [0.97, 1, 0.98]);
  const opacity = useTransform(
    distance,
    [-0.5, -0.4, 0, 0.4, 0.5],
    [0, 1, 1, 1, 0],
  );
  return (
    <motion.div
      className="home-career-panel"
      data-career={active ? "active" : "inactive"}
      data-media-slot={`career-artifact-${careerSlug}`}
      aria-hidden={!active}
      style={
        reduced ? { opacity: active ? 1 : 0 } : { y: sceneY, scale, opacity }
      }
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
  const shiftRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const careerTabRefs = useRef(new Map<number, HTMLButtonElement>());
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(heroProgress, [0, 1], [0, -storyDistance(80)]);
  const heroScale = useTransform(heroProgress, [0, 1], [1, 0.94]);
  const heroOpacity = useTransform(heroProgress, [0, 1], [1, 0.98]);
  const { scrollYProgress: shiftProgress } = useScroll({
    target: shiftRef,
    offset: ["start start", "end end"],
  });
  const { scrollYProgress } = useScroll({
    target: careerRef,
    offset: ["start start", "end end"],
  });

  // Hero cards: one finite rearrangement cycle, settling on Cyber.
  const { scrollYProgress: careerEntranceProgress } = useScroll({
    target: careerRef,
    offset: ["start end", "start 15%"],
  });
  const careerEntranceY = useTransform(
    careerEntranceProgress,
    [0, 1],
    [storyDistance(80), 0],
  );
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

  return (
    <div className="v2-home">
      <section
        ref={heroRef}
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
          <motion.div
            className="home-hero-grid ui-editorial-split"
            style={
              reduceMotion
                ? {}
                : { y: heroY, scale: heroScale, opacity: heroOpacity }
            }
          >
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
                        duration: 0.72,
                        delay: index * 0.06,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      {word}
                      {index < 8 ? " " : ""}
                    </motion.span>
                  ))}
              </h1>
              <p className="ui-type-proof">
                Try the ordinary work people usually don’t show you.
              </p>
              <motion.div
                className="home-hero-actions"
                initial={false}
                animate={reduceMotion ? {} : { y: [12, 0], opacity: [0, 1] }}
                transition={{
                  duration: 0.72,
                  delay: 0.25,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {heroAction.kind === "link" ? (
                  <motion.div
                    className="home-start-motion"
                    whileHover={reduceMotion ? {} : { y: -3 }}
                    whileTap={reduceMotion ? {} : { scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  >
                    <SiteLink
                      className="start-shift v2-primary"
                      to={heroAction.href}
                    >
                      {startLabel}
                      <span aria-hidden="true"> ↗</span>
                    </SiteLink>
                  </motion.div>
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
              </motion.div>
              <p className="home-hero-meta">
                <strong>{FIRST_SHIFT_DURATION_COMPACT}</strong> · Cybersecurity
                · Playable now
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
                          : ([0.96, 0.97, 0.98, 0.99, 1][index] ?? 1),
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
          </motion.div>
        </PublicChapter>
      </section>

      <section className="home-place" aria-labelledby="home-place-title">
        <PublicChapter
          as="div"
          surface="base"
          rhythm="compact"
          className="home-place-chapter"
        >
          <ScrollScene>
            <h2 id="home-place-title">Walk into the job.</h2>
            <p className="ui-type-proof">
              An actual workplace. Your first shift.
            </p>
            <div className="home-place-crop">
              <HomeMediaSlot slotId="home-media-arrival" eager hideCaption />
            </div>
            <p className="home-media-note">
              Actual product capture · Cybersecurity Analyst
            </p>
          </ScrollScene>
        </PublicChapter>
      </section>

      <section className="home-realwork" aria-labelledby="home-realwork-title">
        <PublicChapter
          as="div"
          surface="chapter"
          rhythm="standard"
          className="home-realwork-chapter"
        >
          <ScrollScene>
            <h2 id="home-realwork-title">
              Do the work people usually don’t show you.
            </h2>
            <p className="ui-type-proof">
              Open the alert. Check the evidence. Make the call.
            </p>
            <figure
              className="home-alert-proof"
              data-media-slot="home-case-a1042"
            >
              <figcaption>
                Alert A-1042 · Unfamiliar successful login
              </figcaption>
              <blockquote>
                Repeated failures were followed by a successful sign-in from an
                unfamiliar network.
              </blockquote>
              <div className="home-alert-sequence">
                <p>
                  <strong>6</strong> failed identity checks
                </p>
                <span aria-hidden="true">→</span>
                <p>
                  <strong>1</strong> successful sign-in
                </p>
              </div>
              <p className="home-alert-question">
                What does the evidence actually support?
              </p>
            </figure>
            <p className="home-media-note">
              Excerpt from the actual alert · synthetic records
            </p>
          </ScrollScene>
        </PublicChapter>
      </section>

      <section
        ref={shiftRef}
        className="home-shift"
        aria-labelledby="home-shift-title"
      >
        <PublicChapter
          as="div"
          surface="base"
          rhythm="standard"
          className="home-shift-chapter"
        >
          <div className="home-shift-sticky">
            <h2 id="home-shift-title">A shift has a flow.</h2>
            <p className="ui-type-proof">
              Real work keeps moving after your shift ends.
            </p>
            <div className="home-shift-grid">
              <ol className="home-acts">
                {SHIFT_ACTS.map((entry, index) => (
                  <ShiftStep
                    key={entry.act}
                    entry={entry}
                    index={index}
                    progress={shiftProgress}
                  />
                ))}
              </ol>
              <ShiftWorkPanel progress={shiftProgress} />
            </div>
          </div>
        </PublicChapter>
      </section>

      <section className="home-reflect" aria-labelledby="home-reflect-title">
        <PublicChapter
          as="div"
          surface="chapter"
          rhythm="standard"
          width="wide"
          className="home-reflect-chapter"
        >
          <ScrollScene>
            <h2 id="home-reflect-title">See how you worked.</h2>
            <p className="ui-type-proof">
              A record of the calls you made. Not a score.
            </p>
            <div className="home-debrief-crop">
              <ProductCapture
                id="a-10"
                slot="home-debrief-reflection"
                alt="Actual shift debrief: a record of decisions, what happened and what stayed uncertain."
              />
            </div>
            <p className="home-media-note">
              Shift debrief · actual product capture, synthetic records
            </p>
          </ScrollScene>
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
            <motion.div style={reduceMotion ? {} : { y: careerEntranceY }}>
              <h2 id="home-careers-title">
                Different careers. Different work.
              </h2>
              <p className="ui-type-proof">
                Cybersecurity is playable now. Four more are taking shape.
              </p>
            </motion.div>
            <LayoutGroup id="home-career-selection">
              <motion.div
                style={reduceMotion ? {} : { y: careerEntranceY }}
                className="home-career-tabs"
                role="group"
                aria-label="Careers"
              >
                {CAREER_SHOWCASE.map((entry, index) => {
                  const career = careers.find(
                    (item) => item.id === entry.careerId,
                  );
                  if (!career) return null;
                  return (
                    <button
                      key={entry.careerId}
                      ref={(node) => {
                        if (node) careerTabRefs.current.set(index, node);
                        else careerTabRefs.current.delete(index);
                      }}
                      type="button"
                      className="home-career-tab"
                      aria-label={career.title}
                      aria-pressed={careerPanels.active === index}
                      onClick={() => {
                        selectCareer(index);
                      }}
                      onKeyDown={(event) => {
                        let next = index;
                        if (
                          event.key === "ArrowRight" ||
                          event.key === "ArrowDown"
                        )
                          next = (index + 1) % 5;
                        else if (
                          event.key === "ArrowLeft" ||
                          event.key === "ArrowUp"
                        )
                          next = (index + 4) % 5;
                        else if (event.key === "Home") next = 0;
                        else if (event.key === "End") next = 4;
                        else return;
                        event.preventDefault();
                        selectCareer(next);
                        careerTabRefs.current.get(next)?.focus();
                      }}
                    >
                      {careerPanels.active === index && (
                        <motion.span
                          className="home-career-active-pill"
                          layoutId="active-pill"
                          aria-hidden="true"
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : { type: "spring", stiffness: 380, damping: 30 }
                          }
                        />
                      )}
                      <span className="home-career-tab-cue" aria-hidden="true">
                        {heroCue(career.id)}
                      </span>
                      <span className="home-career-tab-name">
                        {career.title}
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            </LayoutGroup>
            <div className="home-career-stage" data-motion="career-switch">
              {CAREER_SHOWCASE.map((entry, index) => {
                const career = careers.find(
                  (item) => item.id === entry.careerId,
                );
                if (!career) return null;
                return (
                  <CareerDepth
                    key={entry.careerId}
                    index={index}
                    progress={careerProgress}
                    active={index === careerPanels.active}
                    entrance={careerEntranceY}
                    careerSlug={career.slug}
                  >
                    <span className="home-career-status">
                      {availabilityLabel(career.availability)}
                    </span>
                    <h3>{career.title}</h3>
                    <p className="home-career-statement">{entry.statement}</p>
                  </CareerDepth>
                );
              })}
            </div>
            <motion.div
              className="home-career-actions"
              style={reduceMotion ? {} : { y: careerEntranceY }}
            >
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
            </motion.div>
          </div>
        </PublicChapter>
      </section>

      <section className="home-faq" aria-labelledby="home-faq-title">
        <PublicChapter
          as="div"
          surface="base"
          rhythm="compact"
          className="home-faq-chapter"
        >
          <MotionReveal>
            <h2 id="home-faq-title">Before you start.</h2>
            <div className="v2-faq-list">
              {HOME_FAQ.map(({ q, a }) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
            <div className="home-faq-links">
              <SiteLink className="v2-text-link" to="/faq">
                More questions <span aria-hidden="true">→</span>
              </SiteLink>
              <SiteLink className="v2-text-link" to="/trust">
                Privacy and safety <span aria-hidden="true">→</span>
              </SiteLink>
            </div>
          </MotionReveal>
        </PublicChapter>
      </section>
    </div>
  );
}
