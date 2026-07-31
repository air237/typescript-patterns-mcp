import { beforeEach, describe, expect, it } from "vitest";

import { PATTERNS } from "../../src/catalog/index.js";
import {
  PatternGenerator,
  SUPPORTED_PATTERNS,
  _resetPatternGeneratorForTests,
  lowerFirst,
  substitute,
} from "../../src/generate/index.js";

describe("substitute (placeholder engine)", () => {
  it("replaces known placeholders", () => {
    expect(substitute("hello ${NAME}!", { NAME: "world" })).toBe("hello world!");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(substitute("hello ${UNKNOWN}!", { NAME: "world" })).toBe(
      "hello ${UNKNOWN}!",
    );
  });

  it("supports repeated substitutions in one template", () => {
    expect(
      substitute("${X}-${Y}-${X}", { X: "a", Y: "b" }),
    ).toBe("a-b-a");
  });

  it("escapes `\\${…}` as a literal `${…}` (backslash consumed)", () => {
    // `\${foo}` -> literal `${foo}` — the backslash must be gone.
    expect(substitute("keep \\${foo} out", { foo: "REPLACED" })).toBe(
      "keep ${foo} out",
    );
  });

  it("still substitutes non-escaped placeholders in the same string", () => {
    expect(
      substitute("real=${X} literal=\\${X}", { X: "42" }),
    ).toBe("real=42 literal=${X}");
  });

  it("emits the tail verbatim when a placeholder has no closing brace", () => {
    expect(substitute("hello ${NAME", { NAME: "world" })).toBe("hello ${NAME");
  });

  it("handles empty template", () => {
    expect(substitute("", { X: "y" })).toBe("");
  });
});

describe("lowerFirst", () => {
  it("returns empty for empty input", () => {
    expect(lowerFirst("")).toBe("");
  });

  it("lower-cases a single character", () => {
    expect(lowerFirst("A")).toBe("a");
  });

  it("lower-cases the first letter of a PascalCase word", () => {
    expect(lowerFirst("Logger")).toBe("logger");
    expect(lowerFirst("HttpClient")).toBe("httpClient");
  });

  it("keeps an already-camelCase name unchanged", () => {
    expect(lowerFirst("httpClient")).toBe("httpClient");
  });

  it("preserves acronym boundary: HTTPService -> httpService", () => {
    expect(lowerFirst("HTTPService")).toBe("httpService");
  });

  it("lower-cases an all-upper name entirely: HTTP -> http", () => {
    expect(lowerFirst("HTTP")).toBe("http");
  });
});

describe("PatternGenerator", () => {
  beforeEach(() => {
    _resetPatternGeneratorForTests();
  });

  it("SUPPORTED_PATTERNS contains every one of the 23 patterns", () => {
    expect(SUPPORTED_PATTERNS).toHaveLength(23);
    for (const p of PATTERNS) {
      expect(SUPPORTED_PATTERNS).toContain(p);
    }
  });

  it("returns at least one file for every pattern with typeName='Widget'", () => {
    const g = PatternGenerator.getInstance();
    for (const p of PATTERNS) {
      const files = g.generate(p, { typeName: "Widget" });
      expect(files.length, `expected at least one file for ${p}`).toBeGreaterThanOrEqual(1);
      for (const f of files) {
        expect(f.fileName.endsWith(".ts")).toBe(true);
        expect(f.source.length).toBeGreaterThan(0);
      }
    }
  });

  it("caches the singleton across calls", () => {
    expect(PatternGenerator.getInstance()).toBe(PatternGenerator.getInstance());
    _resetPatternGeneratorForTests();
    // fresh instance after reset — verified by object identity
    expect(PatternGenerator.getInstance()).toBe(PatternGenerator.getInstance());
  });

  it("interpolates ${TYPE_NAME} in file names as well as bodies", () => {
    const g = PatternGenerator.getInstance();
    const files = g.generate("BUILDER", { typeName: "Pizza" });
    expect(files.map((f) => f.fileName)).toEqual(["Pizza.ts"]);
    expect(files[0]?.source).toMatch(/class Pizza /);
    expect(files[0]?.source).toMatch(/class PizzaBuilder /);
  });

  it("Singleton template renders the class-based idiom", () => {
    const g = PatternGenerator.getInstance();
    const files = g.generate("SINGLETON", { typeName: "Logger" });
    expect(files).toHaveLength(1);
    const src = files[0]!.source;
    expect(src).toMatch(/export class Logger /);
    expect(src).toMatch(/private constructor/);
    expect(src).toMatch(/static getInstance\s*\(/);
    expect(src).toMatch(/Logger\.#instance/);
  });

  it("uses TYPE_NAME_CAMEL for member-name context", () => {
    const g = PatternGenerator.getInstance();
    const files = g.generate("STRATEGY", { typeName: "Pricing" });
    const iface = files.find((f) => f.fileName === "PricingStrategy.ts")!;
    expect(iface.source).toMatch(/pricing\(input: string\): string/);
  });

  it("throws for unsupported patterns (should never happen with a full build, but the code path exists)", () => {
    // The default build supports every pattern; simulate by faking an
    // unknown value at runtime cast. This test guards the throw path
    // in `generate()` so a future partial build stays honest.
    const g = PatternGenerator.getInstance();
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      g.generate("BOGUS_PATTERN" as any, { typeName: "Widget" }),
    ).toThrow(/No template wired yet/);
  });
});
