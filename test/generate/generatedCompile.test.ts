import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { PATTERNS, patternInfo } from "../../src/catalog/index.js";
import { PatternGenerator } from "../../src/generate/index.js";

/**
 * The generator's counterpart to `examplesCompile.test.ts`. For EVERY
 * one of the 23 patterns, we:
 *   1. Generate the file set with `typeName = "Widget"` — a bland
 *      PascalCase name that will not accidentally satisfy or violate any
 *      template's other constraints.
 *   2. Write those files to a fresh temp directory alongside a strict
 *      tsconfig.
 *   3. Spawn `tsc -p <tmp>/tsconfig.json` and assert exit 0 with no
 *      diagnostics.
 *
 * If any template is broken, this test dumps the failing pattern's file
 * list, the tsc output, and the temp-dir path so the failure is
 * actionable.
 */
describe("generate_pattern templates compile under tsc --strict", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, "..", "..");
  const tscBin = resolve(
    repoRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tsc.cmd" : "tsc",
  );

  const TSCONFIG_JSON = JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        lib: ["ES2022"],
        resolveJsonModule: false,
        esModuleInterop: true,
        isolatedModules: true,
        verbatimModuleSyntax: true,
        forceConsistentCasingInFileNames: true,
        strict: true,
        noImplicitOverride: true,
        noUncheckedIndexedAccess: true,
        noFallthroughCasesInSwitch: true,
        noImplicitReturns: true,
        exactOptionalPropertyTypes: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
      },
      include: ["./**/*.ts"],
    },
    null,
    2,
  );

  it("generates and type-checks all 23 patterns with typeName='Widget'", () => {
    expect(existsSync(tscBin)).toBe(true);

    const generator = PatternGenerator.getInstance();
    const workRoot = mkdtempSync(resolve(tmpdir(), "ts-patterns-generate-"));

    try {
      // Lay every pattern's generated files into its own sub-directory
      // so cross-pattern name collisions cannot poison the compile.
      for (const p of PATTERNS) {
        const slug = patternInfo(p).slug;
        const patternDir = resolve(workRoot, slug);
        mkdirSync(patternDir, { recursive: true });
        const files = generator.generate(p, { typeName: "Widget" });
        expect(files.length).toBeGreaterThanOrEqual(1);
        for (const f of files) {
          writeFileSync(resolve(patternDir, f.fileName), f.source, "utf8");
        }
      }
      writeFileSync(resolve(workRoot, "tsconfig.json"), TSCONFIG_JSON, "utf8");
      // The generated files use ESM `import`/`export` syntax with
      // `verbatimModuleSyntax`; TypeScript needs a `package.json` in
      // the same tree that says `"type": "module"` to accept them.
      writeFileSync(
        resolve(workRoot, "package.json"),
        JSON.stringify({ name: "generated-compile-test", type: "module" }),
        "utf8",
      );

      const result = spawnSync(tscBin, ["-p", "tsconfig.json"], {
        cwd: workRoot,
        encoding: "utf8",
        timeout: 60_000,
      });
      const combined =
        (result.stdout ?? "") +
        (result.stderr === "" ? "" : `\n[stderr]\n${result.stderr}`);

      expect(
        result.status,
        `tsc exited ${result.status} on generated sources at ${workRoot}\n${combined}`,
      ).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout.trim()).toBe("");
    } finally {
      rmSync(workRoot, { recursive: true, force: true });
    }
  }, 60_000);
});
