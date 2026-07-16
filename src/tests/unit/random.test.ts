import { describe, expect, it } from "vitest";
import { createSeededRandom, shuffleWithSeed } from "../../core/engine/random";

describe("random", () => {
  it("produit la meme sequence pour un meme seed", () => {
    const first = createSeededRandom("trium-demo");
    const second = createSeededRandom("trium-demo");
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it("melange de facon deterministe", () => {
    expect(shuffleWithSeed([1, 2, 3, 4, 5], "abc")).toEqual(shuffleWithSeed([1, 2, 3, 4, 5], "abc"));
  });
});
