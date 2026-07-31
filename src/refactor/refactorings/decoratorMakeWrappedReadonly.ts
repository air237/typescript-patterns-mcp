/**
 * Mark the wrapped (delegate) field of a Decorator-shaped class as `readonly`.
 *
 * Gate: the class implements an interface AND has an instance field
 * whose type is that same interface (Decorator's "same-surface + wrap"
 * invariant). Only the wrapped field is touched.
 *
 * Idempotency: fields already declared `readonly` are skipped.
 */

import { type SourceFile } from "ts-morph";

import { type PatternRefactoring } from "../patternRefactoring.js";
import { type RefactoringResult } from "../refactoringResult.js";
import { addReadonly, instanceFields, startLine } from "./refactoringHelpers.js";

export class DecoratorMakeWrappedReadonly implements PatternRefactoring {
  readonly id = "DECORATOR_MAKE_WRAPPED_READONLY" as const;

  apply(sourceFile: SourceFile): RefactoringResult {
    const changes: string[] = [];
    const interfaceNames = new Set(
      sourceFile.getInterfaces().map((i) => i.getName()),
    );

    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName();
      if (name === undefined) continue;

      const impls = cls.getImplements().map((i) => i.getText());
      for (const field of instanceFields(cls)) {
        if (field.getName().startsWith("#")) continue;
        const t = field.getTypeNode()?.getText() ?? "";
        if (!interfaceNames.has(t)) continue;
        if (!impls.includes(t)) continue;
        if (addReadonly(field)) {
          changes.push(
            `${name}: wrapped field '${field.getName()}' at line ${startLine(field)} marked readonly`,
          );
        }
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
