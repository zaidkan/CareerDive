/**
 * Homepage media-slot registry — the ONE place to replace homepage media.
 *
 * Each slot ships with audited real product media as its fallback, so the page
 * is complete with no custom asset. To upgrade a slot later, set `source` on
 * that slot only (image or video, with poster / caption / provenance) — no JSX
 * changes needed. Sources accept light/dark variants and mobile sources; slots
 * keep their responsive aspect ratio, and `crop: "wide"` opts into a deliberate
 * editorial crop on narrow screens instead of a tiny full capture.
 */
import type { ReactNode } from "react";
import type { ProductMediaId } from "./productMedia.js";
import { productMedia } from "./productMedia.js";

export type HomeMediaSlotId =
  | "home-media-arrival"
  | "home-media-workplace"
  | "home-media-story";

export type HomeMediaSource =
  | { kind: "product"; id: ProductMediaId }
  | {
      kind: "image";
      src: string;
      srcLight?: string;
      srcMobile?: string;
      width: number;
      height: number;
    }
  | {
      kind: "video";
      src: string;
      poster?: string;
      posterLight?: string;
      width: number;
      height: number;
    };

export type HomeMediaSlotConfig = {
  id: HomeMediaSlotId;
  /** Custom replacement media (image or video). Leave undefined → fallback. */
  source?: HomeMediaSource;
  fallback: HomeMediaSource;
  alt: string;
  caption: string;
  provenance: string;
  /**
   * "wide" = deliberate editorial crop on narrow screens;
   * "band" = restrained panoramic crop at every width;
   * default = natural capture aspect.
   */
  crop?: "natural" | "wide" | "band";
  /** Stable media-integration target kept for the audited fallback capture. */
  legacySlot?: string;
};

export const homeMedia: Record<HomeMediaSlotId, HomeMediaSlotConfig> = {
  "home-media-arrival": {
    id: "home-media-arrival",
    fallback: { kind: "product", id: "a-11" },
    alt: "Product capture: the Verdaly security operations floor at the start of the first shift.",
    caption: "Actual product capture · synthetic records",
    provenance: "Cybersecurity Analyst · Playable now",
    legacySlot: "home-hero-workplace",
  },
  "home-media-workplace": {
    id: "home-media-workplace",
    fallback: { kind: "product", id: "a-12" },
    alt: "Product capture: Desk OS open at the workstation at the start of the shift.",
    caption: "Desk OS · actual product capture, synthetic records",
    provenance: "Cybersecurity Analyst · Playable now",
    crop: "wide",
    legacySlot: "home-desk-frame",
  },
  "home-media-story": {
    id: "home-media-story",
    fallback: { kind: "product", id: "a-11" },
    alt: "Product capture: a wide view of the Verdaly security operations floor between shifts of work.",
    caption: "Verdaly security operations floor · actual product capture, synthetic records",
    provenance: "Cybersecurity Analyst · Playable now",
    crop: "band",
    legacySlot: "home-story-frame",
  },
};

export function resolveHomeMediaSource(
  config: HomeMediaSlotConfig,
): HomeMediaSource {
  return config.source ?? config.fallback;
}

function ratioSize(ratio: string): { width: number; height: number } {
  const [w = 1366, h = 900] = ratio
    .split("/")
    .map((part) => Number(part.trim()));
  return { width: w, height: h };
}

/**
 * Renders one media slot. Product sources come from the audited media set;
 * custom image/video sources are swapped through the registry only. Never
 * renders fabricated product UI, and never shows an empty placeholder: when a
 * slot has no media at all it renders nothing.
 */
export function HomeMediaSlot({
  slotId,
  eager = false,
  hideCaption = false,
}: {
  slotId: HomeMediaSlotId;
  eager?: boolean;
  /** When the surrounding stage already owns the caption line. */
  hideCaption?: boolean;
}) {
  const config = homeMedia[slotId];
  const source = resolveHomeMediaSource(config);
  const slot = config.legacySlot ?? config.id;
  const frameClass =
    config.crop === "wide"
      ? "home-media-frame home-media-frame--wide"
      : config.crop === "band"
        ? "home-media-frame home-media-frame--band"
        : "home-media-frame";

  let media: ReactNode = null;
  if (source.kind === "product") {
    const product = productMedia[source.id];
    const variantMap = product.variants as unknown as Record<
      string,
      Record<string, { src: string; aspectRatio: string }> | undefined
    >;
    media = (["dark", "light"] as const).map((theme) => {
      const desktop = variantMap[theme]?.["desktop"];
      if (!desktop) return null;
      // Wide crops use the desktop capture on purpose: a tiny full-page mobile
      // screenshot is not an intentional narrow-screen composition.
      const mobile =
        config.crop === "wide" ? undefined : variantMap[theme]?.["mobile"];
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
            alt={config.alt}
            width={size.width}
            height={size.height}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
          />
        </picture>
      );
    });
  } else if (source.kind === "image") {
    media = (
      <>
        <picture className="home-capture-theme home-capture-theme--dark">
          {source.srcMobile ? (
            <source
              media="(max-width: 600px)"
              srcSet={source.srcMobile}
              width={source.width}
              height={source.height}
            />
          ) : null}
          <img
            src={source.src}
            alt={config.alt}
            width={source.width}
            height={source.height}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
          />
        </picture>
        {source.srcLight ? (
          <picture className="home-capture-theme home-capture-theme--light">
            <img
              src={source.srcLight}
              alt={config.alt}
              width={source.width}
              height={source.height}
              loading={eager ? "eager" : "lazy"}
              decoding="async"
            />
          </picture>
        ) : null}
      </>
    );
  } else {
    media = (
      <video
        className="home-media-video"
        src={source.src}
        poster={source.poster ?? source.posterLight}
        width={source.width}
        height={source.height}
        preload="metadata"
        playsInline
        controls
        aria-label={config.alt}
      />
    );
  }

  return (
    <figure className="home-media-slot" data-media-slot={config.id}>
      <div className={`home-capture ${frameClass}`} data-media-slot={slot}>
        {media}
      </div>
      {hideCaption ? null : (
        <figcaption className="home-media-note">
          {config.caption} <span aria-hidden="true">·</span> {config.provenance}
        </figcaption>
      )}
    </figure>
  );
}
