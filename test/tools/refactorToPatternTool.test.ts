import { describe, expect, it } from "vitest";

import { PatternRefactoringEngine } from "../../src/refactor/index.js";
import { handleRefactorToPattern } from "../../src/tools/refactorToPatternTool.js";

interface Payload {
  refactoring: string;
  pattern: string;
  changed: boolean;
  changeCount: number;
  changes: string[];
  newSource: string;
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

describe("handleRefactorToPattern", () => {
  const engine = PatternRefactoringEngine.getInstance();

  it("rewrites a public-ctor Singleton and returns the changelog", () => {
    const parsed = expectSuccess(
      handleRefactorToPattern(engine, {
        source: BROKEN_SINGLETON,
        refactoring: "singleton-make-ctor-private",
      }),
    );
    expect(parsed.refactoring).toBe("singleton-make-ctor-private");
    expect(parsed.pattern).toBe("Singleton");
    expect(parsed.changed).toBe(true);
    expect(parsed.changeCount).toBe(1);
    expect(parsed.newSource).toMatch(/private constructor/);
    expect(parsed.newSource).not.toMatch(/public constructor/);
  });

  it("returns changed:false and identical source when nothing needs fixing", () => {
    const clean = `
      export class Logger {
        static #instance: Logger | undefined;
        private constructor() {}
        static getInstance(): Logger {
          Logger.#instance ??= new Logger();
          return Logger.#instance;
        }
      }
    `;
    const parsed = expectSuccess(
      handleRefactorToPattern(engine, {
        source: clean,
        refactoring: "singleton-make-ctor-private",
      }),
    );
    expect(parsed.changed).toBe(false);
    expect(parsed.changeCount).toBe(0);
    expect(parsed.changes).toEqual([]);
    expect(parsed.newSource).toBe(clean);
  });

  it("accepts case-insensitive slugs and enum keys", () => {
    const r1 = expectSuccess(
      handleRefactorToPattern(engine, {
        source: BROKEN_SINGLETON,
        refactoring: "SINGLETON_MAKE_CTOR_PRIVATE",
      }),
    );
    const r2 = expectSuccess(
      handleRefactorToPattern(engine, {
        source: BROKEN_SINGLETON,
        refactoring: "Singleton-Make-Ctor-Private",
      }),
    );
    expect(r1.newSource).toBe(r2.newSource);
  });

  it("returns isError=true for unknown refactoring id", () => {
    const r = handleRefactorToPattern(engine, {
      source: BROKEN_SINGLETON,
      refactoring: "singleton-nuke-everything",
    });
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toMatch(/Unknown refactoring/);
  });

  it("returns isError=true for empty source", () => {
    const r = handleRefactorToPattern(engine, {
      source: "   ",
      refactoring: "singleton-make-ctor-private",
    });
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toMatch(/source/i);
  });

  it("returns isError=true for empty refactoring id", () => {
    const r = handleRefactorToPattern(engine, {
      source: BROKEN_SINGLETON,
      refactoring: "   ",
    });
    expect(r.isError).toBe(true);
    expect(r.content[0]?.text).toMatch(/refactoring/i);
  });

  it("changes list carries class name + line number", () => {
    const parsed = expectSuccess(
      handleRefactorToPattern(engine, {
        source: BROKEN_SINGLETON,
        refactoring: "singleton-make-ctor-private",
      }),
    );
    expect(parsed.changes[0]).toMatch(/Broken/);
    expect(parsed.changes[0]).toMatch(/line \d+/);
  });
});
