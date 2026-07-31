import { describe, expect, it } from "vitest";

import { PATTERNS } from "../../src/catalog/index.js";
import { PatternGenerator } from "../../src/generate/index.js";
import {
  handleGeneratePattern,
  isPascalCase,
} from "../../src/tools/generatePatternTool.js";

interface Payload {
  pattern: string;
  category: string;
  fileCount: number;
  files: Array<{ fileName: string; source: string }>;
}

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

describe("isPascalCase", () => {
  it("accepts strict PascalCase names", () => {
    expect(isPascalCase("Logger")).toBe(true);
    expect(isPascalCase("HttpClient")).toBe(true);
    expect(isPascalCase("A")).toBe(true);
    expect(isPascalCase("Widget3D")).toBe(true);
  });

  it("rejects lower-case start", () => {
    expect(isPascalCase("logger")).toBe(false);
    expect(isPascalCase("httpClient")).toBe(false);
  });

  it("rejects leading digit", () => {
    expect(isPascalCase("3D")).toBe(false);
    expect(isPascalCase("1Logger")).toBe(false);
  });

  it("rejects illegal punctuation", () => {
    expect(isPascalCase("_Logger")).toBe(false);
    expect(isPascalCase("$Logger")).toBe(false);
    expect(isPascalCase("Log-ger")).toBe(false);
    expect(isPascalCase("Log ger")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isPascalCase("")).toBe(false);
  });
});

describe("handleGeneratePattern", () => {
  it("generates Singleton with typeName='Logger' and returns full payload", () => {
    const g = PatternGenerator.getInstance();
    const parsed = expectSuccess(
      handleGeneratePattern(g, { pattern: "singleton", typeName: "Logger" }),
    );
    expect(parsed.pattern).toBe("Singleton");
    expect(parsed.category).toBe("Creational");
    expect(parsed.fileCount).toBe(1);
    expect(parsed.files[0]!.fileName).toBe("Logger.ts");
    expect(parsed.files[0]!.source).toMatch(/export class Logger /);
    expect(parsed.files[0]!.source).toMatch(/private constructor/);
  });

  it("generates every one of the 23 patterns without error", () => {
    const g = PatternGenerator.getInstance();
    for (const p of PATTERNS) {
      const parsed = expectSuccess(
        handleGeneratePattern(g, { pattern: p, typeName: "Widget" }),
      );
      expect(
        parsed.fileCount,
        `expected files for pattern ${p}`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("resolves pattern names case-insensitively and by slug", () => {
    const g = PatternGenerator.getInstance();
    expect(
      expectSuccess(handleGeneratePattern(g, { pattern: "SINGLETON", typeName: "X" }))
        .pattern,
    ).toBe("Singleton");
    expect(
      expectSuccess(
        handleGeneratePattern(g, {
          pattern: "chain-of-responsibility",
          typeName: "X",
        }),
      ).pattern,
    ).toBe("Chain of Responsibility");
    expect(
      expectSuccess(
        handleGeneratePattern(g, {
          pattern: "Chain of Responsibility",
          typeName: "X",
        }),
      ).pattern,
    ).toBe("Chain of Responsibility");
  });

  it("errors on unknown pattern with a helpful message", () => {
    const g = PatternGenerator.getInstance();
    const result = handleGeneratePattern(g, {
      pattern: "Nonexistent",
      typeName: "Widget",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/Unknown pattern/);
    expect(result.content[0]?.text).toMatch(/list_patterns/);
  });

  it("errors on empty pattern argument", () => {
    const g = PatternGenerator.getInstance();
    const result = handleGeneratePattern(g, { pattern: "   ", typeName: "Widget" });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/pattern/);
  });

  it("errors on empty typeName argument", () => {
    const g = PatternGenerator.getInstance();
    const result = handleGeneratePattern(g, { pattern: "singleton", typeName: "" });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/typeName/);
  });

  it("errors on non-PascalCase typeName", () => {
    const g = PatternGenerator.getInstance();
    const badNames = ["logger", "_Logger", "1Logger", "Log-ger", "Log ger"];
    for (const bad of badNames) {
      const result = handleGeneratePattern(g, {
        pattern: "singleton",
        typeName: bad,
      });
      expect(result.isError, `should reject '${bad}'`).toBe(true);
      expect(result.content[0]?.text).toMatch(/PascalCase/);
    }
  });

  it("Builder generates a fully-parameterised class", () => {
    const g = PatternGenerator.getInstance();
    const parsed = expectSuccess(
      handleGeneratePattern(g, { pattern: "builder", typeName: "Pizza" }),
    );
    expect(parsed.fileCount).toBe(1);
    expect(parsed.files[0]!.fileName).toBe("Pizza.ts");
    expect(parsed.files[0]!.source).toMatch(/class Pizza /);
    expect(parsed.files[0]!.source).toMatch(/class PizzaBuilder /);
    // The escaped `\${this.#quantity}` in the template must resolve to a
    // real template-literal placeholder in the generated source.
    expect(parsed.files[0]!.source).toContain("${this.#quantity}");
  });
});
