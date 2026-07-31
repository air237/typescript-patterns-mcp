/**
 * Freeze the template method's prototype slot so subclasses cannot
 * silently override the locked algorithm skeleton, and add a JSDoc
 * `@final` marker in the same pass.
 *
 * TS analogue of Java's `template-method-make-final`: TS has no
 * `final` keyword, but freezing the prototype method achieves the
 * runtime lock, and the JSDoc `@final` is the linter-visible marker.
 *
 * Gate: an abstract class with at least one abstract method AND at
 * least one non-abstract method that calls `this.<abstractHook>(...)`
 * (the "template method" candidate).
 *
 * Idempotency: if the class already has a matching
 * `Object.freeze(<Class>.prototype.<method>)` line anywhere in the
 * file, the refactoring skips.
 */

import { SyntaxKind, type SourceFile } from "ts-morph";

import { type PatternRefactoring } from "../patternRefactoring.js";
import { type RefactoringResult } from "../refactoringResult.js";
import { escapeRegExp, isAbstractClass, startLine } from "./refactoringHelpers.js";

export class TemplateMethodMakeFinal implements PatternRefactoring {
  readonly id = "TEMPLATE_METHOD_MAKE_FINAL" as const;

  apply(sourceFile: SourceFile): RefactoringResult {
    const changes: string[] = [];
    const fileText = sourceFile.getFullText();

    for (const base of sourceFile.getClasses()) {
      const name = base.getName();
      if (name === undefined || !isAbstractClass(base)) continue;

      const abstractHookNames = new Set(
        base
          .getMethods()
          .filter((m) => m.hasModifier(SyntaxKind.AbstractKeyword))
          .map((m) => m.getName()),
      );
      const templateMethod = base
        .getMethods()
        .filter((m) => !m.hasModifier(SyntaxKind.AbstractKeyword))
        .find((m) => {
          const body = m.getBodyText() ?? "";
          const calls = body.match(/this\.(\w+)\s*\(/g) ?? [];
          for (const c of calls) {
            const match = /this\.(\w+)/.exec(c);
            if (match !== null && abstractHookNames.has(match[1]!)) return true;
          }
          return false;
        });
      if (templateMethod === undefined) continue;

      const methodName = templateMethod.getName();

      // Idempotency: freeze-line already present?
      const freezeRe = new RegExp(
        `Object\\.freeze\\s*\\(\\s*${escapeRegExp(name)}\\.prototype\\.${escapeRegExp(methodName)}\\s*\\)`,
      );
      if (freezeRe.test(fileText)) continue;

      // Add JSDoc `@final` marker (if not already present).
      const jsDocs = templateMethod.getJsDocs();
      const hasFinalTag = jsDocs.some((d) => /@final\b/.test(d.getText()));
      if (!hasFinalTag) {
        templateMethod.addJsDoc({ description: "@final — do not override." });
      }

      // Append the freeze line at module level after the class.
      sourceFile.insertStatements(base.getChildIndex() + 1, [
        `Object.freeze(${name}.prototype.${methodName});`,
      ]);
      changes.push(
        `${name}: template method '${methodName}' at line ${startLine(templateMethod)} — @final marker added, prototype method frozen`,
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
