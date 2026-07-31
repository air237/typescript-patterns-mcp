import { describe, expect, it } from "vitest";

import { type Severity } from "../../src/validate/severity.js";
import { PatternValidationEngine } from "../../src/validate/index.js";
import { type Pattern } from "../../src/catalog/index.js";

/**
 * The negative-case counterpart of `canonicalCleanTest.test.ts`. Each
 * pattern's validator runs on a deliberately broken snippet and must
 * emit at least one issue of the expected severity. If a validator
 * regresses to "no signal on obvious bugs", these tests turn red.
 */

const engine = PatternValidationEngine.getInstance();

function expectIssue(
  pattern: Pattern,
  source: string,
  minSeverity: Severity = "ERROR",
): void {
  const issues = engine.validateOne(source, pattern);
  // Filter to the exact expected severity to be strict.
  const matching = issues.filter((i) => i.severity === minSeverity);
  expect(
    matching.length,
    `expected at least one ${minSeverity} for ${pattern}, got ${issues
      .map((i) => `[${i.severity}] ${i.className}: ${i.issue}`)
      .join(" | ") || "none"}`,
  ).toBeGreaterThanOrEqual(1);
}

describe("Singleton anti-pattern", () => {
  it("public constructor is flagged as ERROR", () => {
    expectIssue(
      "SINGLETON",
      `export class Broken {
        static getInstance(): Broken { return new Broken(); }
        public constructor() {}
      }`,
    );
  });

  it("getInstance() without cache field is flagged as ERROR", () => {
    expectIssue(
      "SINGLETON",
      `export class Fresh {
        private constructor() {}
        static getInstance(): Fresh {
          return new Fresh();
        }
      }`,
    );
  });
});

describe("Builder anti-pattern", () => {
  it("product with public setter is flagged as ERROR", () => {
    expectIssue(
      "BUILDER",
      `export class Car {
        name = "";
        setName(n: string): void { this.name = n; }
      }
      export class CarBuilder {
        build(): Car { return new Car(); }
      }`,
    );
  });

  it("product with mutable non-readonly field is flagged as ERROR", () => {
    expectIssue(
      "BUILDER",
      `export class Car {
        name = "";
        constructor(n: string) { this.name = n; }
      }
      export class CarBuilder {
        build(): Car { return new Car("x"); }
      }`,
    );
  });
});

describe("Observer anti-pattern", () => {
  it("no unsubscribe method is flagged as ERROR", () => {
    expectIssue(
      "OBSERVER",
      `export class LeakyBus {
        readonly ls: Array<{ on(e: string): void }> = [];
        subscribe(l: { on(e: string): void }): void { this.ls.push(l); }
        publish(e: string): void { for (const l of this.ls) l.on(e); }
      }`,
    );
  });

  it("publish iterates live list is flagged as WARNING", () => {
    expectIssue(
      "OBSERVER",
      `export class SnapshotlessBus {
        readonly ls: Array<{ on(e: string): void }> = [];
        subscribe(l: { on(e: string): void }): () => void {
          this.ls.push(l);
          return () => {};
        }
        publish(e: string): void { for (const l of this.ls) l.on(e); }
      }`,
      "WARNING",
    );
  });
});

describe("Strategy anti-pattern", () => {
  it("empty strategy interface is flagged as ERROR", () => {
    expectIssue(
      "STRATEGY",
      `export interface EmptyStrategy {}
       export class A implements EmptyStrategy {}
       export class B implements EmptyStrategy {}`,
    );
  });
});

describe("FactoryMethod anti-pattern", () => {
  it("no concrete overriding subclass is flagged as WARNING", () => {
    expectIssue(
      "FACTORY_METHOD",
      `export interface Widget { render(): string; }
       export abstract class Dialog {
         useThis(): string { return this.createWidget().render(); }
         protected abstract createWidget(): Widget;
       }`,
      "WARNING",
    );
  });
});

describe("Adapter anti-pattern", () => {
  it("non-readonly adaptee field is flagged as ERROR", () => {
    expectIssue(
      "ADAPTER",
      `export interface Target { serve(): string; }
       export class LegacyThing { legacy(): string { return "l"; } }
       export class ThingAdapter implements Target {
         adaptee: LegacyThing;
         constructor(a: LegacyThing) { this.adaptee = a; }
         serve(): string { return this.adaptee.legacy(); }
       }`,
    );
  });
});

describe("TemplateMethod anti-pattern", () => {
  it("no @final marker and no freeze is flagged as INFO", () => {
    expectIssue(
      "TEMPLATE_METHOD",
      `export abstract class Pipe {
         run(): string { return this.step(); }
         protected abstract step(): string;
       }
       export class C extends Pipe {
         protected override step(): string { return "x"; }
       }`,
      "INFO",
    );
  });
});

describe("Decorator anti-pattern", () => {
  it("non-readonly wrapped field is flagged as ERROR", () => {
    expectIssue(
      "DECORATOR",
      `export interface Comp { run(): string; }
       export class Base implements Comp { run(): string { return "b"; } }
       export class Deco implements Comp {
         wrapped: Comp;
         constructor(c: Comp) { this.wrapped = c; }
         run(): string { return this.wrapped.run() + "+"; }
       }`,
    );
  });
});

