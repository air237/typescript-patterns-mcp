/**
 * Recognises the Chain of Responsibility pattern.
 *
 * Signals (each 0.25):
 *   1. There is an abstract class (or interface) whose name ends
 *      with `Handler`.
 *   2. It exposes a `setNext` method returning `Handler` (fluent
 *      chain builder).
 *   3. It exposes a `handle` method returning a nullable / union
 *      type (any handler may punt).
 *   4. There are >=2 concrete subclasses extending / implementing
 *      the Handler.
 */

import { type SourceFile } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { isAbstractClass, startLine } from "./detectorHelpers.js";

export class ChainOfResponsibilityDetector implements PatternDetector {
  readonly pattern = "CHAIN_OF_RESPONSIBILITY" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    const classes = sourceFile.getClasses();

    // Consider both abstract classes and interfaces whose name ends with Handler.
    const candidates: Array<{
      name: string;
      methods: { name: string; returnType: string }[];
      startLine: number;
    }> = [];

    for (const c of classes) {
      const n = c.getName();
      if (n === undefined || !isAbstractClass(c)) continue;
      if (!n.endsWith("Handler")) continue;
      candidates.push({
        name: n,
        methods: c.getMethods().map((m) => ({
          name: m.getName(),
          returnType: m.getReturnTypeNode()?.getText() ?? "",
        })),
        startLine: startLine(c),
      });
    }
    for (const iface of sourceFile.getInterfaces()) {
      const n = iface.getName();
      if (!n.endsWith("Handler")) continue;
      candidates.push({
        name: n,
        methods: iface.getMethods().map((m) => ({
          name: m.getName(),
          returnType: m.getReturnTypeNode()?.getText() ?? "",
        })),
        startLine: startLine(iface),
      });
    }

    for (const cand of candidates) {
      const evidence: string[] = [];
      let signals = 0;

      // 1) name ends with Handler
      signals++;
      evidence.push(`name ends with 'Handler' (${cand.name})`);

      // 2) setNext method returning Handler
      const setNext = cand.methods.find((m) => m.name === "setNext");
      if (setNext !== undefined && setNext.returnType.includes(cand.name)) {
        signals++;
        evidence.push(`setNext() returns ${cand.name} (fluent chain builder)`);
      }

      // 3) handle method returning nullable
      const handle = cand.methods.find((m) => m.name === "handle");
      if (
        handle !== undefined &&
        /\bnull\b|\|\s*null|\?\s*$|\bundefined\b/.test(handle.returnType)
      ) {
        signals++;
        evidence.push(
          `handle() returns a nullable / union type (${handle.returnType}) — punt-friendly`,
        );
      }

      // 4) >=2 concrete subclasses
      const concreteSubclasses = classes.filter((c) => {
        const ext = c.getExtends()?.getText();
        if (ext === cand.name) return !isAbstractClass(c);
        return c.getImplements().some((i) => i.getText() === cand.name);
      });
      if (concreteSubclasses.length >= 2) {
        signals++;
        evidence.push(
          `${concreteSubclasses.length} concrete handler subclasses`,
        );
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "CHAIN_OF_RESPONSIBILITY",
            className: cand.name,
            startLine: cand.startLine,
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
