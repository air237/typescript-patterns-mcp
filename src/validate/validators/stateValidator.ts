/**
 * Validates State pattern implementations.
 *
 * Rules:
 *   - ERROR   — the state field in the Context is not private
 *               (not `#state` and not `private`). Callers can then
 *               overwrite the state graph from outside.
 *   - WARNING — a concrete State implementation is itself `abstract`.
 *               States must be instantiable.
 *   - INFO    — the Context has no method that reassigns the state
 *               field via `this.state = this.state.next()`-shaped
 *               code. Without a transition, the graph is dead.
 *
 * Gate: an interface / abstract class whose name ends with `State`, plus
 * a context class in the same file that holds a field of that type.
 */

import { type SourceFile, SyntaxKind } from "ts-morph";

import { type ValidationIssue, validationIssue } from "../validationIssue.js";
import { type PatternValidator } from "../patternValidator.js";
import {
  instanceFields,
  startLine,
  typeMentionsClass,
} from "./validatorHelpers.js";

export class StateValidator implements PatternValidator {
  readonly pattern = "STATE" as const;

  validate(sourceFile: SourceFile): readonly ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const stateContracts = [
      ...sourceFile.getInterfaces().filter((i) => i.getName().endsWith("State")),
      ...sourceFile
        .getClasses()
        .filter((c) => c.getName()?.endsWith("State") === true),
    ];
    if (stateContracts.length === 0) return issues;

    for (const contract of stateContracts) {
      const stateType = contract.getName();
      if (stateType === undefined) continue;

      const context = sourceFile.getClasses().find((c) => {
        if (c.getName() === stateType) return false;
        return instanceFields(c).some((f) => {
          const t = f.getTypeNode()?.getText() ?? "";
          return typeMentionsClass(t, stateType);
        });
      });
      if (context === undefined) continue;

      const contextName = context.getName() ?? "<anon>";
      const contextLine = startLine(context);

      // ─── ERROR: state field is not private / #private ──────────
      const stateField = instanceFields(context).find((f) => {
        const t = f.getTypeNode()?.getText() ?? "";
        return typeMentionsClass(t, stateType);
      });
      if (stateField !== undefined) {
        const isPrivate =
          stateField.getName().startsWith("#") ||
          stateField.hasModifier?.(SyntaxKind.PrivateKeyword) === true;
        if (!isPrivate) {
          issues.push(
            validationIssue({
              pattern: "STATE",
              className: contextName,
              line: startLine(stateField),
              severity: "ERROR",
              issue: `Context ${contextName} exposes its state field ('${stateField.getName()}') as public — callers can overwrite the state graph.`,
              suggestion:
                "Rename to `#state` (ES private) or add the `private` modifier so only the context may rotate the state.",
            }),
          );
        }
      }

      // ─── WARNING: a concrete state class is abstract ───────────
      const abstractStateImpl = sourceFile.getClasses().find((c) => {
        if (c === context) return false;
        const implementsState = c
          .getImplements()
          .some((i) => i.getText() === stateType);
        const extendsState = c.getExtends()?.getText() === stateType;
        if (!implementsState && !extendsState) return false;
        return c.hasModifier(SyntaxKind.AbstractKeyword);
      });
      if (abstractStateImpl !== undefined) {
        issues.push(
          validationIssue({
            pattern: "STATE",
            className: abstractStateImpl.getName() ?? "<anon>",
            line: startLine(abstractStateImpl),
            severity: "WARNING",
            issue: `State implementation ${abstractStateImpl.getName() ?? "<anon>"} is \`abstract\` — states must be instantiable.`,
            suggestion:
              "Drop the `abstract` modifier or lift the abstract members to the base State interface.",
          }),
        );
      }

      // ─── INFO: context never rotates the state ────────────────
      const rotatesState = context.getMethods().some((m) => {
        const body = m.getBodyText() ?? "";
        return /this\.[#_]?\w+\s*=\s*this\.[#_]?\w+\s*\.\s*\w+\s*\(/.test(body);
      });
      if (!rotatesState) {
        issues.push(
          validationIssue({
            pattern: "STATE",
            className: contextName,
            line: contextLine,
            severity: "INFO",
            issue: `${contextName} never reassigns its state field via \`this.state = this.state.<transition>()\`.`,
            suggestion:
              "Add a transition method that rotates the state, otherwise the state graph is unreachable.",
          }),
        );
      }
    }
    return issues;
  }
}
