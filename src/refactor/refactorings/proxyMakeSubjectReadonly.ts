/**
 * Mark the real-subject field of a Proxy-shaped class as `readonly`.
 *
 * Gate: the class name matches the Proxy naming heuristic AND has an
 * interface-typed instance field whose type is one of the interfaces
 * the class implements.
 *
 * Idempotency: fields already declared `readonly` are skipped.
 */

import { type SourceFile } from "ts-morph";

import { type PatternRefactoring } from "../patternRefactoring.js";
import { type RefactoringResult } from "../refactoringResult.js";
import { addReadonly, instanceFields, startLine } from "./refactoringHelpers.js";

const PROXY_NAME_HINT =
  /(Proxy|Cache|Cached|Lazy|Auth|Authenticated|Remote|Logging|Logged)/i;

export class ProxyMakeSubjectReadonly implements PatternRefactoring {
  readonly id = "PROXY_MAKE_SUBJECT_READONLY" as const;

  apply(sourceFile: SourceFile): RefactoringResult {
    const changes: string[] = [];
    const interfaceNames = new Set(
      sourceFile.getInterfaces().map((i) => i.getName()),
    );

    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName();
      if (name === undefined) continue;
      if (!PROXY_NAME_HINT.test(name)) continue;

      const impls = cls.getImplements().map((i) => i.getText());
      for (const field of instanceFields(cls)) {
        if (field.getName().startsWith("#")) continue;
        const t = field.getTypeNode()?.getText() ?? "";
        if (!interfaceNames.has(t)) continue;
        if (!impls.includes(t)) continue;
        if (addReadonly(field)) {
          changes.push(
            `${name}: real-subject field '${field.getName()}' at line ${startLine(field)} marked readonly`,
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
