/**
 * Validates Command pattern implementations.
 *
 * Rules (pinned to a `<X>Command` interface):
 *   - ERROR   — the interface does not declare an `execute()` method.
 *   - WARNING — a concrete Command's `execute()` returns `void` but the
 *               interface declares a non-void return type (mismatch,
 *               indicates the concrete forgot to satisfy the contract).
 *   - WARNING — a concrete Command has NO field(s) — commands should
 *               carry their receiver and payload; a field-less
 *               command is effectively a lambda.
 *   - INFO    — the interface does not declare an `undo()` method.
 *               Command with undo is a stronger, more useful shape;
 *               without it, the pattern collapses to Function type.
 */

import { type SourceFile } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import { instanceFields, startLine } from "./validatorHelpers.js";

export class CommandValidator implements PatternValidator {
  readonly pattern = "COMMAND" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const iface of sourceFile.getInterfaces()) {
      const name = iface.getName();
      if (!name.endsWith("Command")) continue;

      const line = startLine(iface);
      const methods = iface.getMethods();
      const executeMethod = methods.find((m) => m.getName() === "execute");
      const undoMethod = methods.find((m) => m.getName() === "undo");

      // ─── ERROR: no execute() ───────────────────────────────────
      if (executeMethod === undefined) {
        issues.push(
          validationIssue({
            pattern: "COMMAND",
            className: name,
            line,
            severity: "ERROR",
            issue: `${name} does not declare an execute() method.`,
            suggestion:
              "Add `execute(): void` (or whatever return type your commands share).",
          }),
        );
        continue;
      }

      const executeRt = executeMethod.getReturnTypeNode()?.getText() ?? "";

      // Iterate concrete Commands.
      const implementors = sourceFile
        .getClasses()
        .filter((c) => c.getImplements().some((i) => i.getText() === name));

      for (const impl of implementors) {
        const implName = impl.getName() ?? "<anon>";

        // ─── WARNING: mismatched execute() return type ───────────
        const implExecute = impl.getMethods().find((m) => m.getName() === "execute");
        if (
          implExecute !== undefined &&
          executeRt !== "" &&
          executeRt !== "void"
        ) {
          const irt = implExecute.getReturnTypeNode()?.getText() ?? "";
          if (irt === "void") {
            issues.push(
              validationIssue({
                pattern: "COMMAND",
                className: implName,
                line: startLine(implExecute),
                severity: "WARNING",
                issue: `${implName}.execute() returns \`void\` but ${name} declares ${executeRt}.`,
                suggestion:
                  "Update the concrete command to actually return the declared type.",
              }),
            );
          }
        }

        // ─── WARNING: field-less command ──────────────────────────
        if (instanceFields(impl).length === 0) {
          issues.push(
            validationIssue({
              pattern: "COMMAND",
              className: implName,
              line: startLine(impl),
              severity: "WARNING",
              issue: `${implName} has no instance fields — commands should carry their receiver and payload.`,
              suggestion:
                "Move the closed-over values into constructor parameter properties so the command is a proper object, not a hidden lambda.",
            }),
          );
        }
      }

      // ─── INFO: no undo() on the interface ──────────────────────
      if (undoMethod === undefined) {
        issues.push(
          validationIssue({
            pattern: "COMMAND",
            className: name,
            line,
            severity: "INFO",
            issue: `${name} does not declare an undo() method.`,
            suggestion:
              "Add `undo(): void` if commands must be reversible; without it the pattern collapses to a Function type.",
          }),
        );
      }
    }
    return issues;
  }
}
