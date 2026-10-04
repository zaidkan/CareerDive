import { z } from "zod";
/** Canonical first-party launch contract. No text, URLs, fingerprints or user IDs. */
export const LaunchEventNameSchema = z.enum([
  "landing",
  "career_viewed",
  "start_initiated",
  "shift_started",
  "meaningful_investigation",
  "decision",
  "handoff",
  "shift_completed",
  "debrief_viewed",
  "feedback_report",
]);
export type LaunchEventName = z.infer<typeof LaunchEventNameSchema>;
export const LaunchEventSchema = z
  .object({
    eventId: z.string().uuid(),
    name: LaunchEventNameSchema,
    careerId: z
      .enum([
        "cybersecurity-analyst",
        "registered-nurse",
        "mechanical-engineer",
        "electrician",
        "lawyer-attorney",
      ])
      .optional(),
  })
  .strict();
export const SupportReportSchema = z
  .object({
    createRequestId: z.string().uuid(),
    category: z.enum([
      "Starting a shift",
      "Workplace",
      "Accessibility",
      "Other",
    ]),
    description: z.string().trim().min(1).max(5000),
    contact: z.string().trim().max(254).default(""),
    technicalDetails: z
      .object({
        webgl: z.boolean(),
        webgl2: z.boolean(),
        reducedMotion: z.boolean(),
        browser: z
          .string()
          .regex(/^(Unknown|(?:Chrome|Firefox|Safari|Edg|OPR) [\d.]{1,24})$/),
        viewport: z.string().regex(/^\d{1,5} × \d{1,5}$/),
        build: z.string().regex(/^(unknown|[a-f0-9]{7,40})$/),
        route: z.enum([
          "/",
          "/careers",
          "/start",
          "/trust",
          "/faq",
          "/simulation",
        ]),
        phase: z
          .string()
          .max(64)
          .regex(/^[a-zA-Z0-9_-]+$/),
        apiFailure: z
          .string()
          .max(64)
          .regex(/^[a-zA-Z0-9_-]+$/),
        assetFailure: z
          .string()
          .max(64)
          .regex(/^[a-zA-Z0-9_-]+$/),
      })
      .strict()
      .optional(),
  })
  .strict();
export type SupportReport = z.infer<typeof SupportReportSchema>;
