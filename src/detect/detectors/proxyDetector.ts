/**
 * Recognises the Proxy pattern.
 *
 * The Proxy shape overlaps significantly with Decorator, so this
 * detector uses a **name heuristic** to stay out of Decorator's lane:
 * only classes whose name ends with `Proxy` or contains the words
 * `Cache`, `Lazy`, `Auth`, `Remote`, `Logging` (Proxy variants
 * from the GoF catalogue) are considered.
 *
 * Signals (each 0.25):
 *   1. Name matches the Proxy naming heuristic AND the class
 *      implements an interface (the shared Subject surface).
 *   2. It has a `readonly` field of the same interface type
 *      (the real subject).
 *   3. Some method delegates to the real subject
 *      (`this.<subject>.<method>()`).
 *   4. The delegate call is GATED by a guard (a caching / lazy-init
 *      / access-check `if`), which distinguishes Proxy from
 *      Decorator (a decorator ALWAYS delegates; a proxy MAY
 *      short-circuit).
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { detectedPattern, type DetectedPattern } from "../detectedPattern.js";
import { type PatternDetector } from "../patternDetector.js";
import { instanceFields, startLine } from "./detectorHelpers.js";

const PROXY_NAME_HINT =
  /(Proxy|Cache|Cached|Lazy|Auth|Authenticated|Remote|Logging|Logged)/i;

export class ProxyDetector implements PatternDetector {
  readonly pattern = "PROXY" as const;

  detect(sourceFile: SourceFile): readonly DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const proxy of sourceFile.getClasses()) {
      const name = proxy.getName();
      if (name === undefined) continue;
      if (!PROXY_NAME_HINT.test(name)) continue;

      const evidence: string[] = [];
      let signals = 0;

      // 1) name hint AND implements interface
      const targetIface = proxy.getImplements()[0];
      if (targetIface !== undefined) {
        signals++;
        evidence.push(
          `name matches proxy heuristic and implements ${targetIface.getText()}`,
        );
      }

      // 2) readonly field of the same type
      let subjectField: { name: string; type: string } | null = null;
      if (targetIface !== undefined) {
        const target = targetIface.getText();
        const field = instanceFields(proxy).find((p) => {
          const isReadonly = p.hasModifier?.(SyntaxKind.ReadonlyKeyword) ?? false;
          if (!isReadonly) return false;
          const t = p.getTypeNode()?.getText() ?? "";
          return t === target;
        });
        if (field !== undefined) {
          subjectField = { name: field.getName(), type: target };
          signals++;
          evidence.push(
            `readonly field '${subjectField.name}' holds the real ${target}`,
          );
        }
      }

      // 3) some method delegates to the real subject
      if (subjectField !== null) {
        const forward = new RegExp(
          `this\\.${subjectField.name}\\s*\\.\\s*\\w+\\s*\\(`,
        );
        const delegates = proxy
          .getMethods()
          .some((m) => forward.test(m.getBodyText() ?? ""));
        if (delegates) {
          signals++;
          evidence.push(
            `at least one method delegates to this.${subjectField.name}.x()`,
          );
        }

        // 4) at least one method GATES the delegation
        const gatedDelegate = proxy.getMethods().some((m) => {
          const body = m.getBodyText() ?? "";
          if (!forward.test(body)) return false;
          // Gate = if-check before the delegation, or early return before it.
          return /if\s*\(/.test(body) || /return\s+.*\?/.test(body);
        });
        if (gatedDelegate) {
          signals++;
          evidence.push(
            "delegate call is gated by an if/return (proxy-style short-circuit)",
          );
        }
      }

      if (signals >= 2) {
        hits.push(
          detectedPattern({
            pattern: "PROXY",
            className: name,
            startLine: startLine(proxy),
            confidence: signals * 0.25,
            evidence,
          }),
        );
      }
    }
    return hits;
  }
}
