import { describe, expect, it } from "vitest";
import { loadDefaultCybersecurityPack } from "@sim/career-packs";
import { foldActionLog } from "@sim/core";
import type { CareerPack } from "@sim/schemas";
import {
  createAppRouter,
  InMemoryRepository,
  type AppContext,
} from "../src/index.js";

/**
 * P2-T06 server/transport acceptance for the canonical `query_records`
 * action. Covers the existing `simulation.performAction` pathway only:
 * valid query, zero rows, malformed payload, unknown dataset, invalid
 * filter, invalid time window, and a legacy-action regression.
 */
function queryTestPack(): CareerPack {
  const pack = structuredClone(loadDefaultCybersecurityPack());
  pack.scenario.actions.push({
    id: "query_records",
    systemId: "knowledge_base",
    label: "Search records",
    description: "Query structured SOC datasets.",
    simulatedMinutes: 5,
    energyCost: 0,
    tracksCompletion: false,
  });
  pack.scenario.datasets = {
    auth: {
      records: [
        {
          id: "auth-1",
          datasetId: "auth",
          simMinutes: 461,
          relatedRecordIds: [],
          user: "j.patel",
          sourceIp: "203.0.113.44",
          deviceLabel: "unknown-laptop-17",
          method: "password",
          result: "success",
          sessionId: "s-0741",
        },
        {
          id: "auth-2",
          datasetId: "auth",
          simMinutes: 444,
          relatedRecordIds: [],
          user: "a.nguyen",
          sourceIp: "198.51.100.20",
          deviceLabel: "corp-macbook-nguyen",
          method: "sso",
          result: "success",
          sessionId: "s-0731",
        },
      ],
      allowedFilterFields: ["user", "sourceIp", "deviceLabel", "sessionId"],
    },
  };
  return pack;
}

function setup() {
  const repository = new InMemoryRepository();
  const router = createAppRouter(repository, { careerPack: queryTestPack() });
  const context: AppContext = { userId: "user-1" };
  return { repository, caller: router.createCaller(context) };
}

async function createSession(caller: ReturnType<typeof setup>["caller"]) {
  const created = await caller.session.create({
    seed: 7,
    sessionKind: "assessed",
    pacingMode: "standard",
  });
  return created.sessionId;
}

const QUERY = {
  actionId: "query_records",
  eventId: "handoff-1",
} as const;

