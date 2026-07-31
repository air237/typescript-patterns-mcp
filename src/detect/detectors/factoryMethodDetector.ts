/**
 * Recognises the Factory Method pattern.
 *
 * Signals (each 0.25):
 *   1. There is an `abstract` class (the Creator).
 *   2. The Creator has an `abstract` method returning a type (the
 *      factory method), and the return type is either an interface
 *      or another class declared in the same file (the Product).
 *   3. The Creator has at least one non-abstract method that CALLS
 *      the factory method (`this.<factoryMethod>(...)`) — the
 *      template hook that drives the whole pattern.
 *   4. There is at least one concrete subclass of the Creator in the
 *      same file (a Concrete Creator).
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { isAbstractClass, startLine } from "./detectorHelpers.js";

export class FactoryMethodDetector implements PatternDetector {
  readonly pattern = "FACTORY_METHOD" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    const classes = sourceFile.getClasses();
    const interfaces = sourceFile.getInterfaces();

    for (const creator of classes) {
      const name = creator.getName();
      if (name === undefined) continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) abstract class
      if (isAbstractClass(creator)) {
        signals++;
        evidence.push("class is abstract (candidate Creator)");
      }

      // 2) abstract method returning a product type
      const abstractMethods = creator
        .getMethods()
        .filter((m) => m.hasModifier(SyntaxKind.AbstractKeyword));
      let productType: string | null = null;
      let factoryMethodName: string | null = null;
      for (const m of abstractMethods) {
        const rt = m.getReturnTypeNode()?.getText();
        if (rt === undefined || rt === "" || rt === "void") continue;
        const productIsClass = classes.some(
          (c) => c.getName() === rt && c.getName() !== name,
        );
        const productIsInterface = interfaces.some((i) => i.getName() === rt);
        if (productIsClass || productIsInterface) {
          productType = rt;
          factoryMethodName = m.getName();
          break;
        }
      }
      if (productType !== null && factoryMethodName !== null) {
        signals++;
        evidence.push(
          `abstract factory method ${factoryMethodName}() returns ${productType}`,
        );
      }

      // 3) non-abstract method that calls the factory method
      if (factoryMethodName !== null) {
        const consumerBody = creator
          .getMethods()
          .filter((m) => !m.hasModifier(SyntaxKind.AbstractKeyword))
          .some((m) => {
            const body = m.getBodyText() ?? "";
            return new RegExp(`this\\.${factoryMethodName}\\s*\\(`).test(body);
          });
        if (consumerBody) {
          signals++;
          evidence.push(
            `template method calls this.${factoryMethodName}() (drives the pattern)`,
          );
        }
      }

      // 4) at least one concrete subclass in the same file
      const concreteSubclass = classes.some((c) => {
        if (c === creator) return false;
        const ext = c.getExtends()?.getText();
        return ext === name && !isAbstractClass(c);
      });
      if (concreteSubclass) {
        signals++;
        evidence.push("at least one concrete subclass in the same file");
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "FACTORY_METHOD",
            className: name,
            startLine: startLine(creator),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
