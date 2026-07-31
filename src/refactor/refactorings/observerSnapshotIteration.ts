/**
 * Wrap the iterated collection inside a publish-like method with the
 * TypeScript spread idiom (`[...listeners]`) so a listener that
 * subscribes/unsubscribes during dispatch cannot corrupt the iteration.
 *
 * TypeScript sibling of `com.javapatterns.mcp.refactor.ObserverSnapshotIteration`.
 *
 * Only touches `for (const x of Y) …` statements whose `Y` is a simple
 * expression (`this.field`, `foo`, `this.#foo`, etc.). Complex iterables
 * are left alone to avoid semantic drift.
 *
 * Idempotency: iterables that already look like a snapshot (start with
 * `[...`, contain `.slice(`, or start with `Array.from(`) are skipped.
 */

import {
  SyntaxKind,
  type ForOfStatement,
  type SourceFile,
} from "ts-morph";

import { type PatternRefactoring } from "../patternRefactoring.js";
import { type RefactoringResult } from "../refactoringResult.js";
import { startLine } from "./refactoringHelpers.js";

const PUBLISH_PREFIXES = ["publish", "notify", "fire", "dispatch", "emit"];

export class ObserverSnapshotIteration implements PatternRefactoring {
  readonly id = "OBSERVER_SNAPSHOT_ITERATION" as const;

  apply(sourceFile: SourceFile): RefactoringResult {
    const changes: string[] = [];

    for (const cls of sourceFile.getClasses()) {
      const className = cls.getName();
      if (className === undefined) continue;

      for (const method of cls.getMethods()) {
        const mname = method.getName().toLowerCase();
        if (!PUBLISH_PREFIXES.some((p) => mname.startsWith(p))) continue;

        method.forEachDescendant((node) => {
          if (node.getKind() !== SyntaxKind.ForOfStatement) return;
          const stmt = node as ForOfStatement;
          const iterable = stmt.getExpression();
          const iterableText = iterable.getText();
          // Already a snapshot? skip.
          if (
            iterableText.startsWith("[...") ||
            iterableText.includes(".slice(") ||
            iterableText.startsWith("Array.from(")
          ) {
            return;
          }
          // Only rewrap simple expressions to keep the transformation
          // safe. `foo`, `this.foo`, `this.#foo`, `Foo.foo` all qualify.
          if (!/^[A-Za-z_$#][\w.#$]*$/.test(iterableText)) return;
          iterable.replaceWithText(`[...${iterableText}]`);
          changes.push(
            `${className}.${method.getName()}(): wrapped iterable \`${iterableText}\` with [...] at line ${startLine(stmt)}`,
          );
        });
      }
    }

    return {
      refactoringId: this.id,
      newSource: sourceFile.getFullText(),
      changed: changes.length > 0,
      changes,
    };
  }
}
