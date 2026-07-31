/**
 * Turn public constructors of Singleton-shaped classes into private ones.
 *
 * TypeScript sibling of `com.javapatterns.mcp.refactor.SingletonMakeCtorPrivate`.
 *
 * A class is "Singleton-shaped" iff it has a static `getInstance()`
 * method. If no such class exists, the refactoring is a no-op.
 *
 * Idempotency: if the constructor is already `private`, this
 * refactoring skips it and returns `changed === false`.
 */

import { SyntaxKind, type SourceFile } from "ts-morph";

import { type PatternRefactoring } from "../patternRefactoring.js";
import { type RefactoringResult } from "../refactoringResult.js";
import { startLine } from "./refactoringHelpers.js";

export class SingletonMakeCtorPrivate implements PatternRefactoring {
  readonly id = "SINGLETON_MAKE_CTOR_PRIVATE" as const;

  apply(sourceFile: SourceFile): RefactoringResult {
    const changes: string[] = [];

    for (const cls of sourceFile.getClasses()) {
      const className = cls.getName();
      if (className === undefined) continue;
      const hasGetInstance = cls
        .getStaticMethods()
        .some((m) => m.getName() === "getInstance");
      if (!hasGetInstance) continue;

      for (const ctor of cls.getConstructors()) {
        const isAlreadyPrivate = ctor.hasModifier(SyntaxKind.PrivateKeyword);
        if (isAlreadyPrivate) continue;
        // Remove PUBLIC / PROTECTED if present, then add PRIVATE.
        if (ctor.hasModifier(SyntaxKind.PublicKeyword)) {
          ctor.toggleModifier("public", false);
        }
        if (ctor.hasModifier(SyntaxKind.ProtectedKeyword)) {
          ctor.toggleModifier("protected", false);
        }
        ctor.toggleModifier("private", true);
        changes.push(
          `${className}: constructor at line ${startLine(ctor)} made private`,
        );
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
