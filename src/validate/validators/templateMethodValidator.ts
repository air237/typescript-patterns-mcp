/**
 * Validates Template Method pattern implementations.
 *
 * Rules (all pinned to the abstract base):
 *   - ERROR   — the class has ZERO abstract methods. Without hooks the
 *               template has nothing to delegate; either subclasses
 *               have nothing to customise, or the abstraction is dead
 *               code masquerading as a template.
 *   - WARNING — no concrete non-abstract method in the class calls a
 *               `this.<abstractHook>()`; the abstract methods are never
 *               used by the template.
 *   - INFO    — the class does not JSDoc-mark or freeze its template
 *               method as `@final`. TS has no `final` keyword; the
 *               idiomatic guard is either an `@final` JSDoc tag or an
 *               `Object.freeze(Class.prototype.methodName)` call.
 *
 * Gate: abstract class with at least one non-abstract method that
 * contains `this.<name>(...)` calls (the template method itself).
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import { isAbstractClass, startLine } from "./validatorHelpers.js";

export class TemplateMethodValidator implements PatternValidator {
  readonly pattern = "TEMPLATE_METHOD" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const base of sourceFile.getClasses()) {
      const name = base.getName();
      if (name === undefined || !isAbstractClass(base)) continue;

      const line = startLine(base);
      const abstractMethodNames = new Set(
        base
          .getMethods()
          .filter((m) => m.hasModifier(SyntaxKind.AbstractKeyword))
          .map((m) => m.getName()),
      );
      // Find the "template method": a concrete method that calls a
      // this.<abstractHook>(...) somewhere in its body.
      const templateMethod = base
        .getMethods()
        .filter((m) => !m.hasModifier(SyntaxKind.AbstractKeyword))
        .find((m) => {
          const body = m.getBodyText() ?? "";
          const calls = body.match(/this\.(\w+)\s*\(/g);
          if (calls === null) return false;
          for (const c of calls) {
            const match = /this\.(\w+)/.exec(c);
            if (match !== null && abstractMethodNames.has(match[1]!)) return true;
          }
          return false;
        });
      if (templateMethod === undefined) continue;

      // ─── ERROR: no abstract hooks ─────────────────────────────
      // (Only reached via the gate above if `abstractMethodNames` is
      //  nonempty, but keep the guard for future refactorings.)
      if (abstractMethodNames.size === 0) {
        issues.push(
          validationIssue({
            pattern: "TEMPLATE_METHOD",
            className: name,
            line,
            severity: "ERROR",
            issue: `${name} has no abstract methods; the template method has nothing to delegate.`,
            suggestion:
              "Declare at least one `abstract` hook method that subclasses must override.",
          }),
        );
      }

      // ─── WARNING: some abstract hook is orphaned ──────────────
      const calledHookNames = new Set<string>();
      for (const m of base
        .getMethods()
        .filter((mm) => !mm.hasModifier(SyntaxKind.AbstractKeyword))) {
        const body = m.getBodyText() ?? "";
        const matches = body.matchAll(/this\.(\w+)\s*\(/g);
        for (const match of matches) {
          if (abstractMethodNames.has(match[1]!)) calledHookNames.add(match[1]!);
        }
      }
      const orphan = [...abstractMethodNames].find(
        (n) => !calledHookNames.has(n),
      );
      if (orphan !== undefined) {
        issues.push(
          validationIssue({
            pattern: "TEMPLATE_METHOD",
            className: name,
            line,
            severity: "WARNING",
            issue: `Abstract hook ${orphan}() is never called by any concrete method of ${name}.`,
            suggestion: `Either invoke this.${orphan}() from the template method, or remove the abstract declaration.`,
          }),
        );
      }

      // ─── INFO: template method is not @final-marked / frozen ──
      const bodyDocs = templateMethod
        .getLeadingCommentRanges()
        .map((r) => r.getText())
        .join("\n");
      const isFinalMarked = /@final\b/.test(bodyDocs);
      // A whole-class freeze idiom is also fine.
      const classBody = base.getFullText();
      const frozenPrototype = new RegExp(
        `Object\\.freeze\\s*\\(\\s*${name}\\.prototype`,
      ).test(classBody);
      if (!isFinalMarked && !frozenPrototype) {
        issues.push(
          validationIssue({
            pattern: "TEMPLATE_METHOD",
            className: name,
            line: startLine(templateMethod),
            severity: "INFO",
            issue: `Template method ${templateMethod.getName()}() is not marked \`@final\` (JSDoc) nor frozen. Subclasses can override the locked algorithm.`,
            suggestion:
              "Add `/** @final */` JSDoc above the template method or `Object.freeze(<Class>.prototype.<method>)` after class declaration.",
          }),
        );
      }
    }
    return issues;
  }
}
