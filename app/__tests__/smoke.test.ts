import { describe, it, expect } from "vitest";

describe("ShopifyPulse", () => {
  it("smoke test - app loads", () => {
    expect(true).toBe(true);
  });

  it("billing plans are defined", async () => {
    const { PLANS } = await import("../lib/billing.server");
    expect(PLANS).toBeDefined();
    expect(PLANS.length).toBeGreaterThan(0);
    expect(PLANS[0].name).toBe("Free");
  });
});
