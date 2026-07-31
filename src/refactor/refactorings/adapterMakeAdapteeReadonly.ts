/**
 * Mark the adaptee field of an Adapter-shaped class as `readonly`.
 *
 * Gate: name ends with `Adapter` AND has an interface-typed instance
 * field OR a constructor parameter-property of some non-self type
 * (the adaptee slot).
 *
 * Idempotency: fields already declared `readonly` are skipped.
 */

import { type SourceFile } from "ts-morph";

import { type PatternRefactoring } from "../patternRefactoring.js";
import { type RefactoringResult } from "../refactoringResult.js";
import { addReadonly, instanceFields, startLine } from "./refactoringHelpers.js";

export class AdapterMakeAdapteeReadonly implements PatternRefactoring {
  readonly id = "ADAPTER_MAKE_ADAPTEE_READONLY" as const;

  apply(sourceFile: SourceFile): RefactoringResult {
    const changes: string[] = [];

    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName();
      if (name === undefined) continue;
      if (!name.endsWith("Adapter")) continue;

      for (const field of instanceFields(cls)) {
        const t = field.getTypeNode()?.getText() ?? "";
        // Skip own-type or empty-type fields.
        if (t === "" || t === name) continue;
        // Skip explicit-#private ES fields — those cannot be marked
        // readonly anyway.
        if (field.getName().startsWith("#")) continue;
        if (addReadonly(field)) {
          changes.push(
            `${name}: adaptee field '${field.getName()}' at line ${startLine(field)} marked readonly`,
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
