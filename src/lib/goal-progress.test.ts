import { describe, expect, it } from "vitest";
import { getGoalProgressPercent } from "./xp";

describe("getGoalProgressPercent", () => {
  it("caps progress at 100% and returns a rounded percentage", () => {
    expect(getGoalProgressPercent(35, 60)).toBe(58);
    expect(getGoalProgressPercent(120, 60)).toBe(100);
  });
});
