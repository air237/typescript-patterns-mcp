import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { PatternDetectionEngine } from "../../src/detect/index.js";
import {
  handleDetectPattern,
  parseInput,
} from "../../src/tools/detectPatternTool.js";

interface DetectedFile {
  file: string;
  pattern: string;
  category: string;
  className: string;
  startLine: number;
  confidence: number;
  evidence: readonly string[];
}
interface Payload {
  supportedPatterns: string[];
  filesAnalyzed: number;
  detectionCount: number;
  detected: DetectedFile[];
  errors: Array<{ file: string; message: string }>;
}

function expectSuccess(result: {
  content: Array<{ type: "text"; text: string }>;
  isError: boolean;
}): Payload {
  expect(result.isError).toBe(false);
  return JSON.parse(result.content[0]!.text) as Payload;
}

const SINGLETON_SOURCE = `
  export class Logger {
    static #instance: Logger | undefined;
    private constructor() {}
    static getInstance(): Logger {
      Logger.#instance ??= new Logger();
      return Logger.#instance;
    }
  }
`;

describe("parseInput", () => {
  it("accepts 'source' as the only mode", () => {
    expect(parseInput({ source: "x" }).mode).toBe("source");
  });
  it("accepts 'paths' as the only mode", () => {
    expect(parseInput({ paths: ["x.ts"] }).mode).toBe("paths");
  });
  it("accepts 'directory' as the only mode", () => {
    expect(parseInput({ directory: "src" }).mode).toBe("directory");
  });
  it("rejects the empty input", () => {
    expect(() => parseInput({})).toThrow(/exactly one/);
  });
  it("rejects when two modes are provided", () => {
    expect(() =>
      parseInput({ source: "x", paths: ["y.ts"] }),
    ).toThrow(/not several/);
  });
  it("ignores empty paths[] array", () => {
    expect(() => parseInput({ paths: [] })).toThrow(/exactly one/);
  });
});

describe("handleDetectPattern (source mode)", () => {
  it("detects Singleton from inline source", () => {
    const engine = PatternDetectionEngine.getInstance();
    const parsed = expectSuccess(
      handleDetectPattern(engine, { source: SINGLETON_SOURCE }),
    );
    expect(parsed.filesAnalyzed).toBe(1);
    expect(parsed.errors).toEqual([]);
    expect(parsed.supportedPatterns).toContain("Singleton");
    const singleton = parsed.detected.find((d) => d.pattern === "Singleton");
    expect(singleton).toBeDefined();
    expect(singleton?.file).toBe("<source>");
    expect(singleton?.className).toBe("Logger");
    expect(singleton?.category).toBe("Creational");
    expect(singleton?.confidence).toBeGreaterThanOrEqual(0.75);
    // Confidence is rounded to 3 decimals.
    expect(singleton?.confidence.toString()).toMatch(/^\d(\.\d{1,3})?$/);
  });

  it("returns empty detections for non-pattern code without an error", () => {
    const engine = PatternDetectionEngine.getInstance();
    const parsed = expectSuccess(
      handleDetectPattern(engine, {
        source: "export class Plain { foo() { return 1; } }",
      }),
    );
    expect(parsed.filesAnalyzed).toBe(1);
    expect(parsed.detected).toEqual([]);
    expect(parsed.detectionCount).toBe(0);
  });
});

describe("handleDetectPattern (paths mode)", () => {
  it("reads .ts files from disk and analyses them", () => {
    const workRoot = mkdtempSync(resolve(tmpdir(), "detect-paths-"));
    try {
      const filePath = resolve(workRoot, "MySingleton.ts");
      writeFileSync(filePath, SINGLETON_SOURCE, "utf8");
      const engine = PatternDetectionEngine.getInstance();
      const parsed = expectSuccess(
        handleDetectPattern(engine, { paths: [filePath] }),
      );
      expect(parsed.filesAnalyzed).toBe(1);
      expect(parsed.errors).toEqual([]);
      expect(parsed.detected[0]?.file).toBe(filePath);
    } finally {
      rmSync(workRoot, { recursive: true, force: true });
    }
  });

  it("records an error for a missing path without aborting the batch", () => {
    const workRoot = mkdtempSync(resolve(tmpdir(), "detect-paths-missing-"));
    try {
      const good = resolve(workRoot, "Good.ts");
      writeFileSync(good, SINGLETON_SOURCE, "utf8");
      const missing = resolve(workRoot, "Ghost.ts");
      const engine = PatternDetectionEngine.getInstance();
      const parsed = expectSuccess(
        handleDetectPattern(engine, { paths: [good, missing] }),
      );
      expect(parsed.filesAnalyzed).toBe(1);
      expect(parsed.errors.length).toBe(1);
      expect(parsed.errors[0]?.file).toBe(missing);
    } finally {
      rmSync(workRoot, { recursive: true, force: true });
    }
  });
});

describe("handleDetectPattern (directory mode)", () => {
  it("walks a directory recursively for *.ts files", () => {
    const workRoot = mkdtempSync(resolve(tmpdir(), "detect-dir-"));
    try {
      writeFileSync(resolve(workRoot, "MySingleton.ts"), SINGLETON_SOURCE, "utf8");
      writeFileSync(resolve(workRoot, "notes.txt"), "not typescript", "utf8");
      const engine = PatternDetectionEngine.getInstance();
      const parsed = expectSuccess(
        handleDetectPattern(engine, { directory: workRoot }),
      );
      expect(parsed.filesAnalyzed).toBe(1);
      expect(parsed.errors).toEqual([]);
      expect(parsed.detected[0]?.file).toBe("MySingleton.ts");
    } finally {
      rmSync(workRoot, { recursive: true, force: true });
    }
  });

  it("reports 'not a directory' for a bogus path", () => {
    const engine = PatternDetectionEngine.getInstance();
    const parsed = expectSuccess(
      handleDetectPattern(engine, { directory: "/no/such/path/exists/here" }),
    );
    expect(parsed.filesAnalyzed).toBe(0);
    expect(parsed.errors.length).toBe(1);
    expect(parsed.errors[0]?.message).toMatch(/not a directory/);
  });
});

describe("handleDetectPattern (bad input)", () => {
  it("returns isError=true when no input mode is provided", () => {
    const engine = PatternDetectionEngine.getInstance();
    const result = handleDetectPattern(engine, {});
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/exactly one/);
  });

  it("returns isError=true when two modes are provided", () => {
    const engine = PatternDetectionEngine.getInstance();
    const result = handleDetectPattern(engine, {
      source: "x",
      directory: "src",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/not several/);
  });
});
