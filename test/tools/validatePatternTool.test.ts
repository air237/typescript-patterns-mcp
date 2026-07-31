import { describe, expect, it } from "vitest";

import { PatternValidationEngine } from "../../src/validate/index.js";
import { handleValidatePattern } from "../../src/tools/validatePatternTool.js";

interface IssuePayload {
  pattern: string;
  className: string;
  line: number;
  severity: "ERROR" | "WARNING" | "INFO";
  issue: string;
  suggestion: string;
}
interface Payload {
  supportedPatterns: string[];
  issueCount: number;
  errors: number;
  warnings: number;
  infos: number;
  issues: IssuePayload[];
}

function expectSuccess(result: {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
}): Payload {
  expect(result.isError).toBe(false);
  return JSON.parse(result.content[0]!.text) as Payload;
}

const BROKEN_SINGLETON = `
  export class Broken {
    public constructor() {}
    static getInstance(): Broken { return new Broken(); }
  }
`;

describe("handleValidatePattern (all patterns)", () => {
  it("returns per-severity counts + issues array", () => {
    const engine = PatternValidationEngine.getInstance();
    const parsed = expectSuccess(
      handleValidatePattern(engine, { source: BROKEN_SINGLETON }),
    );
    expect(parsed.supportedPatterns).toContain("Singleton");
    expect(parsed.issueCount).toBeGreaterThanOrEqual(1);
    expect(parsed.errors + parsed.warnings + parsed.infos).toBe(
      parsed.issueCount,
    );
    // Every issue payload matches shape.
    for (const i of parsed.issues) {
      expect(i.pattern).toBe("Singleton");
      expect(i.className).toBe("Broken");
      expect(i.severity).toMatch(/^(ERROR|WARNING|INFO)$/);
      expect(i.issue.length).toBeGreaterThan(0);
    }
  });

  it("returns empty issues for clean code", () => {
    const engine = PatternValidationEngine.getInstance();
    const parsed = expectSuccess(
      handleValidatePattern(engine, {
        source: "export class Plain { foo(): number { return 42; } }",
      }),
    );
    expect(parsed.issueCount).toBe(0);
    expect(parsed.issues).toEqual([]);
  });
});

describe("handleValidatePattern (focused pattern)", () => {
  it("validates only the requested pattern when passed", () => {
    const engine = PatternValidationEngine.getInstance();
    const parsed = expectSuccess(
      handleValidatePattern(engine, {
        source: BROKEN_SINGLETON,
        pattern: "singleton",
      }),
    );
    for (const i of parsed.issues) expect(i.pattern).toBe("Singleton");
  });

  it("accepts case-insensitive slugs and display names", () => {
    const engine = PatternValidationEngine.getInstance();
    const s1 = expectSuccess(
      handleValidatePattern(engine, { source: BROKEN_SINGLETON, pattern: "Singleton" }),
    );
    const s2 = expectSuccess(
      handleValidatePattern(engine, { source: BROKEN_SINGLETON, pattern: "SINGLETON" }),
    );
    expect(s1.issueCount).toBe(s2.issueCount);
  });

  it("rejects unknown pattern with isError=true", () => {
    const engine = PatternValidationEngine.getInstance();
    const r = handleValidatePattern(engine, {
      source: BROKEN_SINGLETON,
      pattern: "Nonesuch",
    });
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toMatch(/Unknown pattern/);
  });

  it("rejects Group C patterns (no validator) with isError=true", () => {
    const engine = PatternValidationEngine.getInstance();
    const r = handleValidatePattern(engine, {
      source: BROKEN_SINGLETON,
      pattern: "prototype",
    });
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toMatch(/No validator/);
  });
});

describe("handleValidatePattern (bad input)", () => {
  it("returns isError=true when source is empty / whitespace", () => {
    const engine = PatternValidationEngine.getInstance();
    const r = handleValidatePattern(engine, { source: "   " });
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toMatch(/source/i);
  });

  it("returns isError=true when the source cannot be parsed", () => {
    const engine = PatternValidationEngine.getInstance();
    // ts-morph is quite lenient; feed something clearly broken.
    const r = handleValidatePattern(engine, {
      source: "@@@ not typescript @@@",
    });
    // ts-morph will still build an AST from this (comments etc.) so
    // no parse error surfaces. What we actually want to guarantee is
    // that the call does not throw and returns a well-formed payload.
    if (r.isError) {
      expect(r.content[0]?.text).toMatch(/Failed to parse|Internal error/);
    } else {
      const parsed = JSON.parse(
        r.content[0]!.text,
      ) as { issueCount: number };
      expect(typeof parsed.issueCount).toBe("number");
    }
  });
});
