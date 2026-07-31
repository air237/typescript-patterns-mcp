/**
 * Validates Mediator pattern implementations.
 *
 * Rules (pinned to a `*Mediator` interface):
 *   - ERROR   — a Colleague class holds a REFERENCE to another
 *               Colleague (peer-to-peer chatter). The whole point
 *               of Mediator is to prevent that.
 *   - WARNING — the Colleague base class holds a non-`readonly`
 *               mediator field. Colleagues should not migrate
 *               between mediators mid-life.
 *   - WARNING — no concrete Mediator implementor exists in the file.
 *   - INFO    — the Mediator interface does not declare a
 *               `register(...)` method. Without registration, a
 *               concrete mediator has no way to learn its members.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import {
  instanceFields,
  startLine,
} from "./validatorHelpers.js";

export class MediatorValidator implements PatternValidator {
  readonly pattern = "MEDIATOR" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const iface of sourceFile.getInterfaces()) {
      const name = iface.getName();
      if (!name.endsWith("Mediator")) continue;

      const line = startLine(iface);
      const methodNames = new Set(iface.getMethods().map((m) => m.getName()));

      // Identify the Colleague base — an abstract class holding a
      // mediator-typed field.
      const colleague = sourceFile.getClasses().find((c) => {
        if (!c.hasModifier(SyntaxKind.AbstractKeyword)) return false;
        return instanceFields(c).some((f) => {
          const t = f.getTypeNode()?.getText() ?? "";
          return t === name;
        });
      });

      // ─── ERROR: colleague holds another colleague ──────────────
      if (colleague !== undefined) {
        const concreteColleagues = sourceFile
          .getClasses()
          .filter((c) => c.getExtends()?.getText() === colleague.getName());
        const colleagueTypeNames = new Set(
          [colleague, ...concreteColleagues]
            .map((c) => c.getName())
            .filter((n): n is string => n !== undefined),
        );
        for (const cc of concreteColleagues) {
          const peerField = instanceFields(cc).find((f) => {
            const t = f.getTypeNode()?.getText() ?? "";
            return colleagueTypeNames.has(t);
          });
          if (peerField !== undefined) {
            issues.push(
              validationIssue({
                pattern: "MEDIATOR",
                className: cc.getName() ?? "<anon>",
                line: startLine(peerField),
                severity: "ERROR",
                issue: `${cc.getName() ?? "<anon>"} holds a direct reference to another Colleague ('${peerField.getName()}') — this bypasses the mediator.`,
                suggestion:
                  "Route ALL peer communication through the mediator. Colleagues must never learn each other's identities.",
              }),
            );
          }
        }

        // ─── WARNING: mediator field not readonly ────────────────
        const medField = instanceFields(colleague).find((f) => {
          const t = f.getTypeNode()?.getText() ?? "";
          return t === name;
        });
        if (medField !== undefined) {
          const isReadonly =
            medField.hasModifier?.(SyntaxKind.ReadonlyKeyword) === true;
          if (!isReadonly) {
            issues.push(
              validationIssue({
                pattern: "MEDIATOR",
                className: colleague.getName() ?? "<anon>",
                line: startLine(medField),
                severity: "WARNING",
                issue: `Colleague ${colleague.getName() ?? "<anon>"} holds a non-readonly mediator field '${medField.getName()}'.`,
                suggestion:
                  "Mark the mediator field `readonly` so colleagues cannot migrate between mediators.",
              }),
            );
          }
        }
      }

      // ─── WARNING: no concrete implementor ─────────────────────
      const implementors = sourceFile
        .getClasses()
        .filter((c) => c.getImplements().some((i) => i.getText() === name));
      if (implementors.length === 0) {
        issues.push(
          validationIssue({
            pattern: "MEDIATOR",
            className: name,
            line,
            severity: "WARNING",
            issue: `${name} has no implementor in this file — the mediator abstraction is dead code.`,
            suggestion:
              "Add a concrete mediator that registers colleagues and dispatches between them.",
          }),
        );
      }

      // ─── INFO: no register() method ────────────────────────────
      if (!methodNames.has("register")) {
        issues.push(
          validationIssue({
            pattern: "MEDIATOR",
            className: name,
            line,
            severity: "INFO",
            issue: `${name} does not declare a register() method.`,
            suggestion:
              "Add `register(colleague: Colleague): void` so the concrete mediator can enumerate its members.",
          }),
        );
      }
    }
    return issues;
  }
}
