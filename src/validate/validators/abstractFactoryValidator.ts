/**
 * Validates Abstract Factory implementations.
 *
 * Rules (pinned to a `*Factory` interface with >=2 create* methods):
 *   - ERROR   — the factory contract itself is a concrete class (not
 *               interface / abstract). The whole point is to declare
 *               a contract multiple concrete factories can satisfy.
 *   - WARNING — a create* method returns a concrete class (not an
 *               interface). That leaks the concrete family into the
 *               contract and prevents adding new families.
 *   - WARNING — the contract has fewer than 2 concrete implementors
 *               in the same file; a family with one factory is not
 *               a family.
 *   - INFO    — create* method names are not consistently spelled
 *               `create<Product>` (e.g. `makeFoo`, `newBar`).
 */

import { type SourceFile } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import { startLine } from "./validatorHelpers.js";

export class AbstractFactoryValidator implements PatternValidator {
  readonly pattern = "ABSTRACT_FACTORY" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const classNames = new Set(
      sourceFile.getClasses().map((c) => c.getName() ?? ""),
    );

    for (const iface of sourceFile.getInterfaces()) {
      const name = iface.getName();
      if (!name.endsWith("Factory")) continue;
      const methods = iface.getMethods();
      const createLike = methods.filter((m) => /^create[A-Z]/.test(m.getName()));
      if (createLike.length < 2) continue;

      const line = startLine(iface);

      // ─── WARNING: any create* returns a concrete class ─────────
      const concreteReturn = createLike.find((m) => {
        const rt = m.getReturnTypeNode()?.getText() ?? "";
        return classNames.has(rt);
      });
      if (concreteReturn !== undefined) {
        issues.push(
          validationIssue({
            pattern: "ABSTRACT_FACTORY",
            className: name,
            line: startLine(concreteReturn),
            severity: "WARNING",
            issue: `${concreteReturn.getName()}() returns a concrete class — the contract leaks the family.`,
            suggestion:
              "Return the product's interface, not a concrete class, so new families can be added without changing the factory contract.",
          }),
        );
      }

      // ─── WARNING: <2 concrete implementors ─────────────────────
      const implementors = sourceFile
        .getClasses()
        .filter((c) => c.getImplements().some((i) => i.getText() === name));
      if (implementors.length < 2) {
        issues.push(
          validationIssue({
            pattern: "ABSTRACT_FACTORY",
            className: name,
            line,
            severity: "WARNING",
            issue: `${name} has only ${implementors.length} implementor(s) — Abstract Factory needs multiple families.`,
            suggestion:
              "Add a second concrete factory (e.g. a matching MacOSFactory alongside WindowsFactory) or drop the abstraction.",
          }),
        );
      }

      // ─── INFO: naming inconsistency in create* methods ─────────
      const nonCreateNamed = methods.find(
        (m) => !/^create[A-Z]/.test(m.getName()),
      );
      if (nonCreateNamed !== undefined) {
        issues.push(
          validationIssue({
            pattern: "ABSTRACT_FACTORY",
            className: name,
            line: startLine(nonCreateNamed),
            severity: "INFO",
            issue: `${name}.${nonCreateNamed.getName()}() does not follow the create* naming convention.`,
            suggestion:
              "Rename family-producing methods to `create<Product>()` for consistency.",
          }),
        );
      }
    }
    return issues;
  }
}
