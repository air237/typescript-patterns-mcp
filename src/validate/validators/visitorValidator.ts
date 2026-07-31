/**
 * Validates Visitor pattern implementations.
 *
 * Rules (pinned to a `Visitor` interface with visit* methods):
 *   - ERROR   — an element's `accept()` does NOT call
 *               `visitor.visit<This>(this)`. Broken double dispatch —
 *               the visitor receives the wrong overload.
 *   - WARNING — the element interface declares more methods than
 *               just `accept()`. Elements should be "dumb"
 *               data-holders in the visitor pattern.
 *   - INFO    — a visit* method's return type is `void` on the
 *               interface. Visitors typically compute a fold; void
 *               visitors suggest a Command in disguise.
 */

import { type SourceFile } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import { startLine } from "./validatorHelpers.js";

export class VisitorValidator implements PatternValidator {
  readonly pattern = "VISITOR" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const interfaces = sourceFile.getInterfaces();
    const classes = sourceFile.getClasses();

    // Find a candidate element interface: one that has an `accept(...)`
    // method AND at least one concrete implementor whose `accept` body
    // calls back to a visitor.
    for (const element of interfaces) {
      const elementName = element.getName();
      const accept = element.getMethods().find((m) => m.getName() === "accept");
      if (accept === undefined) continue;

      const line = startLine(element);
      const concreteElements = classes.filter((c) =>
        c.getImplements().some((i) => i.getText() === elementName),
      );

      // ─── ERROR: broken double dispatch ─────────────────────────
      for (const el of concreteElements) {
        const elName = el.getName() ?? "<anon>";
        const acceptImpl = el
          .getMethods()
          .find((m) => m.getName() === "accept");
        if (acceptImpl === undefined) continue;
        const body = acceptImpl.getBodyText() ?? "";
        // Expect: <param>.visit<X>(this) or return <param>.visit<X>(this).
        // The visit method should match the class name in some way.
        const dispatch = /\w+\s*\.\s*visit\w+\s*\(\s*this\s*\)/.exec(body);
        if (dispatch === null) {
          issues.push(
            validationIssue({
              pattern: "VISITOR",
              className: elName,
              line: startLine(acceptImpl),
              severity: "ERROR",
              issue: `${elName}.accept() does not call \`visitor.visit<X>(this)\` — double dispatch is broken.`,
              suggestion:
                `End the accept() body with \`return visitor.visit${elName}(this);\` (or your chosen visit-method name).`,
            }),
          );
        }
      }

      // ─── WARNING: element has more than accept() ───────────────
      const extraMethods = element
        .getMethods()
        .filter((m) => m.getName() !== "accept");
      if (extraMethods.length > 0) {
        issues.push(
          validationIssue({
            pattern: "VISITOR",
            className: elementName,
            line,
            severity: "WARNING",
            issue: `${elementName} declares methods other than accept() (${extraMethods.map((m) => m.getName()).join(", ")}). Elements should be data-holders.`,
            suggestion:
              "Move behaviour into visitor implementations; keep the element interface minimal.",
          }),
        );
      }

      // ─── INFO: a visit* method returns void ────────────────────
      // Look for the visitor interface: another interface with visit*
      // methods.
      const visitorIface = interfaces.find((i) => {
        return (
          i !== element &&
          i.getMethods().some((m) => /^visit[A-Z]/.test(m.getName()))
        );
      });
      if (visitorIface !== undefined) {
        const voidVisit = visitorIface.getMethods().find((m) => {
          if (!/^visit[A-Z]/.test(m.getName())) return false;
          const rt = m.getReturnTypeNode()?.getText() ?? "";
          return rt === "void";
        });
        if (voidVisit !== undefined) {
          issues.push(
            validationIssue({
              pattern: "VISITOR",
              className: visitorIface.getName(),
              line: startLine(voidVisit),
              severity: "INFO",
              issue: `${visitorIface.getName()}.${voidVisit.getName()}() returns \`void\`.`,
              suggestion:
                "Visitors typically compute a fold; a void return usually means the operation is a Command in disguise.",
            }),
          );
        }
      }
    }
    return issues;
  }
}
