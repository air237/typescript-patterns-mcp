import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Sibling of the Java `PatternExamplesCompileTest`: spawns the TypeScript
 * compiler over `resources/examples/tsconfig.examples.json` and asserts
 * every bundled example type-checks under `--strict --noEmit`.
 *
 * If ANY example is broken, this test dumps the whole tsc output so the
 * failing pattern is obvious. On CI the same command runs as part of the
 * regular `npm test`, so no separate workflow step is needed.
 */
describe("bundled examples compile under tsc --strict", () => {
  it("resources/examples/*.ts type-check with the examples tsconfig", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const repoRoot = resolve(here, "..", "..");
    const examplesTsconfig = resolve(
      repoRoot,
      "resources",
      "examples",
      "tsconfig.examples.json",
    );

    expect(existsSync(examplesTsconfig)).toBe(true);

    // Resolve `tsc` binary directly out of `node_modules` so the test does
    // not depend on PATH or on npm being available.
    const tscBin = resolve(
      repoRoot,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "tsc.cmd" : "tsc",
    );
    expect(existsSync(tscBin)).toBe(true);

    const result = spawnSync(tscBin, ["-p", examplesTsconfig], {
      cwd: repoRoot,
      encoding: "utf8",
      // `tsc --noEmit` on the whole example set is quick, but stay
      // generous so slow CI runners do not flake.
      timeout: 60_000,
    });

    // Assemble the failure message before asserting so we always see it.
    const combined =
      (result.stdout ?? "") + (result.stderr === "" ? "" : `\n[stderr]\n${result.stderr}`);

    expect(
      result.status,
      `tsc exited with status ${result.status}\n${combined}`,
    ).toBe(0);
    // TypeScript's compiler emits its diagnostics on stdout, not stderr, so
    // `stderr === ""` is the real signal that nothing catastrophic happened.
    expect(result.stderr).toBe("");
    // And there must be zero diagnostics — anything printed on stdout by a
    // successful (`status === 0`) tsc run is worth failing on: version
    // mismatches, deprecation notices we care about, etc.
    expect(result.stdout.trim()).toBe("");
  }, 60_000);
});
