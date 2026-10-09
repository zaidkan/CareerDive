import {
  availabilityLabel,
  FIRST_SHIFT_DURATION_COMPACT,
} from "../../careers/publicCopy.js";
import { HOME_FAQ } from "../faqData.js";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { careers } from "../../careers/careers.js";
import {
  ChapterSeparator,
  PublicChapter,
  useChapterReveal,
} from "../ArtDirection.js";
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

/** Defer the poster and source until the film is near the viewport or focused. */
function LaunchFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setReady(true);
      observer.disconnect();
    }, { rootMargin: "200px" });
    observer.observe(video);
    return () => { observer.disconnect(); };
  }, []);

  return (
    <video
      ref={videoRef}
      className="home-launch-video"
      aria-label="CareerDive launch film"
      width={1920}
      height={1080}
      controls
      playsInline
      preload="none"
      tabIndex={0}
      poster={ready ? "/launch-film-poster.jpg" : undefined}
      src={ready ? "/launch-film.mp4" : undefined}
      onFocus={() => { setReady(true); }}
      onPointerDown={() => { setReady(true); }}
    />
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

const SHIFT_ACTS = [
  { act: "Prepare", claim: "Read the handoff. Check the records." },
  { act: "Decide", claim: "Make a call with incomplete evidence." },
  {
    act: "Pass it on",
    claim: "Leave a clear next step.",
  },
] as const;

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

/** Cards rearrange once through the sequence (~20s), then settle on Cyber. */
const HERO_CARD_STEP_MS = 4000;

export function LandingPage() {
  const hasSeenFilm = useHasSeenFilm();
  const heroRef = useChapterReveal<HTMLDivElement>();
  const realWorkRef = useChapterReveal<HTMLDivElement>();
  const shiftRef = useChapterReveal<HTMLDivElement>();
  const analysisRef = useChapterReveal<HTMLDivElement>();
  const reflectRef = useChapterReveal<HTMLDivElement>();
  const faqRef = useChapterReveal<HTMLDivElement>();
  const finalRef = useChapterReveal<HTMLDivElement>();

  // Hero cards: one finite rearrangement cycle, settling on Cyber.
  const [heroActive, setHeroActive] = useState(0);
  const [heroStep, setHeroStep] = useState(0);
  const [heroAuto, setHeroAuto] = useState(() => !prefersReducedMotion());
  const [reduceMotion, setReduceMotion] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduceMotion(query.matches);
      if (query.matches) setHeroAuto(false);
    };
    query.addEventListener("change", update);
    return () => {
      query.removeEventListener("change", update);
    };
  }, []);

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

  const startLabel = hasSeenFilm
    ? "Continue your first day"
    : "Start your first day";

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
                Try a slice of the work. See how you'd make the call.
              </h1>
              <p className="ui-type-proof">
                Make real calls in a simulated cybersecurity shift. Review your
                reasoning against the evidence—not a quiz score.
              </p>
              <div className="home-hero-actions">
                <SiteLink className="start-shift v2-primary" to="/start">
                  {startLabel}
                  <span aria-hidden="true"> ↗</span>
                </SiteLink>
                <SiteLink className="v2-text-link" to="/careers">
                  Career and previews <span aria-hidden="true">→</span>
                </SiteLink>
              </div>
              <p className="home-hero-meta">
                <strong>{FIRST_SHIFT_DURATION_COMPACT}</strong> · simulated
                first shift
              </p>
            </div>
            <div data-motion-role="artifact" className="home-hero-stage">
              <div
                className="home-hero-cards"
                role="group"
                aria-label="Careers at CareerDive"
                onPointerEnter={() => {
                  setHeroAuto(false);
                }}
                onPointerDown={() => {
                  setHeroAuto(false);
                }}
                onKeyDown={() => {
                  setHeroAuto(false);
                }}
              >
                {HERO_CARDS.map((card, index) => {
                  const career = careers.find(
                    (item) => item.id === card.careerId,
                  );
                  if (!career) return null;
                  const emphasized = heroActive === index;
                  return (
                    <button
                      key={card.careerId}
                      type="button"
                      className="home-hero-card"
                      data-emphasis={emphasized ? "true" : "false"}
                      aria-pressed={emphasized}
                      aria-label={`${career.title} · ${availabilityLabel(career.availability)}`}
                      style={
                        {
                          "--deck-rank":
                            (index - heroActive + HERO_CARDS.length) %
                            HERO_CARDS.length,
                        } as CSSProperties
                      }
                      onFocus={() => {
                        setHeroAuto(false);
                        setHeroActive(index);
                      }}
                      onClick={() => {
                        setHeroAuto(false);
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
                    </button>
                  );
                })}
              </div>
              <p className="home-hero-availability">
                One playable now. Four taking shape.
              </p>
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
          <div className="home-place-crop">
            <HomeMediaSlot slotId="home-media-arrival" eager />
          </div>
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
            className="home-decision-feature"
          >
            <div className="home-realwork-intro">
              <h2 id="home-realwork-title" data-motion-role="argument">
                Your decisions change the case.
              </h2>
              <ol
                className="home-decision-beats"
                aria-label="How your decisions carry forward"
              >
                <li>Make the call — escalate, dismiss, or route.</li>
                <li>The outcome follows from what you chose.</li>
                <li>And some consequences surface later in your shift.</li>
              </ol>
            </div>
          </div>
        </PublicChapter>
      </section>

      <section className="home-analysis" aria-labelledby="home-analysis-title">
        <PublicChapter
          as="div"
          surface="base"
          rhythm="standard"
          className="home-analysis-chapter"
        >
          <div
            ref={analysisRef}
            data-motion="chapter-reveal"
            className="home-feature-grid home-feature-grid--analysis"
          >
            <div className="home-analysis-copy">
              <h2 id="home-analysis-title" data-motion-role="argument">
                An honest review, not a score.
              </h2>
              <p className="ui-type-proof">
                See how you reasoned—not which career a quiz picked for you.
              </p>
              <ol
                className="home-analysis-beats"
                aria-label="What your shift review shows"
              >
                <li>What you chose.</li>
                <li>What the evidence supported.</li>
                <li>What's still unknown.</li>
              </ol>
            </div>
            <figure className="home-feature-proof">
              <div className="home-feature-frame" data-motion-role="artifact">
                <div className="home-debrief-crop">
                  <ProductCapture
                    id="a-10"
                    slot="home-debrief-reflection"
                    alt="Product capture: Your shift in review, showing the recorded decision and evidence for the unfamiliar sign-in."
                  />
                </div>
              </div>
              <figcaption>
                Your shift in review · excerpt from an actual product capture,
                synthetic records
              </figcaption>
            </figure>
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
            <ol className="home-acts">
              {SHIFT_ACTS.map((entry) => (
                <li key={entry.act}>
                  <h3>{entry.act}</h3>
                  <p className="home-act-claim">{entry.claim}</p>
                </li>
              ))}
            </ol>
          </div>
        </PublicChapter>
      </section>

      <section className="home-launch" aria-labelledby="home-launch-title">
        <PublicChapter
          as="div"
          surface="base"
          rhythm="standard"
          className="home-launch-chapter"
        >
          <h2 id="home-launch-title">Watch the launch film.</h2>
          <LaunchFilm />
        </PublicChapter>
      </section>

      <section className="home-reflect" aria-labelledby="home-reflect-title">
        <PublicChapter
          as="div"
          surface="base"
          rhythm="compact"
          width="wide"
          className="home-reflect-chapter"
        >
          <div
            ref={reflectRef}
            data-motion="chapter-reveal"
            className="home-reflect-content"
          >
            <h2 id="home-reflect-title" data-motion-role="argument">
              Would you want to do this again?
            </h2>
            <p className="ui-type-proof">
              What felt interesting? What felt difficult? Use this shift to
              explore those questions—not as a career verdict.
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
              Try a shift. See how you reasoned.
            </h2>
            <p>
              Try the work before investing in the path. Free, with no application.
            </p>
            <div className="home-final-actions">
              <SiteLink className="start-shift v2-primary" to="/start">
                {startLabel}
                <span aria-hidden="true"> ↗</span>
              </SiteLink>
              <SiteLink className="v2-text-link" to="/careers">
                Career and previews <span aria-hidden="true">→</span>
              </SiteLink>
            </div>
          </div>
        </PublicChapter>
      </section>
    </div>
  );
}
