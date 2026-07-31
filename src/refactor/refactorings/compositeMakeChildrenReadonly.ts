/**
 * Mark the children collection field of a Composite-shaped class as
 * `readonly` so callers cannot replace the whole array in one go.
 *
 * Gate: the class has an array-typed field whose element type is
 * another class/interface declared in the same file (candidate
 * "children" collection).
 *
 * Idempotency: fields already `readonly` OR named as `#private` are
 * skipped.
 */

import { type SourceFile } from "ts-morph";

import { type PatternRefactoring } from "../patternRefactoring.js";
import { type RefactoringResult } from "../refactoringResult.js";
import { addReadonly, instanceFields, startLine } from "./refactoringHelpers.js";

export class CompositeMakeChildrenReadonly implements PatternRefactoring {
  readonly id = "COMPOSITE_MAKE_CHILDREN_READONLY" as const;

  apply(sourceFile: SourceFile): RefactoringResult {
    const changes: string[] = [];
    const localTypeNames = new Set<string>([
      ...sourceFile.getInterfaces().map((i) => i.getName()),
      ...sourceFile.getClasses().map((c) => c.getName() ?? ""),
    ]);

    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName();
      if (name === undefined) continue;

      for (const field of instanceFields(cls)) {
        if (field.getName().startsWith("#")) continue;
        const t = field.getTypeNode()?.getText() ?? "";
        const m = /^(\w+)\s*\[\]$|^Array\s*<\s*(\w+)\s*>$/.exec(
          t.replace(/\s+/g, " ").trim(),
        );
        if (m === null) continue;
        const eltType = m[1] ?? m[2]!;
        if (!localTypeNames.has(eltType) || eltType === name) continue;
        if (addReadonly(field)) {
          changes.push(
            `${name}: children field '${field.getName()}' at line ${startLine(field)} marked readonly`,
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
