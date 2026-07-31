/**
 * Validates Builder pattern implementations.
 *
 * TypeScript sibling of `com.javapatterns.mcp.validate.BuilderValidator`,
 * adapted to TS idioms:
 *   - "outer.final field" → "product.readonly field"
 *   - "Builder has private fields" → "Builder has private (`#`) or
 *     `readonly` fields"
 *
 * Rules:
 *   - ERROR   — the product class exposes a `setX(...)` method; the
 *               product is mutable and Builder is pointless.
 *   - ERROR   — at least one instance field of the product class is
 *               neither `readonly` nor an ES-private `#field`; the
 *               "immutable" product can be mutated after construction.
 *   - WARNING — the Builder's setter-shaped methods do not return
 *               `this` (or `<Builder>` type), so fluent chaining is
 *               broken.
 *   - INFO    — Builder's instance fields are neither `readonly` nor
 *               `#private` — encapsulation violation.
 *
 * The validator gates on shape: it only speaks up if the file contains a
 * class whose name is `<Product>Builder` AND that Builder has a
 * `build()` method returning another class in the same file.
 */

import { type ClassDeclaration, type SourceFile, SyntaxKind } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import { instanceFields, startLine } from "./validatorHelpers.js";

export class BuilderValidator implements PatternValidator {
  readonly pattern = "BUILDER" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const classes = sourceFile.getClasses();

    for (const builder of classes) {
      const builderName = builder.getName();
      if (builderName === undefined) continue;
      if (!builderName.endsWith("Builder") || builderName === "Builder") continue;

      // Find the paired Product via build() return type.
      const buildMethod = builder
        .getMethods()
        .find((m) => m.getName() === "build");
      if (buildMethod === undefined) continue;
      const productName = buildMethod.getReturnTypeNode()?.getText() ?? "";
      const product = classes.find(
        (c) => c.getName() === productName && c.getName() !== builderName,
      );
      if (product === undefined) continue;

      // ─── ERROR: product exposes setX(...) ──────────────────────
      const setter = product
        .getMethods()
        .find(
          (m) =>
            /^set[A-Z]/.test(m.getName()) &&
            !m.hasModifier(SyntaxKind.PrivateKeyword),
        );
      if (setter !== undefined) {
        issues.push(
          validationIssue({
            pattern: "BUILDER",
            className: productName,
            line: startLine(setter),
            severity: "ERROR",
            issue:
              `${productName} exposes a public setter (${setter.getName()}()) — Builder's immutability promise is broken.`,
            suggestion:
              `Remove setters from ${productName}. State changes must go through a fresh Builder and produce a new ${productName}.`,
          }),
        );
      }

      // ─── ERROR: product has mutable (non-readonly, non-#) field ─
      const mutableProductField = instanceFields(product).find((f) => {
        if (f.getName().startsWith("#")) return false;
        if (f.hasModifier?.(SyntaxKind.ReadonlyKeyword) === true) return false;
        return true;
      });
      if (mutableProductField !== undefined) {
        issues.push(
          validationIssue({
            pattern: "BUILDER",
            className: productName,
            line: startLine(mutableProductField),
            severity: "ERROR",
            issue:
              `Instance field '${mutableProductField.getName()}' of ${productName} is neither \`readonly\` nor an ES-private \`#field\` — the value object is mutable.`,
            suggestion:
              `Mark every instance field of ${productName} as \`readonly\` (public or private) or as a \`#private\` field, and initialise it once from the Builder.`,
          }),
        );
      }

      // ─── WARNING: fluent setter not returning this ─────────────
      // Any non-static Builder method that is NOT `build` and returns
      // `this` / `<Builder>` should actually `return this`.
      for (const m of builder.getMethods()) {
        if (m.isStatic()) continue;
        if (m.getName() === "build") continue;
        const rt = m.getReturnTypeNode()?.getText() ?? "";
        const rtLooksFluent = rt === "this" || rt === builderName;
        if (!rtLooksFluent) continue;
        const body = m.getBodyText() ?? "";
        const returnsThis = /return\s+this\s*;/.test(body);
        if (!returnsThis) {
          issues.push(
            validationIssue({
              pattern: "BUILDER",
              className: builderName,
              line: startLine(m),
              severity: "WARNING",
              issue:
                `Builder method ${m.getName()}() declares a fluent return type (${rt}) but never \`return this;\` — chaining is broken.`,
              suggestion: "End the method body with `return this;`.",
            }),
          );
        }
      }

      // ─── INFO: Builder fields not private/readonly ─────────────
      const leakyField = leakyBuilderField(builder);
      if (leakyField !== null) {
        issues.push(
          validationIssue({
            pattern: "BUILDER",
            className: builderName,
            line: leakyField.line,
            severity: "INFO",
            issue:
              `Builder field '${leakyField.name}' is neither \`readonly\` nor \`#private\` — encapsulation violation.`,
            suggestion:
              "Prefer ES-private `#` fields for Builder state; `readonly` alone lets external inspection through.",
          }),
        );
      }
    }
    return issues;
  }
}

function leakyBuilderField(
  builder: ClassDeclaration,
): { name: string; line: number } | null {
  for (const f of instanceFields(builder)) {
    if (f.getName().startsWith("#")) continue;
    if (f.hasModifier?.(SyntaxKind.PrivateKeyword) === true) continue;
    return { name: f.getName(), line: startLine(f) };
  }
  return null;
}
