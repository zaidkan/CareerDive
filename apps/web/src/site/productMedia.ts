/** Static, audited public media. No simulation session or API dependency. */
export type ProductMediaId = "a-01" | "a-02" | "a-03" | "a-04" | "a-05" | "a-06" |
  "a-07" | "a-08" | "a-09" | "a-10" | "a-11" | "a-12";

type Variant = { src: string; aspectRatio: string };
type ProductMedia = {
  id: ProductMediaId;
  career: "cybersecurity_analyst";
  authenticity: "real" | "representative";
  provenance: string;
  variants: { dark: { desktop: Variant; mobile?: Variant }; light?: { desktop: Variant; mobile?: Variant } };
};

const base = "/careers/media/";
const variant = (file: string, aspectRatio: string): Variant => ({ src: `${base}${file}.webp`, aspectRatio });
const provenance = `${base}provenance.json`;

export const productMedia = {
  "a-01": { id: "a-01", career: "cybersecurity_analyst", authenticity: "real", provenance, variants: {
    dark: { desktop: variant("a-01-desktop-dark", "1366 / 990"), mobile: variant("a-01-mobile-dark", "390 / 1167") },
    light: { desktop: variant("a-01-desktop-light", "1366 / 990"), mobile: variant("a-01-mobile-light", "390 / 1167") },
  } },
  "a-02": { id: "a-02", career: "cybersecurity_analyst", authenticity: "real", provenance, variants: { dark: { desktop: variant("a-02-desktop-dark", "1366 / 1357") } } },
  "a-03": { id: "a-03", career: "cybersecurity_analyst", authenticity: "real", provenance, variants: { dark: { desktop: variant("a-03-desktop-dark", "1366 / 1051") } } },
  "a-04": { id: "a-04", career: "cybersecurity_analyst", authenticity: "real", provenance, variants: { dark: { desktop: variant("a-04-desktop-dark", "1366 / 900") } } },
  "a-05": { id: "a-05", career: "cybersecurity_analyst", authenticity: "real", provenance, variants: { dark: { desktop: variant("a-05-desktop-dark", "1366 / 1236") } } },
  "a-06": { id: "a-06", career: "cybersecurity_analyst", authenticity: "representative", provenance, variants: { dark: { desktop: variant("a-06-desktop-dark", "1366 / 1835") } } },
  "a-07": { id: "a-07", career: "cybersecurity_analyst", authenticity: "real", provenance, variants: { dark: { desktop: variant("a-07-desktop-dark", "1366 / 981") } } },
  "a-08": { id: "a-08", career: "cybersecurity_analyst", authenticity: "real", provenance, variants: {
    dark: { desktop: variant("a-08-desktop-dark", "1366 / 900"), mobile: variant("a-08-mobile-dark", "390 / 907") },
    light: { desktop: variant("a-08-desktop-light", "1366 / 900"), mobile: variant("a-08-mobile-light", "390 / 907") },
  } },
  "a-09": { id: "a-09", career: "cybersecurity_analyst", authenticity: "real", provenance, variants: { dark: { desktop: variant("a-09-desktop-dark", "1366 / 1871") } } },
  "a-10": { id: "a-10", career: "cybersecurity_analyst", authenticity: "representative", provenance, variants: { dark: { desktop: variant("a-10-desktop-dark", "1366 / 900") } } },
  "a-11": { id: "a-11", career: "cybersecurity_analyst", authenticity: "real", provenance, variants: { dark: { desktop: variant("a-11-desktop-dark", "1366 / 900") } } },
  "a-12": { id: "a-12", career: "cybersecurity_analyst", authenticity: "real", provenance, variants: {
    dark: { desktop: variant("a-12-desktop-dark", "1366 / 900"), mobile: variant("a-12-mobile-dark", "390 / 844") },
    light: { desktop: variant("a-12-desktop-light", "1366 / 900"), mobile: variant("a-12-mobile-light", "390 / 844") },
  } },
} as const satisfies Record<ProductMediaId, ProductMedia>;

export function selectProductMedia(id: ProductMediaId, theme: "light" | "dark", device: "desktop" | "mobile"): Variant {
  const media: ProductMedia = productMedia[id];
  const variants = media.variants[theme] ?? media.variants.dark;
  return variants[device] ?? variants.desktop;
}
