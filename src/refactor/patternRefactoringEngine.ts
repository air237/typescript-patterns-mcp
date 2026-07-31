/**
 * Wires the registered refactorings together.
 *
 * TypeScript sibling of `com.javapatterns.mcp.refactor.PatternRefactoringEngine`.
 *
 * The engine parses incoming sources with ts-morph and passes the
 * resulting SourceFile to the individual refactoring. Each refactoring
 * mutates the SourceFile in place; the engine reads `getFullText()`
 * after the mutation to build the `RefactoringResult`.
 *
 * Per-call isolation: every apply() creates a throwaway Project with
 * an in-memory filesystem so a mutation cannot leak into subsequent
 * calls.
 */

import { Project, ts, type SourceFile } from "ts-morph";

import { type PatternRefactoring } from "./patternRefactoring.js";
import { type RefactoringId } from "./refactoringId.js";
import { type RefactoringResult } from "./refactoringResult.js";

import { AdapterMakeAdapteeReadonly } from "./refactorings/adapterMakeAdapteeReadonly.js";
import { BuilderMakeFieldsReadonly } from "./refactorings/builderMakeFieldsReadonly.js";
import { CommandMakeImplementationsFinal } from "./refactorings/commandMakeImplementationsFinal.js";
import { CompositeMakeChildrenReadonly } from "./refactorings/compositeMakeChildrenReadonly.js";
import { DecoratorMakeWrappedReadonly } from "./refactorings/decoratorMakeWrappedReadonly.js";
import { FactoryMethodRestrictCreatorCtor } from "./refactorings/factoryMethodRestrictCreatorCtor.js";
import { ObserverSnapshotIteration } from "./refactorings/observerSnapshotIteration.js";
import { ProxyMakeSubjectReadonly } from "./refactorings/proxyMakeSubjectReadonly.js";
import { SingletonFreezeInstance } from "./refactorings/singletonFreezeInstance.js";
import { SingletonMakeCtorPrivate } from "./refactorings/singletonMakeCtorPrivate.js";
import { StateMakeImplementationsFinal } from "./refactorings/stateMakeImplementationsFinal.js";
import { TemplateMethodMakeFinal } from "./refactorings/templateMethodMakeFinal.js";

export class PatternRefactoringEngine {
  private readonly byId: ReadonlyMap<RefactoringId, PatternRefactoring>;

  private constructor(byId: Map<RefactoringId, PatternRefactoring>) {
    this.byId = byId;
  }

  private static _instance: PatternRefactoringEngine | null = null;

  static getInstance(): PatternRefactoringEngine {
    if (PatternRefactoringEngine._instance === null) {
      const map = new Map<RefactoringId, PatternRefactoring>();
      const register = (r: PatternRefactoring): void => {
        if (map.has(r.id)) {
          throw new Error(`Duplicate refactoring registered: ${r.id}`);
        }
        map.set(r.id, r);
      };
      register(new SingletonMakeCtorPrivate());
      register(new SingletonFreezeInstance());
      register(new BuilderMakeFieldsReadonly());
      register(new ObserverSnapshotIteration());
      register(new AdapterMakeAdapteeReadonly());
      register(new TemplateMethodMakeFinal());
      register(new FactoryMethodRestrictCreatorCtor());
      register(new DecoratorMakeWrappedReadonly());
      register(new StateMakeImplementationsFinal());
      register(new CommandMakeImplementationsFinal());
      register(new CompositeMakeChildrenReadonly());
      register(new ProxyMakeSubjectReadonly());
      PatternRefactoringEngine._instance = new PatternRefactoringEngine(map);
    }
    return PatternRefactoringEngine._instance;
  }

  /** Set of refactoring ids this build supports. */
  supported(): readonly RefactoringId[] {
    return [...this.byId.keys()];
  }

  /**
   * Apply the given refactoring to a source string.
   *
   * @throws RefactoringError if the source does not parse, or the
   *         refactoring id is unknown, or the refactoring itself
   *         crashes.
   */
  apply(source: string, id: RefactoringId): RefactoringResult {
    const r = this.byId.get(id);
    if (r === undefined) {
      throw new RefactoringError(`No refactoring registered for id ${id}`);
    }

    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        allowJs: false,
      },
    });
    let sourceFile: SourceFile;
    try {
      sourceFile = project.createSourceFile("__source__.ts", source, {
        overwrite: true,
      });
    } catch (e) {
      throw new RefactoringError(
        `Source failed to parse: ${(e as Error).message}`,
      );
    }

    try {
      return r.apply(sourceFile);
    } catch (e) {
      throw new RefactoringError(
        `Refactoring ${id} crashed: ${(e as Error).message}`,
      );
    }
  }
}

/** Failure during a refactoring — unparseable input or crashing rewrite. */
export class RefactoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefactoringError";
  }
}

/** @internal Test-only reset hook. */
export function _resetPatternRefactoringEngineForTests(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (PatternRefactoringEngine as any)._instance = null;
}
