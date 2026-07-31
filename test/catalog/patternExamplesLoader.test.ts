import { describe, expect, it, beforeEach } from "vitest";

import {
  PATTERNS,
  _resetPatternExamplesLoaderForTests,
  getPatternExamplesLoader,
} from "../../src/catalog/index.js";

describe("PatternExamplesLoader", () => {
  beforeEach(() => {
    _resetPatternExamplesLoaderForTests();
  });

  it("loads at least one example for every one of the 23 patterns", () => {
    const loader = getPatternExamplesLoader();
    for (const p of PATTERNS) {
      const examples = loader.forPattern(p);
      expect(
        examples.length,
        `expected at least one example wired up for pattern ${p}`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("covers all 23 patterns via coveredPatterns()", () => {
    const loader = getPatternExamplesLoader();
    expect(loader.coveredPatterns()).toHaveLength(23);
    // Same order as the PATTERNS declaration
    expect(loader.coveredPatterns()).toEqual(PATTERNS);
  });

  it("totalExamples() matches the sum of per-pattern file counts", () => {
    const loader = getPatternExamplesLoader();
    const sum = PATTERNS.reduce(
      (n, p) => n + loader.forPattern(p).length,
      0,
    );
    expect(loader.totalExamples()).toBe(sum);
  });

  it("every loaded example has a non-empty filename, note, and source", () => {
    const loader = getPatternExamplesLoader();
    for (const p of PATTERNS) {
      for (const ex of loader.forPattern(p)) {
        expect(ex.pattern).toBe(p);
        expect(ex.fileName.length).toBeGreaterThan(0);
        expect(ex.fileName.endsWith(".ts")).toBe(true);
        expect(ex.note.length).toBeGreaterThan(0);
        expect(ex.source.length).toBeGreaterThan(0);
      }
    }
  });

  it("Singleton example uses the class-based idiom with private constructor and getInstance()", () => {
    const loader = getPatternExamplesLoader();
    const files = loader.forPattern("SINGLETON");
    expect(files).toHaveLength(1);
    const singleton = files[0]!;
    expect(singleton.fileName).toBe("Singleton.ts");
    expect(singleton.source).toMatch(/private constructor/);
    expect(singleton.source).toMatch(/getInstance\s*\(/);
  });

  it("Observer example iterates over a snapshot, not the live collection", () => {
    const loader = getPatternExamplesLoader();
    const eventBus = loader
      .forPattern("OBSERVER")
      .find((f) => f.fileName === "EventBus.ts");
    expect(eventBus).toBeDefined();
    // `for (const o of [...this.#observers])` — the [...] snapshot is the point
    expect(eventBus!.source).toMatch(/\[\.\.\.\s*this\.#observers\s*\]/);
  });

  it("caches the loaded instance across calls until reset", () => {
    const first = getPatternExamplesLoader();
    const second = getPatternExamplesLoader();
    expect(first).toBe(second);
    _resetPatternExamplesLoaderForTests();
    const third = getPatternExamplesLoader();
    expect(third).not.toBe(first);
  });
});
