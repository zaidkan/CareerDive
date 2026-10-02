import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  motion,
  useAnimationControls,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

/** Visible baseline; viewport entry rehearses one bounded reveal, never gates content. */
export function MotionReveal({
  children,
  className,
  depth = false,
  delay = 0,
  as = "div",
  amount = 0.2,
  margin = "0px",
  "aria-labelledby": labelledBy,
}: {
  children: ReactNode;
  className?: string;
  depth?: boolean;
  delay?: number;
  as?: "div" | "article";
  amount?: number;
  margin?: string;
  "aria-labelledby"?: string;
}) {
  const reduced = useReducedMotion();
  const controls = useAnimationControls();
  const revealed = useRef(false);
  const Element = as === "article" ? motion.article : motion.div;
  useEffect(() => {
    if (reduced) controls.set({ opacity: 1, y: 0, scale: 1 });
  }, [controls, reduced]);
  return (
    <Element
      className={className}
      aria-labelledby={labelledBy}
      initial={false}
      animate={controls}
      viewport={{ once: true, amount, margin }}
      {...(typeof IntersectionObserver === "undefined"
        ? {}
        : {
            onViewportEnter: () => {
              if (reduced || revealed.current) return;
              revealed.current = true;
              void controls.start({
                opacity: [0, 1],
                y: [depth ? 32 : 28, 0],
                scale: depth ? [0.96, 1] : [1, 1],
                transition: {
                  duration: 0.72,
                  delay,
                  ease: [0.16, 1, 0.3, 1],
                },
              });
            },
          })}
    >
      {children}
    </Element>
  );
}

/** Native scroll drives the arrival; transforms settle before the reading position. */
export function ScrollArrival({
  children,
  className,
  y = 48,
  scale = 0.95,
  opacity = 0,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  scale?: number;
  opacity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 95%", "start 35%"],
  });
  const rise = useTransform(scrollYProgress, [0, 1], [y, 0]);
  const zoom = useTransform(scrollYProgress, [0, 1], [scale, 1]);
  const alpha = useTransform(scrollYProgress, [0, 0.85, 1], [opacity, 1, 1]);
  return (
    <div ref={ref}>
      <motion.div
        className={className}
        style={reduced ? {} : { y: rise, scale: zoom, opacity: alpha }}
      >
        {children}
      </motion.div>
    </div>
  );
}

type Surface = "base" | "chapter" | "stage" | "finale";
type Rhythm = "compact" | "standard" | "expansive" | "stage" | "final";
type Width = "reading" | "wide" | "full";

/** Surface and whitespace are chosen per argument, never by section index. */
export function PublicChapter({
  as: Element = "section",
  surface = "base",
  rhythm = "standard",
  width = "wide",
  className = "",
  children,
}: {
  as?: "section" | "div" | "aside";
  surface?: Surface;
  rhythm?: Rhythm;
  width?: Width;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Element
      className={`ui-chapter ui-surface--${surface} ui-rhythm--${rhythm} ui-width--${width} ${className}`.trim()}
    >
      {children}
    </Element>
  );
}

export function ChapterSeparator() {
  return <hr className="ui-separator" />;
}

export type MediaProvenance =
  | { career: "Cybersecurity Analyst"; kind: "real" }
  | {
      career:
        | "Registered Nurse"
        | "Mechanical Engineer"
        | "Electrician"
        | "Lawyer";
      kind: "workshop";
    };

export function ProvenanceLabel({
  provenance,
}: {
  provenance: MediaProvenance;
}) {
  return (
    <span className="ui-provenance">
      {provenance.career} <span aria-hidden="true">·</span>{" "}
      {provenance.kind === "real" ? "Playable now" : "Taking shape"}
    </span>
  );
}

/** Children own the artifact itself; the stage only owns placement and provenance. */
export function ArtifactStage({
  dominant,
  secondary,
  emphasis = "center",
  eyebrow,
  caption,
  provenance,
  className = "",
}: {
  dominant: ReactNode;
  secondary?: readonly [ReactNode, ReactNode?];
  emphasis?: "left" | "center" | "right";
  eyebrow?: string;
  caption?: string;
  provenance?: MediaProvenance;
  className?: string;
}) {
  return (
    <figure
      className={`ui-artifact-stage ui-artifact-stage--${emphasis} ${className}`.trim()}
      data-media-slot="artifact-stage"
    >
      {eyebrow ? <p className="ui-type-eyebrow">{eyebrow}</p> : null}
      <div className="ui-artifact-stage__field">
        <div className="ui-artifact-stage__primary" data-media-layer="dominant">
          {dominant}
        </div>
        {secondary?.map((artifact, index) => (
          <div
            className="ui-artifact-stage__secondary"
            data-media-layer="secondary"
            key={index}
            style={{ "--ui-layer": index } as CSSProperties}
          >
            {artifact}
          </div>
        ))}
      </div>
      {caption || provenance ? (
        <figcaption className="ui-artifact-stage__caption">
          {caption ? <span className="ui-type-caption">{caption}</span> : null}
          {provenance ? <ProvenanceLabel provenance={provenance} /> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** One-shot, optional reveal. Without JS/IntersectionObserver, final content stays visible. */
export function useChapterReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        node.dataset.motionActive = "true";
        observer.disconnect();
      },
      { threshold: 0.18 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);
  return ref;
}
