import { describe, expect, it } from "vitest";
import { LaunchEventSchema, SupportReportSchema } from "./launch.js";
import { SupabasePublicKeySchema } from "./public-key.js";
import { randomUUID } from "node:crypto";
describe("public credentials and bounded first-party records", () => {
  it("accepts public keys and rejects service-role/secret credentials", () => {
    const jwt = (role: string) =>
      `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
    expect(
      SupabasePublicKeySchema.safeParse("sb_publishable_offline").success,
    ).toBe(true);
    expect(SupabasePublicKeySchema.safeParse(jwt("anon")).success).toBe(true);
    expect(SupabasePublicKeySchema.safeParse(jwt("service_role")).success).toBe(
      false,
    );
    expect(SupabasePublicKeySchema.safeParse("sb_secret_offline").success).toBe(
      false,
    );
  });
  it("rejects sensitive extras and arbitrary diagnostic URLs/text", () => {
    const event = { eventId: randomUUID(), name: "landing" };
    expect(LaunchEventSchema.safeParse(event).success).toBe(true);
    expect(
      LaunchEventSchema.safeParse({ ...event, sessionId: randomUUID() })
        .success,
    ).toBe(false);
    const report = {
      createRequestId: randomUUID(),
      category: "Other",
      description: "Help",
    };
    expect(SupportReportSchema.safeParse(report).success).toBe(true);
    expect(
      SupportReportSchema.safeParse({
        ...report,
        technicalDetails: {
          route: "/start?token=private",
          userAgent: "private",
        },
      }).success,
    ).toBe(false);
  });
});
