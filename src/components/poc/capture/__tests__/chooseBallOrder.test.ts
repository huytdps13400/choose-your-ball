import { describe, expect, test } from "bun:test";

import { chooseBallOrder } from "../chooseBallOrder";

describe("standalone Choose Ball order", () => {
  test("keeps the six showcase balls first and includes the entire catalog once", () => {
    const order = chooseBallOrder();

    expect(order.slice(0, 6)).toEqual(["poke", "great", "ultra", "dusk", "master", "cherish"]);
    expect(order).toHaveLength(26);
    expect(new Set(order).size).toBe(26);
  });
});
