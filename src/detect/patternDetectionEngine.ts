/**
 * Wires the registered {@link PatternDetector}s together.
 *
 * TypeScript sibling of `com.javapatterns.mcp.detect.PatternDetectionEngine`.
 *
 * Analysis modes:
 *   - `detect(source)` — single compilation unit. Throws on parse failure.
 *   - `detectAll(sourcesByLabel)` — many compilation units in one call;
 *     per-file errors are collected (never thrown) so a bad file does
 *     not sink a batch. Used for directory- and project-wide scans.
 *
 * ts-morph implementation notes:
 *   - Every call creates a fresh, isolated `Project` with an in-memory
 *     file system so previous calls' sources cannot contaminate the
 *     current analysis.
 *   - The parser is set to the same strict configuration as the
 *     `examples/` and generator tests use (`strict`, `verbatimModuleSyntax`,
 *     etc.), so anything that type-checks under `pattern_examples` also
 *     parses cleanly here.
 */

import { Project, ts, type SourceFile } from "ts-morph";

import { PATTERNS, type Pattern } from "../catalog/index.js";
import { type DetectedPattern } from "./detectedPattern.js";
import { type PatternDetector } from "./patternDetector.js";

// ─── all 23 detectors ─────────────────────────────────────────────────

import { AbstractFactoryDetector } from "./detectors/abstractFactoryDetector.js";
import { AdapterDetector } from "./detectors/adapterDetector.js";
import { BridgeDetector } from "./detectors/bridgeDetector.js";
import { BuilderDetector } from "./detectors/builderDetector.js";
import { ChainOfResponsibilityDetector } from "./detectors/chainOfResponsibilityDetector.js";
import { CommandDetector } from "./detectors/commandDetector.js";
import { CompositeDetector } from "./detectors/compositeDetector.js";
import { DecoratorDetector } from "./detectors/decoratorDetector.js";
import { FacadeDetector } from "./detectors/facadeDetector.js";
import { FactoryMethodDetector } from "./detectors/factoryMethodDetector.js";
import { FlyweightDetector } from "./detectors/flyweightDetector.js";
import { InterpreterDetector } from "./detectors/interpreterDetector.js";
import { IteratorDetector } from "./detectors/iteratorDetector.js";
import { MediatorDetector } from "./detectors/mediatorDetector.js";
import { MementoDetector } from "./detectors/mementoDetector.js";
import { ObserverDetector } from "./detectors/observerDetector.js";
import { PrototypeDetector } from "./detectors/prototypeDetector.js";
import { ProxyDetector } from "./detectors/proxyDetector.js";
import { SingletonDetector } from "./detectors/singletonDetector.js";
import { StateDetector } from "./detectors/stateDetector.js";
import { StrategyDetector } from "./detectors/strategyDetector.js";
import { TemplateMethodDetector } from "./detectors/templateMethodDetector.js";
import { VisitorDetector } from "./detectors/visitorDetector.js";

// ─── public shapes ────────────────────────────────────────────────────

export interface FileDetection {
  readonly file: string;
  readonly detection: DetectedPattern;
}

export interface FileError {
  readonly file: string;
  readonly message: string;
}

export interface BatchResult {
  readonly detections: readonly FileDetection[];
  readonly errors: readonly FileError[];
  readonly filesAnalyzed: number;
}

// ─── engine ───────────────────────────────────────────────────────────

export class PatternDetectionEngine {
  private readonly detectors: readonly PatternDetector[];

  private constructor(detectors: readonly PatternDetector[]) {
    this.detectors = detectors;
  }

  private static _instance: PatternDetectionEngine | null = null;

  static getInstance(): PatternDetectionEngine {
    PatternDetectionEngine._instance ??= new PatternDetectionEngine([
      new SingletonDetector(),
      new BuilderDetector(),
      new FactoryMethodDetector(),
      new StrategyDetector(),
      new ObserverDetector(),
      new CompositeDetector(),
      new AdapterDetector(),
      new DecoratorDetector(),
      new ProxyDetector(),
      new TemplateMethodDetector(),
      new StateDetector(),
      new CommandDetector(),
      new AbstractFactoryDetector(),
      new BridgeDetector(),
      new FacadeDetector(),
      new VisitorDetector(),
      new ChainOfResponsibilityDetector(),
      new MediatorDetector(),
      new PrototypeDetector(),
      new FlyweightDetector(),
      new InterpreterDetector(),
      new IteratorDetector(),
      new MementoDetector(),
    ]);
    return PatternDetectionEngine._instance;
  }

