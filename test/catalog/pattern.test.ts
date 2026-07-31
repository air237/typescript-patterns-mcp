import { describe, expect, it } from "vitest";

import {
  PATTERNS,
  patternFromKey,
  patternInfo,
  referenceUrl,
  type Pattern,
} from "../../src/catalog/index.js";

describe("Pattern (catalogue enum)", () => {
  it("declares exactly the 23 Gang of Four patterns", () => {
    expect(PATTERNS).toHaveLength(23);
  });

  it("has 5 creational + 7 structural + 11 behavioral patterns", () => {
    const byCategory = new Map<string, number>();
    for (const p of PATTERNS) {
      const cat = patternInfo(p).category;
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
    }
    expect(byCategory.get("CREATIONAL")).toBe(5);
    expect(byCategory.get("STRUCTURAL")).toBe(7);
    expect(byCategory.get("BEHAVIORAL")).toBe(11);
  });

  it("has unique display names and slugs across every pattern", () => {
    const displayNames = new Set<string>();
    const slugs = new Set<string>();
    for (const p of PATTERNS) {
      const info = patternInfo(p);
      expect(displayNames.has(info.displayName)).toBe(false);
      expect(slugs.has(info.slug)).toBe(false);
      displayNames.add(info.displayName);
      slugs.add(info.slug);
    }
    expect(displayNames.size).toBe(23);
    expect(slugs.size).toBe(23);
  });

  it("produces well-formed refactoring.guru URLs", () => {
    for (const p of PATTERNS) {
      const url = referenceUrl(p);
      expect(url).toMatch(
        /^https:\/\/refactoring\.guru\/design-patterns\/[a-z-]+$/,
      );
    }
  });

  describe("patternFromKey", () => {
    it("resolves the enum key regardless of case", () => {
      expect(patternFromKey("SINGLETON")).toBe<Pattern>("SINGLETON");
      expect(patternFromKey("singleton")).toBe<Pattern>("SINGLETON");
      expect(patternFromKey("sInGlEtOn")).toBe<Pattern>("SINGLETON");
    });

    it("resolves the slug (dashes) and swaps dashes/underscores/spaces", () => {
      expect(patternFromKey("chain-of-responsibility")).toBe<Pattern>(
        "CHAIN_OF_RESPONSIBILITY",
      );
      expect(patternFromKey("chain_of_responsibility")).toBe<Pattern>(
        "CHAIN_OF_RESPONSIBILITY",
      );
    });

    it("resolves the display name", () => {
      expect(patternFromKey("Chain of Responsibility")).toBe<Pattern>(
        "CHAIN_OF_RESPONSIBILITY",
      );
      expect(patternFromKey("Factory Method")).toBe<Pattern>("FACTORY_METHOD");
    });

    it("throws for blank input", () => {
      expect(() => patternFromKey("")).toThrow(/non-blank/);
      expect(() => patternFromKey("   ")).toThrow(/non-blank/);
      expect(() => patternFromKey(null)).toThrow(/non-blank/);
      expect(() => patternFromKey(undefined)).toThrow(/non-blank/);
    });

    it("throws for unknown patterns", () => {
      expect(() => patternFromKey("Unknown-Pattern")).toThrow(
        /Unknown design pattern/,
      );
    });
  });
});
