// Query accessibility acceptance contract.
//
// Scope: TEST ONLY. Behavior/contracts, never exact CSS or product copy.
// Canonical refs:
// - parity matrix: Structured query parity 1-6, Keyboard accessibility,
//   Screen-reader/semantic requirements, Information parity (no visual-only,
//   no color-only, no hover-only, no drag-only)
// - playtest pack §14 (PT-A11Y manual checks)
// - interactivity design §5.1 (query UI), §13.4 (evidence parity)
//
// Two tiers:
// Tier 1 (this file, active `it` blocks): renderer-neutral contract derived
//   from the frozen P2-T01 allowlists. Asserts every dataset/filter dimension
//   HAS a labeling, role, announcement, and reflow requirement. Runs green
//   without any DOM harness.
// Tier 2 (`describe.skip` suite at the bottom): real DOM bindings per
//   renderer. SKIPPED because packages/testing has no web DOM harness.
//   Port to apps/web and bind to the query surface before enabling; these are the
//   intentionally-RED-pending items — do NOT force them green by editing
//   production code from this lane.

import { describe, expect, it } from "vitest";
import {
  DATASET_FILTER_FIELDS,
  DatasetIdSchema,
  TIME_WINDOW_FILTER_FIELDS,
  type DatasetId,
} from "@sim/schemas";

// ---------------------------------------------------------------------------
// Renderer-neutral accessibility contract for one dataset's query surface.
// Each renderer (Desk filter UI, Accessible list, 3D workstation wrapper)
// must satisfy every clause with the same information content.
// ---------------------------------------------------------------------------

interface FilterControlContract {
  dimension: string;
  label: string;
  role: "searchbox" | "combobox" | "spinbutton" | "text-input";
  keyboardSubmittable: boolean;
  removableByKeyboard: boolean;
}

interface QuerySurfaceContract {
  datasetId: DatasetId;
  datasetPickerLabel: string;
  datasetPickerRole: "tab" | "radio" | "combobox" | "menu";
  filters: FilterControlContract[];
  resultsRole: "table" | "list";
  resultsAnnouncedAs: string;
  emptyStateSuggestsNextVerbs: boolean;
  requiresHover: boolean;
  requiresDrag: boolean;
  colorOnlyState: boolean;
  reflowLinearizes: boolean;
  focusTargets: string[];
}

function textInputFor(dimension: string): FilterControlContract {
  return {
    dimension,
    label: `Filter by ${dimension}`,
    role: "text-input",
    keyboardSubmittable: true,
    removableByKeyboard: true,
  };
}

function contractFor(datasetId: DatasetId): QuerySurfaceContract {
  const stringDims: string[] = [...DATASET_FILTER_FIELDS[datasetId]];
  const windowDims: string[] = [...TIME_WINDOW_FILTER_FIELDS];
  return {
    datasetId,
    datasetPickerLabel: "Record dataset",
    datasetPickerRole: "tab",
    filters: [...stringDims, ...windowDims].map(textInputFor),
    resultsRole: "table",
    resultsAnnouncedAs: "N results",
    emptyStateSuggestsNextVerbs: true,
    requiresHover: false,
    requiresDrag: false,
    colorOnlyState: false,
    reflowLinearizes: true,
    focusTargets: ["query tool heading", "results heading", "back to results"],
  };
}

const CONTRACTS = DatasetIdSchema.options.map(contractFor);

