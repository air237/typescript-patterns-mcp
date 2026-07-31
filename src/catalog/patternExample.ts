/**
 * A single, fully working TypeScript source file that demonstrates one design
 * pattern.
 *
 * TypeScript sibling of `com.javapatterns.mcp.catalog.PatternExample`, minus
 * the Java-specific `packageName` field — TypeScript modules do not have a
 * package declaration, so exposing that field here would be misleading.
 *
 * Examples are loaded eagerly from disk on first access. Each example is
 * verified to type-check under `tsc --strict --noEmit` by a dedicated Vitest
 * fixture that mirrors the Java `PatternExamplesCompileTest` — the fixture
 * sits examples in a temporary directory alongside a compatible tsconfig and
 * runs the TypeScript compiler over them.
 *
 * Fields:
 *   - `pattern`  — the pattern this file illustrates.
 *   - `fileName` — the source file name including extension, e.g. `"Singleton.ts"`.
 *   - `source`   — the full source code, ready to write to disk and compile.
 *   - `note`     — a one-line caption explaining what variant this is
 *                  (e.g. "Class-based Singleton with private constructor and
 *                   lazy static getInstance() — Object.freeze-guarded").
 */

import { type Pattern } from "./pattern.js";

export interface PatternExample {
  readonly pattern: Pattern;
  readonly fileName: string;
  readonly source: string;
  readonly note: string;
}
