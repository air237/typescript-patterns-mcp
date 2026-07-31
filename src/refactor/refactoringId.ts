/**
 * Catalogue of the refactorings supported by this build.
 *
 * TypeScript sibling of `com.javapatterns.mcp.refactor.RefactoringId`,
 * adapted to TS idioms:
 *   - Java `final` → TS `readonly` (or `Object.freeze` for prototypes).
 *   - `singleton-add-read-resolve` (Java Serializable-specific)
 *     replaced by `singleton-freeze-instance` — the TS analogue that
 *     hardens a Singleton against accidental mutation.
 *   - `singleton-add-holder-idiom` and `strategy-add-functional-interface`
 *     have no TS equivalent (see COVERAGE.md → "Refactorings inventory";
 *     they stay ⚪ intentionally out of scope).
 */

import { type Pattern } from "../catalog/index.js";

export interface RefactoringInfo {
  readonly id: RefactoringId;
  readonly pattern: Pattern;
  readonly slug: string;
  readonly description: string;
}

export const REFACTORING_IDS = [
  "SINGLETON_MAKE_CTOR_PRIVATE",
  "SINGLETON_FREEZE_INSTANCE",
  "BUILDER_MAKE_FIELDS_READONLY",
  "OBSERVER_SNAPSHOT_ITERATION",
  "ADAPTER_MAKE_ADAPTEE_READONLY",
  "TEMPLATE_METHOD_MAKE_FINAL",
  "FACTORY_METHOD_RESTRICT_CREATOR_CTOR",
  "DECORATOR_MAKE_WRAPPED_READONLY",
  "STATE_MAKE_IMPLEMENTATIONS_FINAL",
  "COMMAND_MAKE_IMPLEMENTATIONS_FINAL",
  "COMPOSITE_MAKE_CHILDREN_READONLY",
  "PROXY_MAKE_SUBJECT_READONLY",
] as const;

export type RefactoringId = (typeof REFACTORING_IDS)[number];

const REFACTORING_INFO: Record<RefactoringId, RefactoringInfo> = {
  SINGLETON_MAKE_CTOR_PRIVATE: {
    id: "SINGLETON_MAKE_CTOR_PRIVATE",
    pattern: "SINGLETON",
    slug: "singleton-make-ctor-private",
    description:
      "Turn a public constructor of a Singleton-shaped class into a private constructor.",
  },
  SINGLETON_FREEZE_INSTANCE: {
    id: "SINGLETON_FREEZE_INSTANCE",
    pattern: "SINGLETON",
    slug: "singleton-freeze-instance",
    description:
      "Add `Object.freeze(this);` at the end of a Singleton-shaped class' constructor. TS analogue of the Java `singleton-add-read-resolve` recipe — hardens the shared instance against accidental mutation.",
  },
  BUILDER_MAKE_FIELDS_READONLY: {
    id: "BUILDER_MAKE_FIELDS_READONLY",
    pattern: "BUILDER",
    slug: "builder-make-fields-readonly",
    description:
      "Mark every non-readonly instance field of the Builder's product class as `readonly`.",
  },
  OBSERVER_SNAPSHOT_ITERATION: {
    id: "OBSERVER_SNAPSHOT_ITERATION",
    pattern: "OBSERVER",
    slug: "observer-snapshot-iteration",
    description:
      "Wrap the iterated collection of a publish-like method with `[...listeners]` so a listener that subscribes/unsubscribes during dispatch cannot corrupt the iteration.",
  },
  ADAPTER_MAKE_ADAPTEE_READONLY: {
    id: "ADAPTER_MAKE_ADAPTEE_READONLY",
    pattern: "ADAPTER",
    slug: "adapter-make-adaptee-readonly",
    description:
      "Mark the adaptee field of an Adapter-shaped class as `readonly` so the wrapped instance cannot be swapped mid-flight.",
  },
  TEMPLATE_METHOD_MAKE_FINAL: {
    id: "TEMPLATE_METHOD_MAKE_FINAL",
    pattern: "TEMPLATE_METHOD",
    slug: "template-method-make-final",
    description:
      "Emit a JSDoc `@final` marker on the template method AND freeze the class prototype method (`Object.freeze(<Class>.prototype.<method>)`) so subclasses cannot silently override the locked algorithm skeleton.",
  },
  FACTORY_METHOD_RESTRICT_CREATOR_CTOR: {
    id: "FACTORY_METHOD_RESTRICT_CREATOR_CTOR",
    pattern: "FACTORY_METHOD",
    slug: "factory-method-restrict-creator-ctor",
    description:
      "Demote public constructors of an abstract Creator (Factory-Method-shaped class) to `protected` so callers cannot bypass the factory method.",
  },
  DECORATOR_MAKE_WRAPPED_READONLY: {
    id: "DECORATOR_MAKE_WRAPPED_READONLY",
    pattern: "DECORATOR",
    slug: "decorator-make-wrapped-readonly",
    description:
      "Mark the wrapped (delegate) field of a Decorator-shaped class as `readonly`.",
  },
  STATE_MAKE_IMPLEMENTATIONS_FINAL: {
    id: "STATE_MAKE_IMPLEMENTATIONS_FINAL",
    pattern: "STATE",
    slug: "state-make-implementations-final",
    description:
      "Emit `Object.freeze(<StateClass>.prototype)` after every concrete State declaration so its behaviour cannot be monkey-patched at runtime.",
  },
  COMMAND_MAKE_IMPLEMENTATIONS_FINAL: {
    id: "COMMAND_MAKE_IMPLEMENTATIONS_FINAL",
    pattern: "COMMAND",
    slug: "command-make-implementations-final",
    description:
      "Emit `Object.freeze(<CommandClass>.prototype)` after every concrete Command declaration.",
  },
  COMPOSITE_MAKE_CHILDREN_READONLY: {
    id: "COMPOSITE_MAKE_CHILDREN_READONLY",
    pattern: "COMPOSITE",
    slug: "composite-make-children-readonly",
    description:
      "Mark the children collection field of a Composite-shaped class as `readonly` so callers cannot replace the whole array.",
  },
  PROXY_MAKE_SUBJECT_READONLY: {
    id: "PROXY_MAKE_SUBJECT_READONLY",
    pattern: "PROXY",
    slug: "proxy-make-subject-readonly",
    description:
      "Mark the delegate (real-subject) field of a Proxy-shaped class as `readonly`.",
  },
};

/** Returns the structural facts (pattern, slug, description) for a refactoring id. */
export function refactoringInfo(id: RefactoringId): RefactoringInfo {
  return REFACTORING_INFO[id];
}

/**
 * Resolve a `RefactoringId` from either the enum key or the public slug
 * (case-insensitive). Throws when nothing matches.
 */
export function refactoringFromKey(key: string | null | undefined): RefactoringId {
  if (key === null || key === undefined || key.trim() === "") {
    throw new Error("Refactoring id must be non-blank");
  }
  const normalized = key.trim();
  for (const id of REFACTORING_IDS) {
    if (id.toLowerCase() === normalized.toLowerCase()) return id;
    if (REFACTORING_INFO[id].slug === normalized.toLowerCase()) return id;
  }
  throw new Error(`Unknown refactoring id: '${key}'`);
}
