/**
 * Recognises the Flyweight pattern.
 *
 * Signals (each 0.25):
 *   1. There is a class with a `static` field of type `Map<…>` (the
 *      intrinsic-state cache).
 *   2. That class has a `static` method that reads from the map
 *      before creating a new instance (the sharing shape:
 *      `get / undefined check / new + set / return`).
 *   3. The class' fields are `readonly` (intrinsic state is
 *      immutable).
 *   4. The constructor calls `Object.freeze(this)` — the strongest
 *      TS signal of "shared, do not mutate" objects.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { instanceFields, startLine, staticFields } from "./detectorHelpers.js";

export class FlyweightDetector implements PatternDetector {
  readonly pattern = "FLYWEIGHT" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName();
      if (name === undefined) continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) static Map field
      const hasMapCache = staticFields(cls).some((p) => {
        const t = p.getTypeNode()?.getText() ?? "";
        return /^Map\s*<[^>]+>$/.test(t);
      });
      // Look also at siblings — Flyweight often uses a separate Factory class.
      let factoryClassName: string | null = null;
      if (!hasMapCache) {
        for (const other of sourceFile.getClasses()) {
          if (other === cls) continue;
          const hasMap = staticFields(other).some((p) => {
            const t = p.getTypeNode()?.getText() ?? "";
            return /Map\s*<[^>]+>/.test(t);
          });
          if (hasMap) {
            factoryClassName = other.getName() ?? null;
            break;
          }
        }
      }
      if (hasMapCache || factoryClassName !== null) {
        signals++;
        evidence.push(
          hasMapCache
            ? "class owns a static Map<...> cache"
            : `sibling class ${factoryClassName} owns a static Map<...> cache`,
        );
      }

      // 2) static method with cache-miss shape
      const scan = (): boolean => {
        const targetCls =
          factoryClassName === null
            ? cls
            : sourceFile
                .getClasses()
                .find((c) => c.getName() === factoryClassName);
        if (targetCls === undefined) return false;
        for (const m of targetCls.getStaticMethods()) {
          const body = m.getBodyText() ?? "";
          const looksLikeCache =
            /\.get\s*\(/.test(body) &&
            /===\s*undefined|===\s*null/.test(body) &&
            /new\s+\w+\s*\(/.test(body) &&
            /\.set\s*\(/.test(body);
          if (looksLikeCache) return true;
        }
        return false;
      };
      if (scan()) {
        signals++;
        evidence.push(
          "static method uses .get() → undefined check → new → .set() (cache-miss shape)",
        );
      }

      // 3) readonly fields
      const readonlyFields = instanceFields(cls).filter((p) =>
        p.hasModifier?.(SyntaxKind.ReadonlyKeyword) === true,
      );
      if (readonlyFields.length >= 2) {
        signals++;
        evidence.push(
          `${readonlyFields.length} readonly instance fields (intrinsic state is immutable)`,
        );
      }

      // 4) Object.freeze(this)
      const ctor = cls.getConstructors()[0];
      const body = ctor?.getBodyText() ?? "";
      if (/Object\.freeze\s*\(\s*this\s*\)/.test(body)) {
        signals++;
        evidence.push("constructor calls Object.freeze(this)");
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "FLYWEIGHT",
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
