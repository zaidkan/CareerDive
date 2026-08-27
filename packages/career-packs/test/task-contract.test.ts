import { describe, expect, it } from "vitest";
import * as schemas from "@sim/schemas";

describe("public task contract", () => {
  it("exports safe client task and attempt schemas", () => {
    expect(schemas).toHaveProperty("PackTaskDefinitionSchema");
    expect(schemas).toHaveProperty("ClientTaskViewSchema");
    expect(schemas).toHaveProperty("TaskAttemptSchema");
  });
});
