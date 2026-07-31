/**
 * Recognises the Mediator pattern.
 *
 * Signals (each 0.25):
 *   1. There is an interface whose name ends with `Mediator`.
 *   2. It exposes both `register(…)` and `send(…)` / `notify(…)`
 *      methods (registration + dispatch surface).
 *   3. There is an abstract class (the Colleague) that takes the
 *      mediator interface in its constructor and stores it in a
 *      `readonly` field. Colleagues talk ONLY to the mediator.
 *   4. There is at least one class implementing the Mediator
 *      interface (the concrete mediator).
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { instanceFields, startLine } from "./detectorHelpers.js";

export class MediatorDetector implements PatternDetector {
  readonly pattern = "MEDIATOR" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const iface of sourceFile.getInterfaces()) {
      const name = iface.getName();
      if (!name.endsWith("Mediator") || name === "Mediator") continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) name ends with Mediator
      signals++;
      evidence.push(`interface name ends with 'Mediator' (${name})`);

      // 2) register + dispatch methods
      const methodNames = iface.getMethods().map((m) => m.getName());
      const hasRegister = methodNames.includes("register");
      const hasDispatch =
        methodNames.includes("send") ||
        methodNames.includes("notify") ||
        methodNames.includes("dispatch");
      if (hasRegister && hasDispatch) {
        signals++;
        evidence.push(
          "declares register(…) + a dispatch method (send/notify/dispatch)",
        );
      }

      // 3) an abstract Colleague class holds the mediator readonly
      const colleague = sourceFile.getClasses().find((c) => {
        if (!c.hasModifier(SyntaxKind.AbstractKeyword)) return false;
        // Constructor parameter or explicit instance field of the mediator type
        const paramMatch = c
          .getConstructors()
          .flatMap((ctor) => ctor.getParameters())
          .some((p) => {
            const t = p.getTypeNode()?.getText() ?? "";
            const isReadonly = p.hasModifier?.(SyntaxKind.ReadonlyKeyword) ?? false;
            return t === name && isReadonly;
          });
        if (paramMatch) return true;
        return instanceFields(c).some((p) => {
          const t = p.getTypeNode()?.getText() ?? "";
          const isReadonly = p.hasModifier?.(SyntaxKind.ReadonlyKeyword) ?? false;
          return t === name && isReadonly;
        });
      });
      if (colleague !== undefined) {
        signals++;
        evidence.push(
          `${colleague.getName() ?? "<anon>"} holds a readonly ${name} (colleague base)`,
        );
      }

      // 4) concrete implementor
      const implementors = sourceFile
        .getClasses()
        .filter((c) => c.getImplements().some((i) => i.getText() === name));
      if (implementors.length >= 1) {
        signals++;
        evidence.push(
          `${implementors.length} class(es) implement ${name}`,
        );
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "MEDIATOR",
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
