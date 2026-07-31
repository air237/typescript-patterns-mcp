/**
 * Mark every non-readonly instance field of the Builder's product class
 * as `readonly`.
 *
 * Gate: a class named `<Product>Builder` with a `build()` method whose
 * return type is another class declared in the same file (the product).
 * Only that product's fields are touched.
 *
 * Idempotency: fields already `readonly` OR `#private` are skipped.
 */

import { type SourceFile } from "ts-morph";

import { type PatternRefactoring } from "../patternRefactoring.js";
import { type RefactoringResult } from "../refactoringResult.js";
import { addReadonly, instanceFields, startLine } from "./refactoringHelpers.js";

export class BuilderMakeFieldsReadonly implements PatternRefactoring {
  readonly id = "BUILDER_MAKE_FIELDS_READONLY" as const;

  apply(sourceFile: SourceFile): RefactoringResult {
    const changes: string[] = [];
    const classes = sourceFile.getClasses();

    for (const builder of classes) {
      const builderName = builder.getName();
      if (builderName === undefined) continue;
      if (!builderName.endsWith("Builder") || builderName === "Builder") continue;

      const build = builder.getMethods().find((m) => m.getName() === "build");
      if (build === undefined) continue;
      const productName = build.getReturnTypeNode()?.getText() ?? "";
      const product = classes.find(
        (c) => c.getName() === productName && c.getName() !== builderName,
      );
      if (product === undefined) continue;

      for (const field of instanceFields(product)) {
        if (field.getName().startsWith("#")) continue;
        if (addReadonly(field)) {
          changes.push(
            `${productName}: field '${field.getName()}' at line ${startLine(field)} marked readonly`,
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
