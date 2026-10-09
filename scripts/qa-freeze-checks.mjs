export const ALLOW_CONSOLE = [
  "Failed to load resource",
  "MEDIA_ERR",
  "NotSupportedError",
  "The play() request was interrupted",
  "Uncaught (in promise) DOMException: The play()",
  "WebGL",
  "fonts.googleapis",
  "fonts.gstatic",
  "net::ERR_ABORTED",
];

export const LEAK_PATTERNS = [
  { name: "object-leak", pattern: /\[object Object\]/ },
  { name: "dev-host", pattern: /localhost:\d+/ },
  { name: "env-prefix", pattern: /VITE_[A-Z_]+/ },
  { name: "node-path", pattern: /node_modules\// },
  { name: "todo-marker", pattern: /\b(TODO|FIXME|XXX)\b/ },
  { name: "stack-frame", pattern: /\bat \w+ \(/ },
  { name: "source-line", pattern: /\.tsx?:\d+/ },
];

export const WORKSHOP_CAREERS = [
  "Registered Nurse",
  "Mechanical Engineer",
  "Electrician",
  "Lawyer",
];

export const MAX_CLS = 0.1;

export function collectMetrics({ leakPatterns = [] } = {}) {
  const viewportWidth = window.innerWidth;
  const isShown = (element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (Number(style.opacity) === 0) return false;
    if (style.clipPath === "inset(50%)") return false;
    return true;
  };
  const inClippedAncestor = (element) => {
    let node = element.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const clipped =
        ["hidden", "auto", "scroll", "clip"].includes(style.overflowX) ||
        ["hidden", "auto", "scroll", "clip"].includes(style.overflowY);
      if (clipped) return true;
      node = node.parentElement;
    }
    return false;
  };
  const describe = (element) => ({
    tag: element.tagName.toLowerCase(),
    cls:
      typeof element.className === "string"
        ? element.className.slice(0, 70)
        : "",
    id: element.id || "",
  });

  const documentWidth = Math.max(
    document.documentElement.scrollWidth,
    document.body ? document.body.scrollWidth : 0,
  );

  const outsideText = [];
  const outsideDecoration = [];
  for (const element of document.querySelectorAll("body *")) {
    if (outsideText.length >= 8 && outsideDecoration.length >= 8) break;
    if (!isShown(element)) continue;
    if (inClippedAncestor(element)) continue;
    const style = getComputedStyle(element);
    if (style.position === "fixed") continue;
    const rect = element.getBoundingClientRect();
    if (rect.right <= viewportWidth + 1 && rect.left >= -1) continue;
    const entry = {
      ...describe(element),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      text: (element.innerText || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60),
    };
    if (entry.text) outsideText.push(entry);
    else outsideDecoration.push(entry);
  }

  // Inspect text fragments, not element boxes: a clipped ancestor can make a
  // heading unreadable while the page itself still has no horizontal overflow.
  const clippedText = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode() && clippedText.length < 8) {
    const node = walker.currentNode;
    const text = (node.textContent || "").replace(/\s+/g, " ").trim();
    const parent = node.parentElement;
    if (text.length < 3 || !parent || !isShown(parent) || parent.closest(".visually-hidden, [aria-hidden='true']")) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const fragments = Array.from(range.getClientRects()).filter((rect) => rect.width > 2 && rect.height > 2);
    if (!fragments.length) continue;
    let ancestor = parent;
    while (ancestor && ancestor !== document.documentElement) {
      const style = getComputedStyle(ancestor);
      const clipX = ["hidden", "clip"].includes(style.overflowX);
      const clipY = ["hidden", "clip"].includes(style.overflowY);
      if (clipX || clipY) {
        const box = ancestor.getBoundingClientRect();
        if (fragments.some((rect) =>
          (clipX && (rect.left < box.left - 3 || rect.right > box.right + 3)) ||
          (clipY && (rect.top < box.top - 3 || rect.bottom > box.bottom + 3))
        )) {
          clippedText.push({ text: text.slice(0, 80), element: describe(parent), ancestor: describe(ancestor) });
          break;
        }
      }
      ancestor = ancestor.parentElement;
    }
  }

  const headings = Array.from(document.querySelectorAll("h1")).filter(isShown);

  const images = Array.from(document.images);
  const brokenImages = images
    .filter((image) => image.currentSrc || image.src)
    .filter((image) => image.complete && image.naturalWidth === 0)
    .map((image) => ({
      src: (image.currentSrc || image.src || "").slice(0, 120),
    }));
  const pendingImages = images
    .filter((image) => !image.complete && isShown(image))
    .map((image) => (image.currentSrc || image.src || "").slice(0, 120));

  const mediaIssues = [];
  for (const video of document.querySelectorAll("video")) {
    if (video.error) mediaIssues.push(`video error ${String(video.error.code)}`);
    if (video.networkState === 3) mediaIssues.push("video has no media source");
    if (!video.currentSrc && !video.querySelector("source[src]")) {
      mediaIssues.push("video without src or source");
    }
  }
  for (const source of document.querySelectorAll("source")) {
    const inPicture = source.parentElement?.tagName === "PICTURE";
    const declared = inPicture
      ? source.getAttribute("srcset")
      : source.getAttribute("src");
    if (!declared) mediaIssues.push(`${inPicture ? "picture" : "media"} source element without ${inPicture ? "srcset" : "src"}`);
  }

  const seenIds = new Map();
  for (const element of document.querySelectorAll("[id]")) {
    if (!isShown(element)) continue;
    const list = seenIds.get(element.id) ?? [];
    list.push(element);
    seenIds.set(element.id, list);
  }
  const duplicateIds = [];
  for (const [id, nodes] of seenIds) {
    if (nodes.length > 1) duplicateIds.push(`${id} x${String(nodes.length)}`);
  }

  const emptySlots = [];
  for (const slot of document.querySelectorAll("[data-media-slot]")) {
    if (slot.closest('[hidden], [aria-hidden="true"]')) continue;
    const rect = slot.getBoundingClientRect();
    const hasText = Boolean(slot.textContent.trim());
    if (
      rect.width < 40 ||
      rect.height < 40 ||
      (!hasText && slot.children.length === 0)
    ) {
      emptySlots.push({
        slot: slot.getAttribute("data-media-slot"),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });
    }
  }

  const bodyText = (document.body.innerText || "").replace(/\s+/g, " ");
  // Initial career panel differs by motion preference; compare stable page copy.
  const switcherText = (document.querySelector('[data-motion="career-switch"]')?.innerText || "").replace(/\s+/g, " ");
  const leaks = [];
  for (const { name, pattern } of leakPatterns) {
    const match = bodyText.match(pattern);
    if (match) leaks.push(`${name}: ${match[0].slice(0, 60)}`);
  }

  const navReport = [];
  for (const nav of document.querySelectorAll("header.site-nav nav")) {
    const navStyle = getComputedStyle(nav);
    const scrollable =
      ["auto", "scroll"].includes(navStyle.overflowX) &&
      nav.scrollWidth > nav.clientWidth + 1;
    const clippedLinks = Array.from(nav.querySelectorAll("a, button"))
      .filter(isShown)
      .map((link) => ({ link, rect: link.getBoundingClientRect() }))
      .filter(({ rect }) => rect.left < -1 || rect.right > viewportWidth + 1)
      .map(({ link, rect }) => ({
        text: (link.innerText || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 30),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
      }));
    navReport.push({
      scrollable,
      scrollWidth: nav.scrollWidth,
      clientWidth: nav.clientWidth,
      clippedLinks,
    });
  }

  const workshopArtifactCount = document.querySelectorAll(
    "[data-workshop-artifact]",
  ).length;
  const workshopLabels = Array.from(document.querySelectorAll(".ui-provenance"))
    .filter(isShown)
    .map((label) =>
      (label.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
    );

  return {
    viewportWidth,
    documentWidth,
    scrollHeight: document.documentElement.scrollHeight,
    themeApplied: document.documentElement.dataset.theme ?? "",
    reducedMotionApplied: window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches,
    textLength: bodyText.trim().length,
    stableTextLength: Math.max(0, bodyText.trim().length - switcherText.trim().length),
    bodyText: bodyText.slice(0, 200000),
    h1Count: headings.length,
    h1Text: headings.map((heading) =>
      (heading.innerText || "").replace(/\s+/g, " ").trim().slice(0, 80),
    ),
    outsideText,
    clippedText,
    outsideDecoration: outsideDecoration.slice(0, 8),
    brokenImages,
    pendingImages,
    mediaIssues,
    duplicateIds,
    emptySlots,
    leaks,
    navReport,
    workshopArtifactCount,
    workshopLabels,
    homeCareerLabels: Array.from(document.querySelectorAll(".home-hero-card"))
      .map((card) => card.getAttribute("aria-label") ?? ""),
    cls: window.__qaCls ?? 0,
  };
}

export function snapshotFocusStyles() {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "summary",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  const read = (element) => {
    const style = getComputedStyle(element);
    return {
      outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
      boxShadow: style.boxShadow,
      backgroundColor: style.backgroundColor,
      color: style.color,
      borderColor: `${style.borderTopColor} ${style.borderRightColor}`,
      textDecoration: `${style.textDecorationLine} ${style.textDecorationColor}`,
      transform: style.transform,
    };
  };
  const candidates = Array.from(document.querySelectorAll(selector)).filter(
    (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (rect.width < 2 || rect.height < 2) return false;
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (element.closest(".visually-hidden")) return false;
      if (element.getAttribute("type") === "hidden") return false;
      return true;
    },
  );
  window.__qaFocus = candidates.slice(0, 20);
  return window.__qaFocus.map((element) => ({
    tag: element.tagName.toLowerCase(),
    label: (
      element.getAttribute("aria-label") ||
      element.innerText ||
      element.getAttribute("placeholder") ||
      ""
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40),
    rest: read(element),
  }));
}

export function readFocusedStyles() {
  const candidates = window.__qaFocus ?? [];
  const active = document.activeElement;
  const position = candidates.indexOf(active);
  if (position < 0) return { position: -1 };
  const style = getComputedStyle(active);
  return {
    position,
    outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
    boxShadow: style.boxShadow,
    backgroundColor: style.backgroundColor,
    color: style.color,
    borderColor: `${style.borderTopColor} ${style.borderRightColor}`,
    textDecoration: `${style.textDecorationLine} ${style.textDecorationColor}`,
    transform: style.transform,
  };
}

export function evaluateChecks({ route, theme, motion, metrics }) {
  const checks = {};
  const push = (name, ok, detail) => {
    checks[name] = { ok, ...(detail === undefined ? {} : { detail }) };
  };

  push(
    "theme-applied",
    metrics.themeApplied === theme,
    `expected ${theme}, got ${metrics.themeApplied || "none"}`,
  );
  push(
    "reduced-motion-applied",
    metrics.reducedMotionApplied === (motion === "reduce"),
    `expected ${motion === "reduce"}, got ${metrics.reducedMotionApplied}`,
  );
  push("one-h1", metrics.h1Count === 1, `count=${String(metrics.h1Count)}`);
  push(
    "no-horizontal-overflow",
    metrics.documentWidth <= metrics.viewportWidth + 1,
    `document=${String(metrics.documentWidth)} viewport=${String(metrics.viewportWidth)}`,
  );
  push(
    "no-content-outside-viewport",
    metrics.outsideText.length === 0,
    metrics.outsideText,
  );
  push("no-clipped-text", metrics.clippedText.length === 0, metrics.clippedText);
  push("cls", metrics.cls <= MAX_CLS, `CLS=${metrics.cls.toFixed(4)} (limit ${MAX_CLS})`);
  push(
    "no-clipped-nav",
    metrics.navReport.every(
      (nav) => !nav.scrollable && nav.clippedLinks.length === 0,
    ),
    metrics.navReport,
  );
  push(
    "no-broken-images",
    metrics.brokenImages.length === 0 && metrics.pendingImages.length === 0,
    { broken: metrics.brokenImages, pending: metrics.pendingImages },
  );
  push("no-missing-media-source", metrics.mediaIssues.length === 0, metrics.mediaIssues);
  push("no-duplicate-visible-ids", metrics.duplicateIds.length === 0, metrics.duplicateIds);
  push("no-empty-media-slots", metrics.emptySlots.length === 0, metrics.emptySlots);
  push("no-internal-content-leak", metrics.leaks.length === 0, metrics.leaks);

  const workshopRoute = route.key === "home" || route.key === "careers";
  const provenanceLabels = Array.isArray(metrics.workshopLabels)
    ? metrics.workshopLabels
    : [];
  const falseRealClaims = provenanceLabels.filter(
    (label) =>
      /playable now/i.test(label) &&
      WORKSHOP_CAREERS.some((career) =>
        label.toLowerCase().includes(career.toLowerCase()),
      ),
  );
  const malformedLabels = provenanceLabels.filter(
    (label) => !/(playable now|workshop concept|taking shape|in the workshop)/i.test(label),
  );
  const workshopIssues = [];
  // Home now shows availability cards, not Workshop concept artifacts.
  if ((route.key === "careers" || metrics.workshopArtifactCount > 0) && !/workshop/i.test(metrics.bodyText)) {
    workshopIssues.push("no workshop wording in visible text");
  }
  if (workshopRoute && metrics.workshopArtifactCount > 0 && provenanceLabels.length === 0) {
    workshopIssues.push("workshop artefacts carry no provenance label");
  }
  if (falseRealClaims.length) {
    workshopIssues.push(...falseRealClaims.map((label) => `real claim on workshop career: ${label}`));
  }
  if (malformedLabels.length) {
    workshopIssues.push(...malformedLabels.map((label) => `unexpected provenance claim: ${label}`));
  }
  push(
    "workshop-provenance-visible",
    !workshopRoute || workshopIssues.length === 0,
    workshopRoute
      ? workshopIssues.length > 0
        ? workshopIssues
        : { labels: provenanceLabels, artefacts: metrics.workshopArtifactCount }
      : "not applicable",
  );

  if (route.key === "home") {
    const labels = metrics.homeCareerLabels ?? [];
    push("home-career-availability", labels.length === 5 &&
      labels.filter((label) => /Cybersecurity Analyst.*Playable now/i.test(label)).length === 1 &&
      labels.filter((label) => /Taking shape/i.test(label)).length === 4, labels);
  }

  const cyberRoute = route.key === "cyber";
  const cyberIssues = [];
  if (cyberRoute) {
    if (/workshop concept/i.test(metrics.bodyText)) {
      cyberIssues.push("workshop provenance label present on cyber page");
    }
    if (!/samples selected tasks|simplified/i.test(metrics.bodyText)) {
      cyberIssues.push("missing experience-scope honesty marker");
    }
    const escapes = new RegExp(
      `(?:${WORKSHOP_CAREERS.join("|")}).{0,160}(?:playable|play the|simulation)`,
      "i",
    );
    if (escapes.test(metrics.bodyText)) {
      cyberIssues.push("workshop career presented as playable simulation");
    }
  }
  push(
    "cyber-real-media-labels",
    !cyberRoute || cyberIssues.length === 0,
    cyberRoute ? cyberIssues : "not applicable",
  );

  return checks;
}
