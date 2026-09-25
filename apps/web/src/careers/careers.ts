import type { PublicCareer } from "./types.js";

/** Public copy and availability live here; no runtime pack is imported. */
export const careers: readonly PublicCareer[] = [
  {
    id: "cybersecurity-analyst",
    slug: "cybersecurity-analyst",
    title: "Cybersecurity Analyst",
    field: "Technology · Security",
    shortSummary:
      "Triage an alert, check the evidence, and hand off the shift.",
    workplaceSummary:
      "Spend a first day in Verdaly Technologies' security operations center. Read the handoff, inspect a suspicious login, and document what you can support.",
    skills: ["Evidence review", "Prioritization", "Clear handoffs"],
    plannedTasks: [
      "Find what the last analyst left open",
      "Read the alert signal",
      "Match the device to inventory",
    ],
    artifactOrMediaConcepts: [
      "Handoff email",
      "Alert record",
      "Investigation ticket",
    ],
    caveats: [
      "A short simulation of selected tasks, not a complete account of the occupation.",
      "No career fit score or hiring assessment.",
    ],
    sources: [
      "content/packs/cybersecurity-analyst/pack.yaml",
      "CHAT 11 worker brief",
    ],
    availability: "ready_now",
    detailPublished: true,
    requestable: false,
    simulationRoute: "/start",
  },
  {
    id: "registered-nurse",
    slug: "registered-nurse",
    title: "Registered Nurse",
    field: "Healthcare",
    shortSummary:
      "Help care for patients by noticing changes, organizing information, communicating with a healthcare team, and keeping accurate records.",
    workplaceSummary: "Hospital / care setting",
    skills: ["Observation", "Communication", "Prioritization", "Documentation"],
    plannedTasks: [
      "Review synthetic patient information",
      "Recognize and communicate a meaningful change",
      "Organize a handoff",
    ],
    artifactOrMediaConcepts: [],
    caveats: ["Workshop preview only. No simulation is available."],
    contentCaveats: [
      "Synthetic information only; no real clinical procedure, dosing, or diagnosis instruction.",
    ],
    sources: ["CHAT 11 Control Tower canonical Workshop copy"],
    availability: "in_workshop",
    detailPublished: false,
    requestable: true,
  },
  {
    id: "mechanical-engineer",
    slug: "mechanical-engineer",
    title: "Mechanical Engineer",
    field: "Engineering",
    shortSummary:
      "Turn a design problem into something that can be tested, measured, improved, and built.",
    workplaceSummary: "Engineering office / prototype lab",
    skills: [
      "Systems thinking",
      "Spatial reasoning",
      "Quantitative reasoning",
      "Technical communication",
    ],
    plannedTasks: [
      "Read a technical drawing",
      "Review test results",
      "Investigate a failure and recommend a design change",
    ],
    artifactOrMediaConcepts: [],
    caveats: ["Workshop preview only. No simulation is available."],
    contentCaveats: [
      "Preserve authentic design and testing reasoning; avoid generic math puzzles.",
    ],
    sources: ["CHAT 11 Control Tower canonical Workshop copy"],
    availability: "in_workshop",
    detailPublished: false,
    requestable: true,
  },
  {
    id: "electrician",
    slug: "electrician",
    title: "Electrician",
    field: "Skilled trades",
    shortSummary:
      "Read plans, inspect electrical systems, spot problems, and make safety-focused decisions about how work should proceed.",
    workplaceSummary: "Construction / commercial maintenance",
    skills: [
      "Troubleshooting",
      "Spatial reasoning",
      "Safety awareness",
      "Planning",
    ],
    plannedTasks: [
      "Interpret a simplified blueprint",
      "Identify a simulated safety concern",
      "Review conceptual diagnostics and report the result",
    ],
    artifactOrMediaConcepts: [],
    caveats: ["Workshop preview only. No simulation is available."],
    contentCaveats: [
      "Abstract, de-energized simulated diagnostics; no live-work procedural instruction.",
    ],
    sources: ["CHAT 11 Control Tower canonical Workshop copy"],
    availability: "in_workshop",
    detailPublished: false,
    requestable: true,
  },
  {
    id: "lawyer-attorney",
    slug: "lawyer-attorney",
    title: "Lawyer / Attorney",
    field: "Law",
    shortSummary:
      "Sort facts, sources, and open questions before a legal team decides what to do next.",
    workplaceSummary: "Law firm / in-house legal team",
    skills: [
      "Source evaluation",
      "Issue spotting",
      "Case organization",
      "Clear writing",
    ],
    plannedTasks: [
      "Compare client notes, a timeline, and a contract to find missing facts and escalation flags",
      "Organize public docket records, evidence, and witness notes into a cited chronology",
      "Match facts to statutes or case references and draft a neutral, source-linked issue brief",
    ],
    artifactOrMediaConcepts: [],
    caveats: ["Workshop preview only. No simulation is available."],
    contentCaveats: [
      "A simplified preview of legal analysis and case organization; not legal advice, a courtroom simulation, or unsupervised professional practice.",
    ],
    sources: ["Wave 2.5 Control Tower Lawyer / Attorney brief"],
    availability: "coming_soon",
    detailPublished: false,
    requestable: true,
  },
];

export function getCareerBySlug(slug: string): PublicCareer | undefined {
  return careers.find((career) => career.slug === slug);
}

export function careerPath(career: PublicCareer): `/careers/${string}` {
  return `/careers/${career.slug}`;
}