describe("query_records server transport", () => {
  it("executes a valid query through performAction and returns records", async () => {
    const { caller, repository } = setup();
    const sessionId = await createSession(caller);

    const result = await caller.simulation.performAction({
      sessionId,
      ...QUERY,
      queryPayload: { datasetId: "auth", filters: { user: "j.patel" } },
    });

    expect(result.sequence).toBe(1);
    expect(result.effects).toMatchObject([
      { type: "action_applied", actionId: "query_records" },
    ]);
    const queryResults = result.view.queryResults;
    expect(queryResults).toHaveLength(1);
    expect(queryResults[0]).toMatchObject({
      datasetId: "auth",
      resultIds: ["auth-1"],
      totalCount: 1,
      truncated: false,
    });

    const stored = await repository.getSession("user-1", sessionId);
    expect(stored.actionLog).toHaveLength(1);
    expect(stored.actionLog[0]?.interaction).toEqual({
      type: "action",
      action: {
        id: "query_records",
        eventId: "handoff-1",
        actorId: "user",
        queryPayload: { datasetId: "auth", filters: { user: "j.patel" } },
      },
    });
  });

  it("treats a legitimate zero-result query as a success", async () => {
    const { caller } = setup();
    const sessionId = await createSession(caller);

    const result = await caller.simulation.performAction({
      sessionId,
      ...QUERY,
      queryPayload: { datasetId: "auth", filters: { user: "nobody-here" } },
    });

    expect(result.sequence).toBe(1);
    expect(result.view.queryResults[0]).toMatchObject({
      datasetId: "auth",
      records: [],
      resultIds: [],
      totalCount: 0,
      truncated: false,
    });
  });

  it("replays a transported query deterministically from the stored log", async () => {
    const { caller, repository } = setup();
    const sessionId = await createSession(caller);
    const payload = { datasetId: "auth", filters: { user: "a.nguyen" } };

    await caller.simulation.performAction({
      sessionId,
      ...QUERY,
      queryPayload: payload,
    });

    const stored = await repository.getSession("user-1", sessionId);
    const { createInitialWorldState } = await import("@sim/core");
    const initial = createInitialWorldState(
      sessionId,
      7,
      {},
      queryTestPack(),
    );
    // Session ids are random per create; align the replay baseline.
    const replayed = foldActionLog(
      { ...initial, sessionId: stored.state.sessionId },
      stored.actionLog,
    );
    expect(replayed.queryHistory).toEqual(stored.state.queryHistory);
  });

  it("rejects a malformed payload as invalid_payload without logging", async () => {
    const { caller, repository } = setup();
    const sessionId = await createSession(caller);

    await expect(
      caller.simulation.performAction({
        sessionId,
        ...QUERY,
        queryPayload: { datasetId: "auth", filters: ["user"] },
      }),
    ).rejects.toThrow("Query rejected (invalid_payload)");

    const stored = await repository.getSession("user-1", sessionId);
    expect(stored.actionLog).toHaveLength(0);
    expect(stored.state.queryHistory).toHaveLength(0);
  });

  it("rejects an unknown filter key as invalid_payload", async () => {
    const { caller } = setup();
    const sessionId = await createSession(caller);

    await expect(
      caller.simulation.performAction({
        sessionId,
        ...QUERY,
        queryPayload: {
          datasetId: "auth",
          filters: { noSuchDimension: "x" },
        },
      }),
    ).rejects.toThrow("Query rejected (invalid_payload)");
  });

  it("rejects a dataset id outside the closed enum as invalid_payload", async () => {
    const { caller } = setup();
    const sessionId = await createSession(caller);

    await expect(
      caller.simulation.performAction({
        sessionId,
        ...QUERY,
        queryPayload: { datasetId: "hr", filters: {} },
      }),
    ).rejects.toThrow("Query rejected (invalid_payload)");
  });

  it("rejects a valid-enum but unconfigured dataset as unknown_dataset", async () => {
    const { caller, repository } = setup();
    const sessionId = await createSession(caller);

    const error = await caller.simulation
      .performAction({
        sessionId,
        ...QUERY,
        queryPayload: { datasetId: "vpn", filters: {} },
      })
      .catch((cause: unknown) => cause as Error);
    expect(String(error)).toMatch("Query rejected (unknown_dataset)");

    const stored = await repository.getSession("user-1", sessionId);
    expect(stored.actionLog).toHaveLength(0);
  });

  it("rejects a filter illegal for the dataset as invalid_filter", async () => {
    const { caller } = setup();
    const sessionId = await createSession(caller);

    // `sender` is a real filter dimension, but only for phishing.
    await expect(
      caller.simulation.performAction({
        sessionId,
        ...QUERY,
        queryPayload: { datasetId: "auth", filters: { sender: "x@y.z" } },
      }),
    ).rejects.toThrow('Query rejected (invalid_filter)');
  });

  it("rejects an inverted time window as invalid_filter", async () => {
    const { caller } = setup();
    const sessionId = await createSession(caller);

    await expect(
      caller.simulation.performAction({
        sessionId,
        ...QUERY,
        queryPayload: {
          datasetId: "auth",
          filters: {
            windowStartSimMinutes: 500,
            windowEndSimMinutes: 100,
          },
        },
      }),
    ).rejects.toThrow("Query rejected (invalid_filter)");
  });

  it("rejects a negative time bound as invalid_payload", async () => {
    const { caller } = setup();
    const sessionId = await createSession(caller);

    await expect(
      caller.simulation.performAction({
        sessionId,
        ...QUERY,
        queryPayload: {
          datasetId: "auth",
          filters: { windowStartSimMinutes: -5 },
        },
      }),
    ).rejects.toThrow("Query rejected (invalid_payload)");
  });

  it("never leaks schema internals, template ids, or answer keys", async () => {
    const { caller } = setup();
    const sessionId = await createSession(caller);

    const probes = [
      { datasetId: "auth", filters: ["user"] },
      { datasetId: "hr", filters: {} },
      { datasetId: "auth", filters: { sender: "x" } },
    ];
    for (const queryPayload of probes) {
      const error = await caller.simulation
        .performAction({ sessionId, ...QUERY, queryPayload })
        .catch((cause: unknown) => cause as Error);
      const text = String(error);
      expect(text).toMatch("Query rejected");
      for (const leaked of [
        "ZodError",
        "invalid_type",
        "template",
        "suspicious_login",
        "requiredOptionIds",
        "coachOnFailure",
      ]) {
        expect(text).not.toMatch(leaked);
      }
    }
  });

  it("leaves ordinary non-query actions unaffected", async () => {
    const { caller } = setup();
    const sessionId = await createSession(caller);

    // Legacy legality errors keep their existing transport behavior.
    await expect(
      caller.simulation.performAction({
        sessionId,
        actionId: "read_handoff",
        eventId: "handoff-1",
      }),
    ).rejects.toThrow('Action "read_handoff" requires task');

    // And an ordinary allowed action still succeeds without a payload.
    const result = await caller.simulation.performAction({
      sessionId,
      actionId: "ask_manager",
      eventId: "handoff-1",
    });
    expect(result.sequence).toBe(1);
    expect(result.view.queryResults).toHaveLength(0);
  });
});