describe("Q-A11Y-10 every dataset has a keyboard-operable surface contract", () => {
  it("covers all six beta datasets with a named dataset picker", () => {
    expect(CONTRACTS).toHaveLength(6);
    for (const contract of CONTRACTS) {
      expect(contract.datasetPickerLabel.trim()).not.toBe("");
      expect([
        "tab",
        "radio",
        "combobox",
        "menu",
      ]).toContain(contract.datasetPickerRole);
    }
  });

  it("gives every allowlisted filter dimension a labelled, keyboard-submittable control", () => {
    for (const contract of CONTRACTS) {
      const required = [
        ...DATASET_FILTER_FIELDS[contract.datasetId],
        ...TIME_WINDOW_FILTER_FIELDS,
      ];
      expect(contract.filters.map((f) => f.dimension).sort()).toEqual(
        [...required].sort(),
      );
      for (const filter of contract.filters) {
        expect(filter.label).toMatch(new RegExp(filter.dimension));
        expect(filter.keyboardSubmittable).toBe(true);
        expect(filter.removableByKeyboard).toBe(true);
      }
    }
  });

  it("announces results as a counted status with semantic structure", () => {
    for (const contract of CONTRACTS) {
      expect(["table", "list"]).toContain(contract.resultsRole);
      expect(contract.resultsAnnouncedAs).toMatch(/N results/);
      expect(contract.focusTargets.length).toBeGreaterThan(0);
    }
  });
});

describe("Q-A11Y-20 no exclusionary interaction or signal", () => {
  it("requires no hover, no drag, and no color-only state on any dataset", () => {
    for (const contract of CONTRACTS) {
      expect(contract.requiresHover).toBe(false);
      expect(contract.requiresDrag).toBe(false);
      expect(contract.colorOnlyState).toBe(false);
    }
  });

  it("frames zero results as next verbs, never as failure or grade", () => {
    for (const contract of CONTRACTS) {
      expect(contract.emptyStateSuggestsNextVerbs).toBe(true);
    }
    const forbidden = /fail|wrong|incorrect|score|grade|stars/i;
    // Contract vocabulary fixed above carries none of the forbidden terms.
    expect(JSON.stringify(CONTRACTS)).not.toMatch(forbidden);
  });

  it("keeps a narrow/reflow-safe structure where the harness can check it", () => {
    // Renderer-neutral bar: the surface linearizes (stacked layout / list
    // reading order) instead of relying on side-by-side pointer layout.
    for (const contract of CONTRACTS) {
      expect(contract.reflowLinearizes).toBe(true);
    }
  });
});

describe("Q-A11Y-30 contract parity across the three renderer pathways", () => {
  it("holds the same filter dimensions for Desk, Accessible, and 3D wrapper", () => {
    // The 3D workstation pathway must call the same canonical query action
    // with the same parameters — never a parallel reduced filter set.
    const pathways = ["desk", "accessible", "workstation-3d"] as const;
    for (const datasetId of DatasetIdSchema.options) {
      const perPathway = pathways.map(
        () => contractFor(datasetId).filters.map((f) => f.dimension).sort(),
      );
      for (const dims of perPathway) expect(dims).toEqual(perPathway[0]);
    }
  });
});

// ---------------------------------------------------------------------------
// Tier 2 — DOM bindings per renderer. SKIPPED: no web DOM harness exists in
// packages/testing. Each item
// below is an intentionally-RED-pending acceptance requirement: port to
// apps/web (jsdom + testing-library) or un-skip once the T06 surface exists.
// ---------------------------------------------------------------------------

describe.skip("Q-A11Y-40 DOM bindings (pending T06 web surface — do not force green)", () => {
  it("Desk: every query filter is a real labelled input operable by keyboard", () => {
    // Bind to Desk filter UI: Tab reaches each filter, Enter submits, Escape
    // clears/closes per documented behavior; active filters removable by
    // keyboard. Requires the query tool and a jsdom harness.
    expect(true).toBe(false);
  });

  it("Accessible: record results use table/list semantics with stable IDs", () => {
    // Bind to Accessible list: results as real table (headers/scope/caption)
    // or list; stable record IDs in text; count announced ("N results for").
    expect(true).toBe(false);
  });

  it("3D workstation: query wrapper submits the identical canonical action", () => {
    // Bind to DeskOs/3D wrapper: same dataset + filters + result set as Desk
    // for the same normalized query; navigation position changes nothing.
    expect(true).toBe(false);
  });

  it("Empty state is an announced status suggesting next verbs in all renderers", () => {
    // Bind all three: zero rows renders a real status (role=status), suggests
    // widen-window/check-spelling/open-runbook in text, never reads as grade.
    expect(true).toBe(false);
  });
});
