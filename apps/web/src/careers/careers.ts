import type { PublicCareer } from "./types.js";

/** Public copy and availability live here; no runtime pack is imported. */
export const careers: readonly PublicCareer[] = [
  {
    id: "cybersecurity-analyst",
    slug: "cybersecurity-analyst",
    title: "Cybersecurity Analyst",
    field: "Technology · Security",
    shortSummary:
      "Try a ~10–15-minute first-shift simulation: triage an alert, check evidence, and hand off. Review your recorded decisions in an evidence-based debrief.",
    workplaceSummary:
      "Try a focused slice of a junior analyst's work in Verdaly's fictional security operations center. Read the handoff, inspect a suspicious login, and document what you can support. This is not a full workday or a complete picture of the job.",
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
    pathway: [
      "A bachelor's degree in a computer science field is the usual entry, with related work experience.",
      "Some people enter with a high school diploma plus industry training and certifications, and many employers value professional certification.",
    ],
    misconceptions: [
      {
        claim: "The job is mostly hacking back at attackers.",
        correction:
          "This simulated first shift samples triage, evidence checking, and documentation inside approval boundaries; offensive work is a separate, separately authorized role.",
      },
      {
        claim: "An alert means something is confirmed compromised.",
        correction:
          "An alert is a signal to verify. The analyst records what the evidence supports and what is still open.",
      },
    ],
    realityNotes: [
      "Alert work arrives in bursts with quiet stretches between them.",
      "Unfinished work is written down and handed to the next shift rather than closed out by guesswork.",
    ],
    sources: [
      "content/packs/cybersecurity-analyst/pack.yaml",
      "docs/content/public-career-content-packet.md",
      "BLS OOH Information Security Analysts",
      "NIST NICE Workforce Framework for Cybersecurity",
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
    artifactOrMediaConcepts: [
      "Synthetic patient record",
      "Observation note",
      "Handoff sheet",
      "Escalation message",
    ],
    caveats: ["Taking shape. No simulation is available."],
    contentCaveats: [
      "Synthetic information only; no real clinical procedure, dosing, or diagnosis instruction.",
    ],
    pathway: [
      "Three usual routes: a bachelor's degree in nursing, an associate degree in nursing, or a diploma from an approved nursing program. All include supervised clinical experience.",
      "Graduates then pass a qualifying exam for a state license. Employers, particularly hospitals, often prefer or require a bachelor's, and ADN or diploma nurses can later complete an RN-to-BSN program.",
    ],
    misconceptions: [
      {
        claim: "Nurses carry out a doctor's orders and nothing else.",
        correction:
          "Nursing includes independent assessment, prioritization of what changes first, escalation, and continuous documentation. This preview is built around noticing and communicating a change, not prescribing one.",
      },
      {
        claim: "The job is bedside tasks only.",
        correction:
          "A large share of the work is recording information accurately and handing it to the next person cleanly, which is why documentation and handoff are first-class tasks here.",
      },
    ],
    realityNotes: [
      "Schedules commonly include nights, weekends, and holidays.",
      "Everything in this preview is synthetic; completing it confers no clinical competence, credential, or license.",
    ],
    sources: [
      "CHAT 11 Control Tower canonical Workshop copy",
      "docs/content/public-career-content-packet.md",
      "BLS OOH Registered Nurses",
    ],
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
    artifactOrMediaConcepts: [
      "Technical drawing",
      "Test report",
      "Failure analysis note",
      "Proposed design change",
    ],
    caveats: ["Taking shape. No simulation is available."],
    contentCaveats: [
      "Preserve authentic design and testing reasoning; avoid generic math puzzles.",
    ],
    pathway: [
      "A bachelor's degree in mechanical engineering or mechanical engineering technology, usually from an accredited program. Accreditation is usually required for later licensure.",
      "Licensure is not required for entry-level work. A Professional Engineering license comes later, with an accredited degree, the Fundamentals of Engineering exam, typically about four years of experience, and the Professional Engineering exam. Selling engineering services to the public requires licensure in every state and the District of Columbia.",
    ],
    misconceptions: [
      {
        claim:
          "Engineering is solving equations until the number comes out right.",
        correction:
          "The work is framing a problem that can be tested, choosing constraints, reading imperfect results, and recommending a change someone can build.",
      },
      {
        claim: "A design is finished when it looks right on paper.",
        correction:
          "Most of the cycle is revision after test data or a failure contradicts the first idea, which is why investigating a failure is a planned task here.",
      },
    ],
    realityNotes: [
      "Expect iteration rather than a single breakthrough.",
      "Simulation results are instructional only. Simulated work is not reviewed, sealed, or certified by a licensed professional engineer.",
    ],
    sources: [
      "CHAT 11 Control Tower canonical Workshop copy",
      "docs/content/public-career-content-packet.md",
      "BLS OOH Mechanical Engineers",
    ],
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
    artifactOrMediaConcepts: [
      "Simplified blueprint",
      "Safety concern report",
      "Conceptual diagnostic result",
      "Work plan note",
    ],
    caveats: ["Taking shape. No simulation is available."],
    contentCaveats: [
      "Abstract, de-energized simulated diagnostics; no live-work procedural instruction.",
    ],
    pathway: [
      "Most electricians learn through an apprenticeship, typically four or five years with about 2,000 hours of paid on-the-job training plus technical instruction each year. Some start at a technical school.",
      "A high school diploma or equivalent is the usual entry education, and most states require electricians to pass a test and be licensed. Requirements vary by state.",
    ],
    misconceptions: [
      {
        claim: "The job is tracing a wire diagram.",
        correction:
          "Plans are the starting point. The actual work is inspecting an installed system, comparing it to what should be there, and deciding what happens next safely.",
      },
      {
        claim: "Apprentices begin by doing live work on their own.",
        correction:
          "Apprenticeship is supervised hours plus classroom instruction. Independent, licensed work comes after the program and the state test.",
      },
    ],
    realityNotes: [
      "Work happens in unfinished spaces, outdoors, and inside finished buildings, often against a schedule. Safety procedure is part of the task itself.",
      "This preview reasons about abstract, de-energized situations only and is not a substitute for supervised training.",
    ],
    sources: [
      "CHAT 11 Control Tower canonical Workshop copy",
      "docs/content/public-career-content-packet.md",
      "BLS OOH Electricians",
    ],
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
    artifactOrMediaConcepts: [
      "Client fact summary",
      "Case chronology",
      "Contract review notes",
      "Issue brief",
    ],
    caveats: ["Taking shape. No simulation is available."],
    contentCaveats: [
      "A simplified preview of legal analysis and case organization; not legal advice, a courtroom simulation, or unsupervised professional practice.",
    ],
    pathway: [
      "Most states and jurisdictions require a Juris Doctor from an accredited law school, followed by the bar exam and admission by the state's admitting board.",
      "Bar exam scores transfer only between jurisdictions that recognize them, so licensing is local.",
    ],
    misconceptions: [
      {
        claim: "Lawyers spend the day in a courtroom.",
        correction:
          "Most of the work is reading, comparing, and writing, organizing facts and sources so a team can decide. That is exactly what these preview tasks practice.",
      },
      {
        claim: "If it is on the internet, it is usable law.",
        correction:
          "What applies depends on jurisdiction and date, and nothing in this preview is advice for a real situation.",
      },
    ],
    realityNotes: [
      "The substance is reading and writing under real deadlines, not drama.",
      "Jurisdiction and year matter, so a fact can be right and still not apply. This preview creates no attorney-client relationship and is not legal advice.",
    ],
    sources: [
      "Wave 2.5 Control Tower Lawyer / Attorney brief",
      "docs/content/public-career-content-packet.md",
      "BLS OOH Lawyers",
    ],
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
