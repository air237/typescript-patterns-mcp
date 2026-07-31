/**
 * Recognises the Singleton pattern.
 *
 * TypeScript sibling of `com.javapatterns.mcp.detect.SingletonDetector`.
 * Same 4-signal / 0.25-each / >=0.50 threshold structure, adapted to TS
 * idioms:
 *
 *   1. At least one `private` constructor.
 *   2. A static field of the enclosing class' own type
 *      (`static #instance: Logger | undefined`, or classic
 *       `private static _instance: Logger`).
 *   3. A `public static` method whose return type mentions the enclosing
 *      class (the conventional `getInstance()`).
 *   4. A lazy-init idiom inside that static method — TypeScript
 *      analogue of the Java "Bill-Pugh holder". We look for `??=`
 *      (the modern one-liner) or a manual `=== undefined` / `=== null`
 *      guard combined with `new ClassName(`.
 *
 * >=2 signals → confidence >= 0.50, reported. Otherwise skipped.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import {
  escapeRegExp,
  staticFields,
  startLine,
  typeMentionsClass,
} from "./detectorHelpers.js";

export class SingletonDetector implements PatternDetector {
  readonly pattern = "SINGLETON" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const cls of sourceFile.getClasses()) {
      const className = cls.getName();
      if (className === undefined) continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) private constructor
      const hasPrivateCtor = cls
        .getConstructors()
        .some((c) => c.hasModifier(SyntaxKind.PrivateKeyword));
      if (hasPrivateCtor) {
        signals++;
        evidence.push("at least one private constructor");
      }

      // 2) static field of the enclosing class' type
      const hasSelfTypedStatic = staticFields(cls).some((prop) => {
        const type = prop.getTypeNode()?.getText() ?? "";
        return typeMentionsClass(type, className);
      });
      if (hasSelfTypedStatic) {
        signals++;
        evidence.push(
          `static field whose declared type mentions ${className}`,
        );
      }

      // 3) public static method returning the enclosing class
      const hasGetInstance = cls.getStaticMethods().some((m) => {
        if (m.hasModifier(SyntaxKind.PrivateKeyword)) return false;
        const rt = m.getReturnTypeNode()?.getText() ?? "";
        return typeMentionsClass(rt, className);
      });
      if (hasGetInstance) {
        signals++;
        evidence.push(
          `public static method returning ${className} (getInstance idiom)`,
        );
      }

      // 4) lazy-init idiom inside the static method
      const hasLazyInit = cls.getStaticMethods().some((m) => {
        if (m.hasModifier(SyntaxKind.PrivateKeyword)) return false;
        const body = m.getBodyText() ?? "";
        if (body.includes("??=")) return true;
        const hasNullishCheck =
          /===\s*undefined|===\s*null/.test(body);
        const newExpr = new RegExp(`new\\s+${escapeRegExp(className)}\\s*\\(`);
        return hasNullishCheck && newExpr.test(body);
      });
      if (hasLazyInit) {
        signals++;
        evidence.push(
          "lazy-init idiom inside the static method (??= or === undefined guard)",
        );
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "SINGLETON",
            className,
            startLine: startLine(cls),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