describe("State anti-pattern", () => {
  it("public state field is flagged as ERROR", () => {
    expectIssue(
      "STATE",
      `export interface MyState { name: string; next(): MyState; }
       export class Ctx {
         state: MyState = { name: "a", next() { return this; } };
         tick(): void { this.state = this.state.next(); }
       }`,
    );
  });
});

describe("Command anti-pattern", () => {
  it("interface missing execute() is flagged as ERROR", () => {
    expectIssue(
      "COMMAND",
      `export interface FooCommand {
         someOtherMethod(): void;
       }`,
    );
  });
});

describe("Composite anti-pattern", () => {
  it("children field not readonly / not #private is flagged as ERROR", () => {
    expectIssue(
      "COMPOSITE",
      `export interface Comp { size(): number; }
       export class Leaf implements Comp { size(): number { return 1; } }
       export class Box implements Comp {
         children: Comp[] = [];
         size(): number { let s = 0; for (const c of this.children) s += c.size(); return s; }
       }`,
    );
  });
});

describe("Proxy anti-pattern", () => {
  it("non-readonly real subject is flagged as ERROR", () => {
    expectIssue(
      "PROXY",
      `export interface Service { fetch(k: string): string; }
       export class RealService implements Service { fetch(k: string): string { return k; } }
       export class CachingServiceProxy implements Service {
         subject: Service;
         constructor(s: Service) { this.subject = s; }
         fetch(k: string): string { return this.subject.fetch(k); }
       }`,
    );
  });
});

describe("AbstractFactory anti-pattern", () => {
  it("concrete class return type is flagged as WARNING", () => {
    expectIssue(
      "ABSTRACT_FACTORY",
      `export class ConcreteA { name = "a"; }
       export class ConcreteB { name = "b"; }
       export interface UiFactory {
         createA(): ConcreteA;
         createB(): ConcreteB;
       }
       export class DefaultUiFactory implements UiFactory {
         createA(): ConcreteA { return new ConcreteA(); }
         createB(): ConcreteB { return new ConcreteB(); }
       }`,
      "WARNING",
    );
  });
});

describe("Bridge anti-pattern", () => {
  it("non-readonly implementor slot is flagged as ERROR", () => {
    expectIssue(
      "BRIDGE",
      `export interface Renderer { render(): string; }
       export class SvgRenderer implements Renderer { render(): string { return "svg"; } }
       export class RasterRenderer implements Renderer { render(): string { return "rast"; } }
       export abstract class Shape {
         impl: Renderer;
         constructor(r: Renderer) { this.impl = r; }
         abstract draw(): string;
       }
       export class Circle extends Shape { constructor(r: Renderer) { super(r); } draw(): string { return this.impl.render(); } }
       export class Square extends Shape { constructor(r: Renderer) { super(r); } draw(): string { return this.impl.render(); } }`,
    );
  });
});

describe("Facade anti-pattern", () => {
  it("subsystem field exposed as public is flagged as ERROR", () => {
    expectIssue(
      "FACADE",
      `class A { a(): string { return "a"; } }
       class B { b(): string { return "b"; } }
       class C { c(): string { return "c"; } }
       export class OrderFacade {
         a = new A();
         readonly #b = new B();
         readonly #c = new C();
         run(): string { return this.a.a() + this.#b.b() + this.#c.c(); }
       }`,
    );
  });
});

describe("Visitor anti-pattern", () => {
  it("broken double dispatch (accept doesn't call visitor.visit*(this)) is flagged as ERROR", () => {
    expectIssue(
      "VISITOR",
      `export interface Vis { visitCircle(s: Circle): string; }
       export interface Shape { accept(v: Vis): string; }
       export class Circle implements Shape {
         accept(v: Vis): string { return "wrong"; }
       }`,
    );
  });
});

describe("ChainOfResponsibility anti-pattern", () => {
  it("non-nullable handle() return type is flagged as ERROR", () => {
    expectIssue(
      "CHAIN_OF_RESPONSIBILITY",
      `export abstract class BadHandler {
         setNext(n: BadHandler): BadHandler { return n; }
         abstract handle(req: string): string;  // NOT nullable
       }
       export class First extends BadHandler {
         override handle(req: string): string { return "x"; }
       }`,
    );
  });
});

describe("Mediator anti-pattern", () => {
  it("colleague holding direct peer reference is flagged as ERROR", () => {
    expectIssue(
      "MEDIATOR",
      `export interface ChatMediator {
         register(c: Colleague): void;
         send(from: Colleague, text: string): void;
       }
       export abstract class Colleague {
         readonly received: string[] = [];
         constructor(readonly name: string, protected readonly mediator: ChatMediator) {}
         receive(from: Colleague, text: string): void { this.received.push(from.name + text); }
       }
       export class BadPeer extends Colleague {
         // Direct reference to another colleague — bypasses mediator.
         peer!: Colleague;
       }
       export class DefaultChatRoom implements ChatMediator {
         register(c: Colleague): void {}
         send(from: Colleague, text: string): void {}
       }`,
    );
  });
});
