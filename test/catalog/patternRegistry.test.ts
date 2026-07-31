import { beforeEach, describe, expect, it } from "vitest";

import {
  PATTERNS,
  _resetPatternRegistryForTests,
  categoryFromKey,
  getPatternRegistry,
  patternInfo,
} from "../../src/catalog/index.js";

describe("PatternRegistry", () => {
  beforeEach(() => {
    _resetPatternRegistryForTests();
  });

  it("loads exactly 23 pattern metadata entries", () => {
    const registry = getPatternRegistry();
    expect(registry.size()).toBe(23);
    expect(registry.all()).toHaveLength(23);
  });

  it("has metadata for every declared Pattern key", () => {
    const registry = getPatternRegistry();
    for (const p of PATTERNS) {
      const md = registry.get(p);
      expect(md.pattern).toBe(p);
      expect(md.intent.length).toBeGreaterThan(10);
      expect(md.problem.length).toBeGreaterThan(10);
      // aliases can be empty (e.g. Builder), but never undefined
      expect(Array.isArray(md.aliases)).toBe(true);
    }
  });

  it("returns 5 Creational entries in declaration order", () => {
    const registry = getPatternRegistry();
    const creational = registry.byCategory("CREATIONAL");
    expect(creational).toHaveLength(5);
    expect(creational.map((md) => md.pattern)).toEqual([
      "ABSTRACT_FACTORY",
      "BUILDER",
      "FACTORY_METHOD",
      "PROTOTYPE",
      "SINGLETON",
    ]);
  });

  it("returns 7 Structural entries in declaration order", () => {
    const registry = getPatternRegistry();
    const structural = registry.byCategory("STRUCTURAL");
    expect(structural).toHaveLength(7);
    for (const md of structural) {
      expect(patternInfo(md.pattern).category).toBe("STRUCTURAL");
    }
  });

  it("returns 11 Behavioral entries", () => {
    const registry = getPatternRegistry();
    expect(registry.byCategory("BEHAVIORAL")).toHaveLength(11);
  });

  it("caches the loaded registry across calls", () => {
    const first = getPatternRegistry();
    const second = getPatternRegistry();
    expect(first).toBe(second);
  });

  it("re-parses the JSON after _resetPatternRegistryForTests()", () => {
    const first = getPatternRegistry();
    _resetPatternRegistryForTests();
    const second = getPatternRegistry();
    expect(first).not.toBe(second);
    expect(second.size()).toBe(23);
  });

  describe("categoryFromKey", () => {
    it("resolves display name, key and slug (case-insensitive)", () => {
      expect(categoryFromKey("Creational")).toBe("CREATIONAL");
      expect(categoryFromKey("creational")).toBe("CREATIONAL");
      expect(categoryFromKey("CREATIONAL")).toBe("CREATIONAL");
      expect(categoryFromKey("creational-patterns")).toBe("CREATIONAL");
      expect(categoryFromKey("Structural")).toBe("STRUCTURAL");
      expect(categoryFromKey("Behavioral")).toBe("BEHAVIORAL");
    });

    it("returns null for empty / whitespace / null / undefined", () => {
      expect(categoryFromKey("")).toBeNull();
      expect(categoryFromKey("   ")).toBeNull();
      expect(categoryFromKey(null)).toBeNull();
      expect(categoryFromKey(undefined)).toBeNull();
    });

    it("returns null for unknown category strings", () => {
      expect(categoryFromKey("Concurrency")).toBeNull();
      expect(categoryFromKey("nonsense")).toBeNull();
    });
  });
});
