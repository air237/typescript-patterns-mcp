/**
 * Recognises the Abstract Factory pattern.
 *
 * Signals (each 0.25):
 *   1. There is an interface with >=2 methods, each returning a
 *      DIFFERENT interface / class declared in the same file
 *      (family of products).
 *   2. That interface's name ends with `Factory`.
 *   3. There is at least one class implementing that interface
 *      (concrete factory).
 *   4. The methods on the interface follow the naming heuristic
 *      `create*` — the most idiomatic Abstract Factory shape.
 */

import { type SourceFile } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { startLine } from "./detectorHelpers.js";

export class AbstractFactoryDetector implements PatternDetector {
  readonly pattern = "ABSTRACT_FACTORY" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    const interfaces = sourceFile.getInterfaces();
    const localTypeNames = new Set<string>([
      ...interfaces.map((i) => i.getName()),
      ...sourceFile.getClasses().map((c) => c.getName() ?? ""),
    ]);

    for (const factoryIface of interfaces) {
      const name = factoryIface.getName();
      const evidence: string[] = [];
      let signals = 0;

      const methods = factoryIface.getMethods();

      // 1) >=2 methods returning distinct locally-declared types
      const returnTypes = new Set<string>();
      for (const m of methods) {
        const rt = m.getReturnTypeNode()?.getText() ?? "";
        if (rt !== "" && localTypeNames.has(rt)) returnTypes.add(rt);
      }
      if (returnTypes.size >= 2) {
        signals++;
        evidence.push(
          `${returnTypes.size} distinct locally-typed return types: ${[...returnTypes].join(", ")}`,
        );
      }

      // 2) name ends with Factory
      if (name.endsWith("Factory") && name !== "Factory") {
        signals++;
        evidence.push(`interface name ends with 'Factory' (${name})`);
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

      // 4) methods named create*
      const createLike = methods.filter((m) =>
        /^create[A-Z]/.test(m.getName()),
      );
      if (createLike.length >= 2) {
        signals++;
        evidence.push(
          `${createLike.length} methods follow the create* naming convention`,
        );
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "ABSTRACT_FACTORY",
            className: name,
            startLine: startLine(factoryIface),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
