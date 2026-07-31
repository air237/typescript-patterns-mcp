/**
 * Runs every registered {@link PatternValidator} on a parsed source.
 *
 * TypeScript sibling of `com.javapatterns.mcp.validate.PatternValidationEngine`.
 *
 * Module-level lazy singleton. Every call materialises a throwaway
 * ts-morph `Project` with an in-memory filesystem so per-call
 * validations stay isolated.
 *
 * APIs:
 *   - `supportedPatterns()`     — Set of patterns with a validator.
 *   - `validateAll(source)`     — every supported pattern; throws on parse
 *                                 failure.
 *   - `validateOne(source, p)`  — focused report for one pattern.
 */

import { Project, ts, type SourceFile } from "ts-morph";

import { PATTERNS, type Pattern } from "../catalog/index.js";
import { type PatternValidator } from "./patternValidator.js";
import { severityRank } from "./severity.js";
import { type ValidationIssue } from "./validationIssue.js";

// ─── all 18 validators ────────────────────────────────────────────────

import { AbstractFactoryValidator } from "./validators/abstractFactoryValidator.js";
import { AdapterValidator } from "./validators/adapterValidator.js";
import { BridgeValidator } from "./validators/bridgeValidator.js";
import { BuilderValidator } from "./validators/builderValidator.js";
import { ChainOfResponsibilityValidator } from "./validators/chainOfResponsibilityValidator.js";
import { CommandValidator } from "./validators/commandValidator.js";
import { CompositeValidator } from "./validators/compositeValidator.js";
import { DecoratorValidator } from "./validators/decoratorValidator.js";
import { FacadeValidator } from "./validators/facadeValidator.js";
import { FactoryMethodValidator } from "./validators/factoryMethodValidator.js";
import { MediatorValidator } from "./validators/mediatorValidator.js";
import { ObserverValidator } from "./validators/observerValidator.js";
import { ProxyValidator } from "./validators/proxyValidator.js";
import { SingletonValidator } from "./validators/singletonValidator.js";
import { StateValidator } from "./validators/stateValidator.js";
import { StrategyValidator } from "./validators/strategyValidator.js";
import { TemplateMethodValidator } from "./validators/templateMethodValidator.js";
import { VisitorValidator } from "./validators/visitorValidator.js";

// ─── engine ───────────────────────────────────────────────────────────

export class PatternValidationEngine {
  private readonly validators: readonly PatternValidator[];

  private constructor(validators: readonly PatternValidator[]) {
    this.validators = validators;
  }

  private static _instance: PatternValidationEngine | null = null;

  static getInstance(): PatternValidationEngine {
    PatternValidationEngine._instance ??= new PatternValidationEngine([
      new SingletonValidator(),
      new BuilderValidator(),
      new ObserverValidator(),
      new StrategyValidator(),
      new FactoryMethodValidator(),
      new AdapterValidator(),
      new TemplateMethodValidator(),
      new DecoratorValidator(),
      new StateValidator(),
      new CommandValidator(),
      new CompositeValidator(),
      new ProxyValidator(),
      new AbstractFactoryValidator(),
      new BridgeValidator(),
      new FacadeValidator(),
      new VisitorValidator(),
      new ChainOfResponsibilityValidator(),
      new MediatorValidator(),
    ]);
    return PatternValidationEngine._instance;
  }

  /** Patterns this engine can validate. */
  supportedPatterns(): readonly Pattern[] {
    const s = new Set<Pattern>();
    for (const v of this.validators) s.add(v.pattern);
    return PATTERNS.filter((p) => s.has(p));
  }

  /**
   * Validate every supported pattern in the source.
   *
   * @param source the TS source to scrutinise
   * @returns all issues found, sorted by (pattern declaration order,
   *          severity ERROR < WARNING < INFO, line).
   * @throws ValidationError if the source does not parse.
   */
  validateAll(source: string): readonly ValidationIssue[] {
    const sourceFile = this.parse(source);
    const all: ValidationIssue[] = [];
    for (const v of this.validators) {
      try {
        for (const i of v.validate(sourceFile)) all.push(i);
      } catch (e) {
        throw new ValidationError(
          `Validator ${v.constructor.name} crashed: ${(e as Error).message}`,
        );
      }
    }
    return sortIssues(all);
  }

  /**
   * Validate a single pattern. Useful when the caller already knows
   * what they're looking for and wants a focused report.
   *
   * @throws ValidationError if the source does not parse OR if no
   *         validator exists for the requested pattern.
   */
  validateOne(source: string, pattern: Pattern): readonly ValidationIssue[] {
    const validator = this.validators.find((v) => v.pattern === pattern);
    if (validator === undefined) {
      throw new ValidationError(
        `No validator wired for pattern ${pattern}. ` +
          `Supported: ${this.supportedPatterns().join(", ")}`,
      );
    }
    const sourceFile = this.parse(source);
    return sortIssues([...validator.validate(sourceFile)]);
  }

  private parse(source: string): SourceFile {
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
    try {
      return project.createSourceFile("__source__.ts", source, { overwrite: true });
    } catch (e) {
      throw new ValidationError(
        `Source failed to parse: ${(e as Error).message}`,
      );
    }
  }
}

function sortIssues(issues: ValidationIssue[]): readonly ValidationIssue[] {
  issues.sort((a, b) => {
    const byPattern = PATTERNS.indexOf(a.pattern) - PATTERNS.indexOf(b.pattern);
    if (byPattern !== 0) return byPattern;
    const bySev = severityRank(a.severity) - severityRank(b.severity);
    if (bySev !== 0) return bySev;
    return a.line - b.line;
  });
  return Object.freeze([...issues]);
}

/** Failure during validation — usually an unparseable input. */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** @internal Test-only reset hook. */
export function _resetPatternValidationEngineForTests(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (PatternValidationEngine as any)._instance = null;
}
