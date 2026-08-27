# Beginner Interactive Shift Design

**Date:** 2026-08-27  
**Status:** Approved  
**Audience:** Direct-to-user beta, age 13+, no cybersecurity background required

## Outcome

Turn the current card-driven cybersecurity flow into a 10–15 minute workplace experience. Player performs short, understandable job tasks inside believable tools. Main case stays connected across shift; one routine interruption contains a missing-handoff subproblem; a later employee reply makes earlier investigation choices matter.

Experience teaches job feel, not cybersecurity trivia. Difficulty comes from comparing information, noticing uncertainty, organizing clues, choosing safe next steps, and communicating clearly. No reflex scoring, hidden answer-card quiz, numeric assessment meter, or harsh failure screen.

## Locked flow

1. **Arrival (1 minute):** enter SOC, find desk, sign in.
2. **Incomplete handoff (2 minutes):** read night analyst note, identify unfinished work, confirm initial priority with Morgan.
3. **Main suspicious-login case (3 minutes):** compare normal and flagged login records, inspect device/account context, save useful clues.
4. **Optional routine interruption (2 minutes):** scanner alert notification offers Handle now, Snooze once, or Continue main case. Handoff omitted maintenance-window reference, so player must find and match it before closure.
5. **Main case deepens (3–4 minutes):** device ownership check plus employee reply, “That login was not me.” Earlier collected clues become visibly relevant.
6. **Decision and documentation (2 minutes):** build ticket from guided evidence/reason/next-step pieces, then escalate, dismiss, or ask Morgan.
7. **Wrap-up (1 minute):** visible consequences, Morgan response, short eight-part debrief.

Simulated time advances through canonical actions. Notification handling itself consumes no time and creates no evidence. No hard real-time timer.

## Guidance and navigation

A persistent guided case rail appears beside workstation apps and in structured mode. It shows:

- current objective in one sentence;
- main-case stage and completed work labels;
- pending interruption with priority and Resume control;
- last active task;
- “Why this matters” plain-language explanation;
- optional hints and term explanations.

Guidance fades deliberately:

- first handoff task highlights exact control and explains every term;
- middle comparison tasks highlight destination but not answer;
- final decision has no highlighted answer, though Morgan remains available.

Every screen starts with plain language. Authentic terms appear as optional tap-to-explain chips. Main instruction blocks stay under roughly 80 words; deeper details remain expandable.

## Hybrid task model

Main case uses varied task presentations; interruption reuses smaller patterns. Supported v1 kinds:

- `compare_records`: inspect two public artifacts and select meaningful differences;
- `select_clues`: choose useful evidence from a small clue tray;
- `match_reference`: connect an alert/detail to an approved reference;
- `build_summary`: select one evidence, uncertainty/reason, and next-step phrase;
- `choose_response`: choose a workplace communication or priority response.

Each task may contain one or more steps. Pack content defines prompt, safe options, related artifact IDs, deterministic answer requirements, success text, and coaching text. Correct-answer requirements never enter `ClientView`.

Weak answers receive deterministic coaching and retry. Early and middle task attempt counts do not affect evidence, debrief interpretation, sim time, or career conclusions. Final professional action and documented reasoning remain canonical evidence sources.

## Deterministic contracts

Career pack gains task and notification definitions. Server-owned state gains task progress and notification response state.

Safe public task shape:

```ts
type ClientTaskView = {
  id: string;
  eventId: string;
  actionId: SimulationActionId;
  systemId: WorkSystemId;
  kind: WorkTaskKind;
  title: string;
  prompt: string;
  instruction: string;
  whyItMatters: string;
  relatedArtifactIds: string[];
  stepIndex: number;
  stepCount: number;
  options: Array<{ id: string; label: string; detail?: string; term?: string; termHelp?: string }>;
  minSelections: number;
  maxSelections: number;
};
```

Submission/result:

```ts
type TaskAttempt = { taskId: string; eventId: string; selectedOptionIds: string[] };
type TaskAttemptFeedback = {
  accepted: boolean;
  completed: boolean;
  feedback: string;
  view: ClientView;
  effects: DomainEffect[];
};
```

New procedures:

- `simulation.submitTaskAttempt`: validates current task and selection; failed attempts update only attempt metadata; successful intermediate steps advance task progress; final step atomically performs linked action once.
- `simulation.respondToNotification`: accepts `handle`, `snooze`, or `continue`; updates canonical notification state; no sim time/evidence.

Direct `performAction` rejects an action whose required task is incomplete. Untasked utility actions continue through current endpoint.

## Notification behavior

When routine event activates, serializer exposes one safe notification. UI shows nonmodal banner and case-rail item.

- **Handle now:** acknowledges notification and opens linked system/event.
- **Snooze:** hides banner until simulated clock advances 15 minutes; allowed once.
- **Continue:** acknowledges banner but leaves interruption visible in case rail.

Event deadline keeps advancing regardless of UI response. This creates professional prioritization through existing deterministic time, not navigation speed.

## Accessibility and safety

- Structured mode renders same task IDs, options, attempt endpoint, feedback, and action outcomes using fieldsets, checkboxes/radios, headings, and live regions.
- Compare tasks provide textual side-by-side summaries; color and spatial placement never carry meaning alone.
- Keyboard can open notification, select every option, request help, retry, resume, and finish shift.
- AI cannot validate answers, add clues, alter task progress, or change outcomes.
- Restricted facts and answer keys stay in server-owned rules.

## Acceptance

- Normal route contains no generic card click for every investigative verb; “inspect,” “compare,” “match,” and “document” open actual tasks.
- Golden path takes 10–15 minutes in moderated beginner testing, excluding optional room exploration.
- One main case, routine interruption, missing-handoff subproblem, employee callback, and delayed consequence all appear.
- Player can always identify current objective and resume interrupted work within one control.
- Weak task response produces coaching and retry, not action completion or sim-time advance.
- Same successful task/action log replays to identical state.
- Structured and visual routes expose identical canonical task/action IDs and outcomes.
- No answer keys, hidden state, numeric assessment language, or technical prerequisite quiz appears client-side.

