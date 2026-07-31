import { describe, expect, it } from "vitest";

import {
  PatternRefactoringEngine,
  refactoringInfo,
  type RefactoringId,
} from "../../src/refactor/index.js";

/**
 * The linchpin test for Phase 10. For each of the 12 refactorings, run
 * it on a deliberately broken snippet and assert:
 *
 *   1. The refactoring reports `changed === true` on the first pass.
 *   2. The changes list is non-empty.
 *   3. The rewritten `newSource` no longer matches the anti-pattern
 *      shape (the change actually took effect textually).
 *   4. Running the SAME refactoring on the rewritten source reports
 *      `changed === false` and returns the exact same source (idempotency).
 */

const engine = PatternRefactoringEngine.getInstance();

interface Case {
  id: RefactoringId;
  broken: string;
  // Regex that MUST match after the refactoring (proof it took effect).
  postCondition: RegExp;
  // Regex that MUST NOT match after the refactoring (anti-pattern gone).
  antiCondition?: RegExp;
}

const CASES: Case[] = [
  {
    id: "SINGLETON_MAKE_CTOR_PRIVATE",
    broken: `export class Broken {
      public constructor() {}
      static getInstance(): Broken { return new Broken(); }
    }`,
    postCondition: /private constructor/,
    antiCondition: /public constructor/,
  },
  {
    id: "SINGLETON_FREEZE_INSTANCE",
    broken: `export class Guard {
      static #instance: Guard | undefined;
      private constructor() {}
      static getInstance(): Guard {
        Guard.#instance ??= new Guard();
        return Guard.#instance;
      }
    }`,
    postCondition: /Object\.freeze\s*\(\s*this\s*\)/,
  },
  {
    id: "BUILDER_MAKE_FIELDS_READONLY",
    broken: `export class Pizza {
      constructor(public size: number, public topping: string) {}
    }
    export class PizzaBuilder {
      #size = 0;
      #topping = "";
      size(n: number): this { this.#size = n; return this; }
      topping(s: string): this { this.#topping = s; return this; }
      build(): Pizza { return new Pizza(this.#size, this.#topping); }
    }`,
    postCondition: /readonly\s+size/,
  },
  {
    id: "OBSERVER_SNAPSHOT_ITERATION",
    broken: `export class LiveBus {
      readonly #listeners: Array<{ on(x: string): void }> = [];
      subscribe(l: { on(x: string): void }): () => void {
        this.#listeners.push(l);
        return () => {};
      }
      publish(e: string): void {
        for (const l of this.#listeners) l.on(e);
      }
    }`,
    postCondition: /\[\.\.\.\s*this\.#listeners\s*\]/,
  },
  {
    id: "ADAPTER_MAKE_ADAPTEE_READONLY",
    broken: `export interface Target { serve(): string; }
    export class LegacyThing { legacy(): string { return "l"; } }
    export class ThingAdapter implements Target {
      adaptee: LegacyThing;
      constructor(a: LegacyThing) { this.adaptee = a; }
      serve(): string { return this.adaptee.legacy(); }
    }`,
    postCondition: /readonly\s+adaptee/,
  },
  {
    id: "TEMPLATE_METHOD_MAKE_FINAL",
    broken: `export abstract class Pipe {
      run(): string { return this.step(); }
      protected abstract step(): string;
    }
    export class C extends Pipe {
      protected override step(): string { return "x"; }
    }`,
    postCondition: /Object\.freeze\s*\(\s*Pipe\.prototype\.run\s*\)/,
  },
  {
    id: "FACTORY_METHOD_RESTRICT_CREATOR_CTOR",
    broken: `export interface Widget { render(): string; }
    export abstract class Dialog {
      public constructor() {}
      useThis(): string { return this.createWidget().render(); }
      protected abstract createWidget(): Widget;
    }
    export class HtmlWidget implements Widget { render(): string { return "w"; } }
    export class HtmlDialog extends Dialog {
      protected override createWidget(): Widget { return new HtmlWidget(); }
    }`,
    postCondition: /protected constructor/,
    antiCondition: /public constructor/,
  },
  {
    id: "DECORATOR_MAKE_WRAPPED_READONLY",
    broken: `export interface Comp { run(): string; }
    export class Base implements Comp { run(): string { return "b"; } }
    export class Deco implements Comp {
      wrapped: Comp;
      constructor(c: Comp) { this.wrapped = c; }
      run(): string { return this.wrapped.run() + "+"; }
    }`,
    postCondition: /readonly\s+wrapped/,
  },
  {
    id: "STATE_MAKE_IMPLEMENTATIONS_FINAL",
    broken: `export interface LightState { name: string; next(): LightState; }
    export class RedState implements LightState {
      readonly name = "red";
      next(): LightState { return new RedState(); }
    }
    export class GreenState implements LightState {
      readonly name = "green";
      next(): LightState { return new GreenState(); }
    }`,
    postCondition: /Object\.freeze\s*\(\s*RedState\.prototype\s*\)/,
  },
  {
    id: "COMMAND_MAKE_IMPLEMENTATIONS_FINAL",
    broken: `export interface AppendCommand { execute(): void; undo(): void; }
    export class DefaultAppendCommand implements AppendCommand {
      execute(): void {}
      undo(): void {}
    }`,
    postCondition: /Object\.freeze\s*\(\s*DefaultAppendCommand\.prototype\s*\)/,
  },
  {
    id: "COMPOSITE_MAKE_CHILDREN_READONLY",
    broken: `export interface Comp { size(): number; }
    export class Leaf implements Comp { size(): number { return 1; } }
    export class Box implements Comp {
      children: Comp[] = [];
      size(): number { let s = 0; for (const c of this.children) s += c.size(); return s; }
    }`,
    postCondition: /readonly\s+children/,
  },
  {
    id: "PROXY_MAKE_SUBJECT_READONLY",
    broken: `export interface Service { fetch(k: string): string; }
    export class RealService implements Service { fetch(k: string): string { return k; } }
    export class CachingServiceProxy implements Service {
      subject: Service;
      constructor(s: Service) { this.subject = s; }
      fetch(k: string): string { return this.subject.fetch(k); }
    }`,
    postCondition: /readonly\s+subject/,
  },
];

describe("each refactoring fixes its anti-pattern (12/12)", () => {
  for (const c of CASES) {
    const info = refactoringInfo(c.id);
    it(`${info.slug} rewrites the anti-pattern`, () => {
      const result = engine.apply(c.broken, c.id);
      expect(
        result.changed,
        `expected refactoring ${c.id} to CHANGE something. Changes: ${JSON.stringify(result.changes)}`,
      ).toBe(true);
      expect(result.changes.length).toBeGreaterThanOrEqual(1);
      expect(
        result.newSource,
        `postCondition ${c.postCondition} did not match new source`,
      ).toMatch(c.postCondition);
      if (c.antiCondition !== undefined) {
        expect(
          result.newSource,
          `antiCondition ${c.antiCondition} still present in new source`,
        ).not.toMatch(c.antiCondition);
      }
    });
  }
});

describe("each refactoring is idempotent (12/12)", () => {
  for (const c of CASES) {
    const info = refactoringInfo(c.id);
    it(`${info.slug} is a no-op on the already-fixed source`, () => {
      const first = engine.apply(c.broken, c.id);
      const second = engine.apply(first.newSource, c.id);
      expect(
        second.changed,
        `expected refactoring ${c.id} to be idempotent, but the second pass reported changes: ${JSON.stringify(second.changes)}`,
      ).toBe(false);
      expect(second.changes).toEqual([]);
      expect(second.newSource).toBe(first.newSource);
    });
  }
});
