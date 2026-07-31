/**
 * Validates Factory Method pattern implementations.
 *
 * Rules (all pinned to the abstract Creator class):
 *   - ERROR   — the class has an abstract create-shaped method returning
 *               `void`. The whole point is to return a Product.
 *   - WARNING — the creator's constructor is `public`. Concrete
 *               subclasses should be the callable surface, not the
 *               abstract base itself.
 *   - WARNING — no concrete subclass exists in the same file that
 *               overrides the factory method (the abstraction is dead).
 *   - INFO    — the abstract factory method's name does not follow the
 *               `create*` convention. Not a bug, but detectors and
 *               human readers rely on the naming heuristic.
 *
 * Gate: class is abstract AND has an abstract method whose return type
 * is another class or interface declared in the same file.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import { isAbstractClass, startLine } from "./validatorHelpers.js";

export class FactoryMethodValidator implements PatternValidator {
  readonly pattern = "FACTORY_METHOD" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const classes = sourceFile.getClasses();
    const interfaces = sourceFile.getInterfaces();

    for (const creator of classes) {
      const name = creator.getName();
      if (name === undefined || !isAbstractClass(creator)) continue;

      const abstractMethods = creator
        .getMethods()
        .filter((m) => m.hasModifier(SyntaxKind.AbstractKeyword));
      const factoryMethod = abstractMethods.find((m) => {
        const rt = m.getReturnTypeNode()?.getText() ?? "";
        if (rt === "" || rt === "void") return false;
        const productClass = classes.some(
          (c) => c.getName() === rt && c.getName() !== name,
        );
        const productIface = interfaces.some((i) => i.getName() === rt);
        return productClass || productIface;
      });
      if (factoryMethod === undefined) continue;

      // ─── ERROR: another abstract method named create* returns void ─
      const voidFactory = abstractMethods.find((m) => {
        const rt = m.getReturnTypeNode()?.getText() ?? "";
        return /^create[A-Z]/.test(m.getName()) && rt === "void";
      });
      if (voidFactory !== undefined) {
        issues.push(
          validationIssue({
            pattern: "FACTORY_METHOD",
            className: name,
            line: startLine(voidFactory),
            severity: "ERROR",
            issue: `Abstract factory method ${voidFactory.getName()}() returns \`void\` — a factory method must produce a Product.`,
            suggestion:
              "Give the factory method a non-void return type (the Product interface / class).",
          }),
        );
      }

      // ─── WARNING: creator constructor is public ────────────────
      const publicCtor = creator
        .getConstructors()
        .find(
          (c) =>
            c.hasModifier(SyntaxKind.PublicKeyword) ||
            (!c.hasModifier(SyntaxKind.PrivateKeyword) &&
              !c.hasModifier(SyntaxKind.ProtectedKeyword)),
        );
      if (publicCtor !== undefined) {
        issues.push(
          validationIssue({
            pattern: "FACTORY_METHOD",
            className: name,
            line: startLine(publicCtor),
            severity: "WARNING",
            issue: `Abstract creator ${name} has a public constructor — callers can bypass the concrete subclasses.`,
            suggestion:
              "Mark the constructor `protected` so only subclasses may invoke it.",
          }),
        );
      }

      // ─── WARNING: no concrete subclass overrides the factory ────
      const overridingSubclass = classes.some((c) => {
        if (c === creator) return false;
        const ext = c.getExtends()?.getText();
        if (ext !== name) return false;
        if (isAbstractClass(c)) return false;
        return c
          .getMethods()
          .some(
            (m) =>
              m.getName() === factoryMethod.getName() &&
              m.hasModifier(SyntaxKind.OverrideKeyword),
          );
      });
      if (!overridingSubclass) {
        issues.push(
          validationIssue({
            pattern: "FACTORY_METHOD",
            className: name,
            line: startLine(factoryMethod),
            severity: "WARNING",
            issue: `No concrete subclass in this file overrides ${factoryMethod.getName()}() — the pattern is not exercised.`,
            suggestion:
              "Add a concrete subclass that overrides the factory method, or the abstraction is dead code.",
          }),
        );
      }

      // ─── INFO: naming convention ───────────────────────────────
      if (!/^create[A-Z]/.test(factoryMethod.getName())) {
        issues.push(
          validationIssue({
            pattern: "FACTORY_METHOD",
            className: name,
            line: startLine(factoryMethod),
            severity: "INFO",
            issue: `Factory method ${factoryMethod.getName()}() does not follow the create* naming convention.`,
            suggestion:
              "Rename to `create<Product>()` for clarity — detectors and reviewers rely on the naming heuristic.",
          }),
        );
      }
    }
    return issues;
  }
}
