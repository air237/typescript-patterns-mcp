/**
 * Recognises the Prototype pattern.
 *
 * Signals (each 0.25):
 *   1. There is a class with a `clone()` method returning its own type.
 *   2. That class has a copy-constructor idiom — the constructor
 *      accepts a parameter typed as the class itself (or a union
 *      that includes it).
 *   3. The `clone()` body constructs a new instance of the same
 *      class (`new ClassName(...)`).
 *   4. The class' fields are all initialised from the constructor
 *      argument (visible via `this.<field> = source.<field>` pattern
 *      appearing in the constructor body).
 */

import { type SourceFile } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { escapeRegExp, startLine, typeMentionsClass } from "./detectorHelpers.js";

export class PrototypeDetector implements PatternDetector {
  readonly pattern = "PROTOTYPE" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName();
      if (name === undefined) continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) clone() returning own type
      const clone = cls.getMethods().find((m) => m.getName() === "clone");
      const cloneRt = clone?.getReturnTypeNode()?.getText() ?? "";
      if (clone !== undefined && typeMentionsClass(cloneRt, name)) {
        signals++;
        evidence.push(`clone() returns ${name}`);
      }

      // 2) copy-constructor: at least one ctor param has type mentioning name
      const ctor = cls.getConstructors()[0];
      const copyCtor = (ctor?.getParameters() ?? []).some((p) => {
        const t = p.getTypeNode()?.getText() ?? "";
        return typeMentionsClass(t, name);
      });
      if (copyCtor) {
        signals++;
        evidence.push(
          "constructor accepts a parameter mentioning the class type (copy-ctor idiom)",
        );
      }

      // 3) clone() body constructs `new ClassName(...)`
      if (clone !== undefined) {
        const body = clone.getBodyText() ?? "";
        const newExpr = new RegExp(`new\\s+${escapeRegExp(name)}\\s*\\(`);
        if (newExpr.test(body)) {
          signals++;
          evidence.push(`clone() calls new ${name}(...)`);
        }
      }

      // 4) constructor body assigns fields from a `source` parameter
      if (ctor !== undefined) {
        const body = ctor.getBodyText() ?? "";
        // At least two `this.X = source.X;` shaped lines (Vinis ==2 to
        // avoid coincidental single-line assignments).
        const matches = body.match(/this\.\w+\s*=\s*\w+\.\w+/g);
        if (matches !== null && matches.length >= 2) {
          signals++;
          evidence.push(
            `constructor copies ${matches.length} field(s) from its parameter`,
          );
        }
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "PROTOTYPE",
            className: name,
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
