/**
 * Recognises the Bridge pattern.
 *
 * Signals (each 0.25):
 *   1. There is an `abstract` class (the Abstraction).
 *   2. It takes an interface-typed argument in its constructor
 *      (the Implementor slot).
 *   3. That constructor argument is stored in a `readonly` field
 *      (composition, not inheritance).
 *   4. There are >=2 concrete subclasses of the abstraction AND
 *      >=2 concrete implementors of the Implementor interface
 *      (both hierarchy sides vary independently — the defining
 *      trait of the pattern).
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { instanceFields, isAbstractClass, startLine } from "./detectorHelpers.js";

export class BridgeDetector implements PatternDetector {
  readonly pattern = "BRIDGE" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    const classes = sourceFile.getClasses();
    const interfaces = sourceFile.getInterfaces();

    for (const abstraction of classes) {
      const name = abstraction.getName();
      if (name === undefined || !isAbstractClass(abstraction)) continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) abstract class
      signals++;
      evidence.push("class is abstract (candidate Abstraction)");

      // 2 + 3) constructor takes an interface-typed param and stores it readonly
      let implementorType: string | null = null;
      const ctor = abstraction.getConstructors()[0];
      if (ctor !== undefined) {
        for (const p of ctor.getParameters()) {
          const t = p.getTypeNode()?.getText() ?? "";
          const iface = interfaces.find((i) => i.getName() === t);
          if (iface !== undefined) {
            implementorType = t;
            signals++;
            evidence.push(
              `constructor takes an interface-typed param (${t})`,
            );
            // Parameter property with readonly modifier?
            const isReadonlyParam = p.hasModifier?.(SyntaxKind.ReadonlyKeyword);
            if (isReadonlyParam === true) {
              signals++;
              evidence.push(
                `the ${t} parameter is a readonly parameter property (composition)`,
              );
            } else {
              // Fall back to instance-property lookup on the class.
              const readonlyField = instanceFields(abstraction)
                .some((prop) => {
                  const pt = prop.getTypeNode()?.getText() ?? "";
                  const isReadonly =
                    prop.hasModifier?.(SyntaxKind.ReadonlyKeyword) ?? false;
                  return pt === t && isReadonly;
                });
              if (readonlyField) {
                signals++;
                evidence.push(
                  `a readonly ${t} instance field stores the implementor`,
                );
              }
            }
            break;
          }
        }
      }

      // 4) >=2 concrete subclasses AND >=2 concrete implementors
      const concreteSubclasses = classes.filter(
        (c) =>
          c.getExtends()?.getText() === name && !isAbstractClass(c),
      );
      if (implementorType !== null) {
        const concreteImplementors = classes.filter((c) =>
          c
            .getImplements()
            .some((i) => i.getText() === implementorType),
        );
        if (
          concreteSubclasses.length >= 2 &&
          concreteImplementors.length >= 2
        ) {
          signals++;
          evidence.push(
            `${concreteSubclasses.length} refined abstractions × ${concreteImplementors.length} concrete implementors`,
          );
        }
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "BRIDGE",
            className: name,
            startLine: startLine(abstraction),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
