import { describe, expect, it } from "vitest";

import {
  getPatternRegistry,
  _resetPatternRegistryForTests,
} from "../../src/catalog/index.js";
import { handleListPatterns } from "../../src/tools/listPatternsTool.js";

interface Payload {
  count: number;
  patterns: Array<{
    name: string;
    category: string;
    slug: string;
    aliases: readonly string[];
    intent: string;
    referenceUrl: string;
  }>;
}

/**
 * Fold a `handleListPatterns` result into a typed payload, asserting that
 * the call succeeded and returned a JSON text content block. Any failure
 * here fails the enclosing test through `expect(...)`.
 */
function expectSuccess(result: {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
}): Payload {
  expect(result.isError).toBe(false);
  const first = result.content[0];
  expect(first).toBeDefined();
  expect(first?.type).toBe("text");
  return JSON.parse(first!.text) as Payload;
}

describe("handleListPatterns", () => {
  it("returns all 23 patterns when no filter is given", () => {
    _resetPatternRegistryForTests();
    const reg = getPatternRegistry();
    const parsed = expectSuccess(handleListPatterns(reg, {}));
    expect(parsed.count).toBe(23);
    expect(parsed.patterns).toHaveLength(23);
    expect(parsed.patterns[0]?.name).toBe("Abstract Factory");
  });

  it("filters to Creational (5) when category=Creational", () => {
    const reg = getPatternRegistry();
    const parsed = expectSuccess(
      handleListPatterns(reg, { category: "Creational" }),
    );
    expect(parsed.count).toBe(5);
    for (const p of parsed.patterns) {
      expect(p.category).toBe("Creational");
    }
  });

  it("is case-insensitive on the category argument", () => {
    const reg = getPatternRegistry();
    const upper = expectSuccess(
      handleListPatterns(reg, { category: "STRUCTURAL" }),
    );
    const mixed = expectSuccess(
      handleListPatterns(reg, { category: "Structural" }),
    );
    const lower = expectSuccess(
      handleListPatterns(reg, { category: "structural" }),
    );
    expect(upper.count).toBe(7);
    expect(mixed.count).toBe(7);
    expect(lower.count).toBe(7);
  });

  it("filters to Behavioral (11) when category=Behavioral", () => {
    const reg = getPatternRegistry();
    const parsed = expectSuccess(
      handleListPatterns(reg, { category: "Behavioral" }),
    );
    expect(parsed.count).toBe(11);
  });

  it("returns each pattern with intent, aliases, slug, referenceUrl", () => {
    const reg = getPatternRegistry();
    const parsed = expectSuccess(
      handleListPatterns(reg, { category: "Creational" }),
    );
    const singleton = parsed.patterns.find((p) => p.name === "Singleton");
    expect(singleton).toBeDefined();
    expect(singleton!.slug).toBe("singleton");
    expect(singleton!.referenceUrl).toBe(
      "https://refactoring.guru/design-patterns/singleton",
    );
    expect(singleton!.intent).toMatch(/only one instance/i);
    expect(singleton!.aliases).toContain("Holder");
  });

  it("returns an isError=true result for an unknown category", () => {
    const reg = getPatternRegistry();
    const result = handleListPatterns(reg, { category: "Concurrency" });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/Unknown category/);
  });
});
