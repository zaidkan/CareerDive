import { expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { createInitialWorldState, toClientView } from "@sim/core";
import { recordFilterChoices } from "../src/components/tools/closedInputChoices.js";

it("offers readable RUN identifiers and device labels without leaking unopened bodies", () => {
  const view = toClientView(createInitialWorldState("choices", 7, {}, loadDefaultCybersecurityPack()));
  view.artifacts = [{
    id: "source", systemId: "alert_dashboard", kind: "login_record", title: "Scanner",
    summary: "Compare RUN-FIN-030 and RUN-FIN-031; corp-phone-12, loaner-pool-4.",
    body: "Hidden run RUN-PRIVATE-999", observed: false, eventIds: [],
  }];
  expect(recordFilterChoices(view, "runId", "scanner")).toEqual(["RUN-FIN-030", "RUN-FIN-031"]);
  expect(recordFilterChoices(view, "deviceLabel", "devices")).toEqual(["corp-phone-12", "loaner-pool-4"]);
  for (const artifact of view.artifacts) artifact.observed = true;
  expect(recordFilterChoices(view, "runId", "scanner")).toContain("RUN-PRIVATE-999");
});
