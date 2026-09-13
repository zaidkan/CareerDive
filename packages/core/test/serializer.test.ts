import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { describe, expect, it } from "vitest";
import { createInitialWorldState, toClientView } from "../src/index.js";

describe("client artifact serialization", () => {
  it("exposes only approved inventory identifiers, never unopened record details", () => {
    const state = createInitialWorldState(
      "lookup-privacy",
      42,
      {},
      loadDefaultCybersecurityPack(),
    );
    const artifact = state.artifacts["device-inventory-1"];
    if (!artifact) throw new Error("Missing inventory fixture");
    artifact.metadata.privateDetail = "restricted inventory detail";
    const view = toClientView(state);
    const preview = view.artifacts.find(({ id }) => id === artifact.id);
    expect(preview).toMatchObject({
      lookupKeys: ["unknown-laptop-17"],
      observed: false,
    });
    for (const field of [
      "body",
      "metadata",
      "searchableText",
      "relatedArtifactIds",
    ])
      expect(preview).not.toHaveProperty(field);
    expect(JSON.stringify(view)).not.toMatch(
      /restricted inventory detail|requiredOptionIds|coachOnFailure|successText/,
    );
    // Even explicitly supplied keys are not public on other artifact types or systems.
    const email = state.artifacts["handoff-email"];
    if (!email) throw new Error("Missing email fixture");
    email.metadata.lookupKeys = "private-device";
    expect(
      toClientView(state).artifacts.find(({ id }) => id === email.id),
    ).not.toHaveProperty("lookupKeys");
    artifact.systemId = "email";
    expect(
      toClientView(state).artifacts.find(({ id }) => id === artifact.id),
    ).not.toHaveProperty("lookupKeys");
  });

  it("does not derive lookup identifiers from bodies or arbitrary metadata", () => {
    const state = createInitialWorldState(
      "lookup-no-inference",
      42,
      {},
      loadDefaultCybersecurityPack(),
    );
    const artifact = state.artifacts["device-inventory-1"];
    if (!artifact) throw new Error("Missing inventory fixture");
    artifact.metadata = { privateDevice: "hidden-laptop-17" };
    expect(
      toClientView(state).artifacts.find(({ id }) => id === artifact.id),
    ).not.toHaveProperty("lookupKeys");
    artifact.metadata.lookupKeys = "The device is not enrolled";
    expect(
      toClientView(state).artifacts.find(({ id }) => id === artifact.id),
    ).not.toHaveProperty("lookupKeys");
  });
  it("omits unopened artifact details from the client view", () => {
    const state = createInitialWorldState(
      "serializer-session",
      42,
      {},
      loadDefaultCybersecurityPack(),
    );

    const handoff = toClientView(state).artifacts.find(
      ({ id }) => id === "handoff-email",
    );

    expect(handoff?.observed).toBe(false);
    expect(handoff).not.toHaveProperty("body");
    expect(handoff).not.toHaveProperty("metadata");
    expect(handoff).not.toHaveProperty("searchableText");
  });
});
