/**
 * Validates Strategy pattern implementations.
 *
 * Rules (all pinned to the strategy INTERFACE, not the concrete impls):
 *   - ERROR   — interface named `*Strategy` declares zero methods; a
 *               Strategy contract MUST declare at least one operation.
 *   - WARNING — interface declares 3+ methods; a strategy interface is
 *               conventionally a Single Abstract Method (SAM). Fat
 *               strategies are usually a Facade in disguise.
 *   - WARNING — interface has ONLY one concrete implementor in the same
 *               file; a strategy with a single implementation is not
 *               yet a strategy.
 *   - INFO    — interface's single method has a `void` return type. TS
 *               strategies typically compute a value; a `void` shape
 *               suggests a Command in disguise.
 *
 * Gate: name must end with `Strategy` (case-preserving).
 */

import { type SourceFile } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import { startLine } from "./validatorHelpers.js";

export class StrategyValidator implements PatternValidator {
  readonly pattern = "STRATEGY" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const iface of sourceFile.getInterfaces()) {
      const name = iface.getName();
      if (!name.endsWith("Strategy")) continue;

      const line = startLine(iface);
      const methods = iface.getMethods();

      if (methods.length === 0) {
        issues.push(
          validationIssue({
            pattern: "STRATEGY",
            className: name,
            line,
            severity: "ERROR",
            issue: `${name} declares zero methods; a Strategy contract must declare at least one operation.`,
            suggestion:
              "Add a single method that captures the interchangeable algorithm.",
          }),
        );
      }

      if (methods.length >= 3) {
        issues.push(
          validationIssue({
            pattern: "STRATEGY",
            className: name,
            line,
            severity: "WARNING",
            issue: `${name} declares ${methods.length} methods; a Strategy is conventionally a Single Abstract Method.`,
            suggestion:
              "Split the strategy interface, or reconsider whether the design is really a Facade.",
          }),
        );
      }

      const implementors = sourceFile
        .getClasses()
        .filter((c) => c.getImplements().some((i) => i.getText() === name));
      if (implementors.length === 1) {
        issues.push(
          validationIssue({
            pattern: "STRATEGY",
            className: name,
            line,
            severity: "WARNING",
            issue: `${name} has only one implementor in this file (${implementors[0]!.getName()}) — Strategy needs interchangeable variants to be worth the abstraction.`,
            suggestion:
              "Introduce a second concrete Strategy, or inline the single implementor and delete the abstraction.",
          }),
        );
      }

      if (methods.length === 1) {
        const rt = methods[0]!.getReturnTypeNode()?.getText() ?? "";
        if (rt === "void") {
          issues.push(
            validationIssue({
              pattern: "STRATEGY",
              className: name,
              line: startLine(methods[0]!),
              severity: "INFO",
              issue: `${name}'s single method returns \`void\`. A Strategy conventionally computes a value.`,
              suggestion:
                "If the operation is side-effectful without a result, the shape is a Command, not a Strategy.",
            }),
          );
        }
      }
    }
    return issues;
  }
}
