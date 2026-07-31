/**
 * Demote the public constructor(s) of an abstract Creator
 * (Factory-Method-shaped class) to `protected` so callers cannot bypass
 * the concrete subclasses.
 *
 * Gate: the class is `abstract` AND has an abstract method returning
 * some class-typed value (the factory method).
 *
 * Idempotency: constructors that are already `protected` (or `private`)
 * are skipped.
 */

import { SyntaxKind, type SourceFile } from "ts-morph";

import { type PatternRefactoring } from "../patternRefactoring.js";
import { type RefactoringResult } from "../refactoringResult.js";
import { isAbstractClass, startLine } from "./refactoringHelpers.js";

export class FactoryMethodRestrictCreatorCtor implements PatternRefactoring {
  readonly id = "FACTORY_METHOD_RESTRICT_CREATOR_CTOR" as const;

  apply(sourceFile: SourceFile): RefactoringResult {
    const changes: string[] = [];

    for (const creator of sourceFile.getClasses()) {
      const name = creator.getName();
      if (name === undefined || !isAbstractClass(creator)) continue;

      const hasAbstractFactoryMethod = creator
        .getMethods()
        .some(
          (m) =>
            m.hasModifier(SyntaxKind.AbstractKeyword) &&
            (m.getReturnTypeNode()?.getText() ?? "") !== "" &&
            (m.getReturnTypeNode()?.getText() ?? "") !== "void",
        );
      if (!hasAbstractFactoryMethod) continue;

      for (const ctor of creator.getConstructors()) {
        if (ctor.hasModifier(SyntaxKind.PrivateKeyword)) continue;
        if (ctor.hasModifier(SyntaxKind.ProtectedKeyword)) continue;
        // remove public if present, add protected
        if (ctor.hasModifier(SyntaxKind.PublicKeyword)) {
          ctor.toggleModifier("public", false);
        }
        ctor.toggleModifier("protected", true);
        changes.push(
          `${name}: creator constructor at line ${startLine(ctor)} demoted to protected`,
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
