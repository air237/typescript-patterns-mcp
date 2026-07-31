/**
 * Recognises the Builder pattern.
 *
 * Signals (each 0.25):
 *   1. There is a class whose name ends in `Builder` (naming heuristic).
 *   2. That Builder class has at least one method returning `this`
 *      (fluent chaining).
 *   3. That Builder class has a `build(...)` method whose return type is
 *      a DIFFERENT class declared in the same file (the "product").
 *   4. The product class has a `private` or `protected` constructor
 *      (callers cannot bypass the Builder).
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { startLine } from "./detectorHelpers.js";

export class BuilderDetector implements PatternDetector {
  readonly pattern = "BUILDER" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    const classes = sourceFile.getClasses();

    for (const builder of classes) {
      const name = builder.getName();
      if (name === undefined) continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) name ends with Builder
      if (name.endsWith("Builder") && name !== "Builder") {
        signals++;
        evidence.push(`class name ends with 'Builder' (${name})`);
      }

      // 2) at least one method returning `this`
      const hasFluentThis = builder.getMethods().some((m) => {
        const rt = m.getReturnTypeNode()?.getText() ?? "";
        return rt === "this";
      });
      if (hasFluentThis) {
        signals++;
        evidence.push("at least one method returning `this` (fluent chaining)");
      }

      // 3) `build(...)` returns a DIFFERENT class declared in the same file
      const buildMethod = builder
        .getMethods()
        .find((m) => m.getName() === "build");
      let productName: string | null = null;
      if (buildMethod !== undefined) {
        const rt = buildMethod.getReturnTypeNode()?.getText() ?? "";
        for (const other of classes) {
          const otherName = other.getName();
          if (otherName === undefined || otherName === name) continue;
          if (rt === otherName) {
            productName = otherName;
            signals++;
            evidence.push(
              `build() returns another class in the same file (${otherName})`,
            );
            break;
          }
        }
      }

      // 4) product class has a private / protected constructor
      if (productName !== null) {
        const product = classes.find((c) => c.getName() === productName);
        const productHasRestrictedCtor = (product?.getConstructors() ?? []).some(
          (c) =>
            c.hasModifier(SyntaxKind.PrivateKeyword) ||
            c.hasModifier(SyntaxKind.ProtectedKeyword),
        );
        if (productHasRestrictedCtor) {
          signals++;
          evidence.push(
            `product ${productName} has a private/protected constructor`,
          );
        }
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "BUILDER",
            className: name,
            startLine: startLine(builder),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
