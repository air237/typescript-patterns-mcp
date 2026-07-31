/**
 * Recognises the Facade pattern.
 *
 * Signals (each 0.25):
 *   1. There is a class whose name ends with `Facade`, or a class
 *      that owns >=3 instance fields, each typed as a different
 *      locally-declared class (the subsystems).
 *   2. Those subsystem classes are module-private (not exported)
 *      — the direct analogue of Java package-private visibility
 *      and a strong marker of the pattern.
 *   3. The facade has at least one `public` method (default is
 *      public in TS).
 *   4. The facade's public method calls into the subsystem fields
 *      via `this.<subsystem>.<method>()`.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { instanceFields, isExported, startLine } from "./detectorHelpers.js";

export class FacadeDetector implements PatternDetector {
  readonly pattern = "FACADE" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    const classes = sourceFile.getClasses();
    const localClassNames = new Map(
      classes.map((c) => [c.getName() ?? "", c]),
    );

    for (const facade of classes) {
      const name = facade.getName();
      if (name === undefined) continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) name hint OR many subsystem fields
      const nameEndsFacade = name.endsWith("Facade") && name !== "Facade";
      const subsystemFields = instanceFields(facade)
        .filter((p) => {
          const t = p.getTypeNode()?.getText() ?? "";
          const cls = localClassNames.get(t);
          return cls !== undefined && cls !== facade;
        });
      if (nameEndsFacade) {
        signals++;
        evidence.push(`class name ends with 'Facade' (${name})`);
      } else if (subsystemFields.length >= 3) {
        signals++;
        evidence.push(
          `owns ${subsystemFields.length} distinct subsystem-class-typed fields`,
        );
      }

      // 2) subsystem classes are module-private (not exported)
      const privateSubsystems = subsystemFields.filter((p) => {
        const t = p.getTypeNode()?.getText() ?? "";
        const cls = localClassNames.get(t);
        return cls !== undefined && !isExported(cls);
      });
      if (privateSubsystems.length >= 2) {
        signals++;
        evidence.push(
          `${privateSubsystems.length} subsystem classes are module-private (not exported)`,
        );
      }

      // 3) facade has at least one non-private method
      const publicMethods = facade
        .getMethods()
        .filter((m) => !m.hasModifier(SyntaxKind.PrivateKeyword));
      if (publicMethods.length >= 1) {
        signals++;
        evidence.push(
          `${publicMethods.length} public method(s) form the simplified surface`,
        );
      }

      // 4) at least one public method drives >=2 subsystems
      const drivesSubsystems = publicMethods.some((m) => {
        const body = m.getBodyText() ?? "";
        let called = 0;
        for (const field of subsystemFields) {
          const re = new RegExp(
            `this\\.[#_]?${field.getName()}\\s*\\.\\s*\\w+\\s*\\(`,
          );
          if (re.test(body)) called++;
          if (called >= 2) break;
        }
        return called >= 2;
      });
      if (drivesSubsystems) {
        signals++;
        evidence.push(
          "a public method drives ≥2 subsystems in one call",
        );
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "FACADE",
            className: name,
            startLine: startLine(facade),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
