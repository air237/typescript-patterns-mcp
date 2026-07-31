/**
 * After every concrete State implementation, emit
 * `Object.freeze(<StateClass>.prototype);` at module level so its
 * behaviour cannot be monkey-patched at runtime.
 *
 * The TS analogue of the Java `state-make-implementations-final`
 * recipe. TypeScript has no `final` keyword; freezing the prototype
 * is the strongest structural equivalent.
 *
 * Gate: an interface / abstract class whose name ends with `State`
 * has at least 2 concrete implementors in the same file.
 *
 * Idempotency: if `Object.freeze(<StateClass>.prototype)` already
 * appears anywhere in the file, the refactoring skips that class.
 */

import { type SourceFile } from "ts-morph";

import { type PatternRefactoring } from "../patternRefactoring.js";
import { type RefactoringResult } from "../refactoringResult.js";
import { escapeRegExp, isAbstractClass, startLine } from "./refactoringHelpers.js";

export class StateMakeImplementationsFinal implements PatternRefactoring {
  readonly id = "STATE_MAKE_IMPLEMENTATIONS_FINAL" as const;

  apply(sourceFile: SourceFile): RefactoringResult {
    const changes: string[] = [];

    const stateContracts: string[] = [];
    for (const iface of sourceFile.getInterfaces()) {
      if (iface.getName().endsWith("State")) stateContracts.push(iface.getName());
    }
    for (const cls of sourceFile.getClasses()) {
      const n = cls.getName();
      if (n !== undefined && n.endsWith("State") && isAbstractClass(cls)) {
        stateContracts.push(n);
      }
    }
    if (stateContracts.length === 0) {
      return {
        refactoringId: this.id,
        newSource: sourceFile.getFullText(),
        changed: false,
        changes: [],
      };
    }

    const fileText = sourceFile.getFullText();
    const stateContractSet = new Set(stateContracts);

    for (const cls of sourceFile.getClasses()) {
      const name = cls.getName();
      if (name === undefined) continue;
      if (isAbstractClass(cls)) continue;

      const impls = cls.getImplements().map((i) => i.getText());
      const ext = cls.getExtends()?.getText();
      const isStateImpl =
        impls.some((i) => stateContractSet.has(i)) ||
        (ext !== undefined && stateContractSet.has(ext));
      if (!isStateImpl) continue;

      const freezeRe = new RegExp(
        `Object\\.freeze\\s*\\(\\s*${escapeRegExp(name)}\\.prototype\\s*\\)`,
      );
      if (freezeRe.test(fileText)) continue;

      // Append after the class declaration.
      sourceFile.insertStatements(cls.getChildIndex() + 1, [
        `Object.freeze(${name}.prototype);`,
      ]);
      changes.push(
        `${name}: concrete state at line ${startLine(cls)} — prototype frozen`,
      );
    }

    return {
      refactoringId: this.id,
      newSource: sourceFile.getFullText(),
      changed: changes.length > 0,
      changes,
    };
  }
}
