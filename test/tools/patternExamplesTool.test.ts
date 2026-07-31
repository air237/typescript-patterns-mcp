import { describe, expect, it } from "vitest";

import {
  _resetPatternExamplesLoaderForTests,
  getPatternExamplesLoader,
  PATTERNS,
} from "../../src/catalog/index.js";
import { handlePatternExamples } from "../../src/tools/patternExamplesTool.js";

interface FilePayload {
  fileName: string;
  note: string;
  source?: string;
}
interface Payload {
  pattern: string;
  category: string;
  fileCount: number;
  files: FilePayload[];
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

describe("handlePatternExamples", () => {
  it("returns the Singleton example with full source by default", () => {
    _resetPatternExamplesLoaderForTests();
    const loader = getPatternExamplesLoader();
    const parsed = expectSuccess(
      handlePatternExamples(loader, { pattern: "singleton" }),
    );
    expect(parsed.pattern).toBe("Singleton");
    expect(parsed.category).toBe("Creational");
    expect(parsed.fileCount).toBe(1);
    expect(parsed.files).toHaveLength(1);
    expect(parsed.files[0]!.fileName).toBe("Singleton.ts");
    expect(parsed.files[0]!.source).toMatch(/private constructor/);
  });

  it("omits the source field when includeSource=false", () => {
    const loader = getPatternExamplesLoader();
    const parsed = expectSuccess(
      handlePatternExamples(loader, {
        pattern: "singleton",
        includeSource: false,
      }),
    );
    expect(parsed.files[0]!.fileName).toBe("Singleton.ts");
    expect(parsed.files[0]!.note.length).toBeGreaterThan(0);
    expect(parsed.files[0]!).not.toHaveProperty("source");
  });

  it("resolves pattern names case-insensitively and by slug", () => {
    const loader = getPatternExamplesLoader();
    expect(
      expectSuccess(handlePatternExamples(loader, { pattern: "Singleton" }))
        .pattern,
    ).toBe("Singleton");
    expect(
      expectSuccess(handlePatternExamples(loader, { pattern: "SINGLETON" }))
        .pattern,
    ).toBe("Singleton");
    expect(
      expectSuccess(
        handlePatternExamples(loader, {
          pattern: "chain-of-responsibility",
        }),
      ).pattern,
    ).toBe("Chain of Responsibility");
    expect(
      expectSuccess(
        handlePatternExamples(loader, {
          pattern: "Chain of Responsibility",
        }),
      ).pattern,
    ).toBe("Chain of Responsibility");
  });

  it("returns fileCount>=1 for every one of the 23 patterns", () => {
    const loader = getPatternExamplesLoader();
    for (const p of PATTERNS) {
      const parsed = expectSuccess(
        handlePatternExamples(loader, { pattern: p }),
      );
      expect(
        parsed.fileCount,
        `expected files for pattern ${p}`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("Factory Method returns all 6 files in the expected order", () => {
    const loader = getPatternExamplesLoader();
    const parsed = expectSuccess(
      handlePatternExamples(loader, { pattern: "factory-method" }),
    );
    expect(parsed.fileCount).toBe(6);
    expect(parsed.files.map((f) => f.fileName)).toEqual([
      "Button.ts",
      "HtmlButton.ts",
      "WindowsButton.ts",
      "Dialog.ts",
      "HtmlDialog.ts",
      "WindowsDialog.ts",
    ]);
  });

  it("errors on unknown pattern with a helpful message", () => {
    const loader = getPatternExamplesLoader();
    const result = handlePatternExamples(loader, {
      pattern: "Non-Existent-Pattern",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/Unknown pattern/);
    expect(result.content[0]?.text).toMatch(/list_patterns/);
  });

  it("errors on empty/whitespace pattern argument", () => {
    const loader = getPatternExamplesLoader();
    const result = handlePatternExamples(loader, { pattern: "   " });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/pattern/);
  });
});