  /** Set of patterns the engine has a detector for. */
  supportedPatterns(): readonly Pattern[] {
    const s = new Set<Pattern>();
    for (const d of this.detectors) s.add(d.pattern);
    // Emit in declaration order for stable output.
    return PATTERNS.filter((p) => s.has(p));
  }

  /**
   * Parse and detect patterns in a single source. Throws on parse failure.
   */
  detect(source: string): readonly DetectedPattern[] {
    const project = newProject();
    let sourceFile: SourceFile;
    try {
      sourceFile = project.createSourceFile("__source__.ts", source);
    } catch (e) {
      throw new DetectionError(
        `Source failed to parse: ${(e as Error).message}`,
      );
    }
    // Some ts-morph errors surface only when we ask for diagnostics.
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    // Note: we deliberately do NOT reject on diagnostics here — the
    // Java sibling also accepts anything JavaParser can build an AST
    // for. Semantic errors are the caller's problem, not the detector's.
    if (diagnostics === undefined) {
      // never happens; guard defensively.
      throw new DetectionError("ts-morph returned no diagnostics array");
    }
    return this.runDetectors(sourceFile, "<source>").sort(compareDetections);
  }

  /**
   * Parse and detect patterns across many sources in one call. Per-file
   * failures are collected in `errors` and do NOT abort the batch.
   */
  detectAll(sourcesByLabel: ReadonlyMap<string, string>): BatchResult {
    const detections: FileDetection[] = [];
    const errors: FileError[] = [];
    let analyzed = 0;

    for (const [label, source] of sourcesByLabel) {
      if (source === null || source === undefined) {
        errors.push({ file: label, message: "source content is null" });
        continue;
      }
      const project = newProject();
      let sourceFile: SourceFile;
      try {
        // Use the label directly as the virtual path so error messages
        // match the caller-provided label.
        const path = label === "<source>" ? "__source__.ts" : label;
        sourceFile = project.createSourceFile(path, source, { overwrite: true });
      } catch (e) {
        errors.push({
          file: label,
          message: `parse error: ${(e as Error).message}`,
        });
        continue;
      }
      analyzed++;
      try {
        for (const d of this.runDetectors(sourceFile, label)) {
          detections.push({ file: label, detection: d });
        }
      } catch (e) {
        errors.push({ file: label, message: (e as Error).message });
      }
    }

    detections.sort((a, b) => {
      const byFile = a.file.localeCompare(b.file);
      if (byFile !== 0) return byFile;
      return compareDetections(a.detection, b.detection);
    });

    return {
      detections: Object.freeze([...detections]),
      errors: Object.freeze([...errors]),
      filesAnalyzed: analyzed,
    };
  }

  private runDetectors(
    sourceFile: SourceFile,
    label: string,
  ): DetectedPattern[] {
    const hits: DetectedPattern[] = [];
    for (const d of this.detectors) {
      try {
        for (const hit of d.detect(sourceFile)) hits.push(hit);
      } catch (e) {
        throw new DetectionError(
          `Detector ${d.constructor.name} crashed on ${label}: ${(e as Error).message}`,
        );
      }
    }
    return hits;
  }
}

// ─── helpers ──────────────────────────────────────────────────────────

/**
 * Sort detections by pattern declaration order first, then by start line.
 * Matches the Java sibling's ordering rule.
 */
function compareDetections(
  a: DetectedPattern,
  b: DetectedPattern,
): number {
  const ai = PATTERNS.indexOf(a.pattern);
  const bi = PATTERNS.indexOf(b.pattern);
  if (ai !== bi) return ai - bi;
  return a.startLine - b.startLine;
}

/**
 * Build a fresh, throwaway ts-morph project with an in-memory filesystem
 * so per-call analyses stay isolated.
 */
function newProject(): Project {
  return new Project({
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
}

/** Failure during analysis — usually unparseable input. */
export class DetectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DetectionError";
  }
}

/** @internal Test-only: drop the cached engine so injection tests can rebuild. */
export function _resetPatternDetectionEngineForTests(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (PatternDetectionEngine as any)._instance = null;
}
