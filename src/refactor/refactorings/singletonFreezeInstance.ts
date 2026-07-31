/**
 * Add `Object.freeze(this);` at the end of a Singleton-shaped class'
 * (private) constructor body.
 *
 * TS analogue of the Java `singleton-add-read-resolve` recipe: on the
 * JVM the concern is deserialisation creating a second instance; in TS
 * the concern is accidental mutation of the shared instance from within
 * the class or its subclasses. `Object.freeze(this)` hardens the shape.
 *
 * Gate: the class has BOTH a private constructor AND a static
 * `getInstance()` method. Otherwise this is not a Singleton candidate.
 *
 * Idempotency: if the constructor body already contains
 * `Object.freeze(this)`, the refactoring skips.
 */

import { SyntaxKind, type SourceFile } from "ts-morph";

import { type PatternRefactoring } from "../patternRefactoring.js";
import { type RefactoringResult } from "../refactoringResult.js";
import { startLine } from "./refactoringHelpers.js";

const FREEZE_LINE = "    Object.freeze(this);";
const FREEZE_RE = /Object\.freeze\s*\(\s*this\s*\)/;

export class SingletonFreezeInstance implements PatternRefactoring {
  readonly id = "SINGLETON_FREEZE_INSTANCE" as const;

  apply(sourceFile: SourceFile): RefactoringResult {
    const changes: string[] = [];

    for (const cls of sourceFile.getClasses()) {
      const className = cls.getName();
      if (className === undefined) continue;

      const hasGetInstance = cls
        .getStaticMethods()
        .some((m) => m.getName() === "getInstance");
      if (!hasGetInstance) continue;

      const ctor = cls
        .getConstructors()
        .find((c) => c.hasModifier(SyntaxKind.PrivateKeyword));
      if (ctor === undefined) continue;

      const body = ctor.getBodyText() ?? "";
      if (FREEZE_RE.test(body)) continue; // idempotent

      const existing = body.trim() === "" ? "" : body.replace(/\n?$/, "\n");
      ctor.setBodyText(`${existing}${FREEZE_LINE.trimStart()}`);
      changes.push(
        `${className}: added Object.freeze(this) to constructor at line ${startLine(
          ctor,
        )}`,
      );
    }

    return {
      refactoringId: this.id,
      newSource: sourceFile.getFullText(),
      changed: changes.length > 0,
      changes,
    };
  }
}
