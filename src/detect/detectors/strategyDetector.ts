/**
 * Recognises the Strategy pattern.
 *
 * Signals (each 0.25):
 *   1. There is an interface whose name ends in `Strategy`.
 *   2. That interface declares exactly ONE method (single abstract
 *      method — the callable-type-alias candidate).
 *   3. There is at least one class that `implements` that interface
 *      in the same file (concrete strategy).
 *   4. There is at least a SECOND class implementing the same
 *      interface — i.e. the strategies are actually interchangeable,
 *      which is the whole point of the pattern.
 */

import { type SourceFile } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { startLine } from "./detectorHelpers.js";

export class StrategyDetector implements PatternDetector {
  readonly pattern = "STRATEGY" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const iface of sourceFile.getInterfaces()) {
      const name = iface.getName();
      const evidence: string[] = [];
      let signals = 0;

      // 1) name ends with Strategy
      if (name.endsWith("Strategy") && name !== "Strategy") {
        signals++;
        evidence.push(`interface name ends with 'Strategy' (${name})`);
      }

      // 2) exactly one method (SAM interface)
      const methodCount = iface.getMethods().length;
      if (methodCount === 1) {
        signals++;
        evidence.push("interface declares exactly one method (SAM)");
      }

      // 3) at least one implementor
      const implementors = sourceFile
        .getClasses()
        .filter((c) => c.getImplements().some((i) => i.getText() === name));
      if (implementors.length >= 1) {
        signals++;
        evidence.push(
          `${implementors.length} class(es) implement ${name}`,
        );
      }

      // 4) at least a second implementor
      if (implementors.length >= 2) {
        signals++;
        evidence.push("multiple implementors are interchangeable");
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "STRATEGY",
            className: name,
            startLine: startLine(iface),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
