/**
 * Shared helpers used across the pattern detectors. Keeping them here
 * avoids copy-pasting the same regex-escape / class-mention checks
 * into every single detector file, and gives a stable location for
 * detector authors to add small utilities without polluting the
 * detectors themselves.
 */

import {
  type ClassDeclaration,
  type InterfaceDeclaration,
  type Node,
  type ParameterDeclaration,
  type PropertyDeclaration,
  SyntaxKind,
} from "ts-morph";

/** Escape a string for safe interpolation into a `RegExp`. */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns true when the given type-text contains `className` as a whole
 * word. `typeMentionsClass("Foo | undefined", "Foo")` → true;
 * `typeMentionsClass("FooBar", "Foo")` → false.
 */
export function typeMentionsClass(
  typeText: string,
  className: string,
): boolean {
  if (typeText === "") return false;
  const re = new RegExp(
    `(^|[^A-Za-z0-9_])${escapeRegExp(className)}([^A-Za-z0-9_]|$)`,
  );
  return re.test(typeText);
}

/**
 * Returns the 1-based line number where a declaration starts. Wraps
 * ts-morph's `getStartLineNumber()` so we do not spread the same call
 * shape through every detector.
 */
export function startLine(node: {
  getStartLineNumber(): number;
}): number {
  return node.getStartLineNumber();
}

/** True if the class carries the `abstract` keyword. */
export function isAbstractClass(cls: ClassDeclaration): boolean {
  return cls.hasModifier(SyntaxKind.AbstractKeyword);
}

/** True if the class is declared `export`. */
export function isExported(cls: ClassDeclaration | InterfaceDeclaration): boolean {
  return cls.hasModifier(SyntaxKind.ExportKeyword);
}

/**
 * A shared abstraction over "class fields" that spans both explicit
 * property declarations AND parameter properties. Parameter properties
 * (`constructor(private readonly foo: Foo)`) are TS-idiomatic; most of
 * our canonical examples use them, so a detector that inspects only
 * `PropertyDeclaration` misses half the shapes it should recognise.
 *
 * The `Field` union exposes just the methods every detector actually
 * needs: name, type text, and modifier introspection.
 */
export type Field = PropertyDeclaration | ParameterDeclaration;

/**
 * Returns the instance-visible "fields" of a class: real
 * `PropertyDeclaration`s plus any constructor parameter properties
 * (`private/readonly/public/protected` parameters). Accessors are
 * filtered out because they lack `getTypeNode()`.
 */
export function instanceFields(cls: ClassDeclaration): Field[] {
  const out: Field[] = [];
  for (const p of cls.getInstanceProperties()) {
    if (p.getKind() === SyntaxKind.PropertyDeclaration) {
      out.push(p as PropertyDeclaration);
    }
  }
  // Parameter properties on the primary constructor.
  for (const ctor of cls.getConstructors()) {
    for (const param of ctor.getParameters()) {
      if (isParameterProperty(param)) out.push(param);
    }
  }
  return out;
}

/**
 * True when a constructor parameter is a "parameter property" — i.e. it
 * carries at least one of the `private / protected / public / readonly`
 * modifiers, which turns it into an implicit instance field.
 */
export function isParameterProperty(param: ParameterDeclaration): boolean {
  return (
    param.hasModifier(SyntaxKind.PrivateKeyword) ||
    param.hasModifier(SyntaxKind.ProtectedKeyword) ||
    param.hasModifier(SyntaxKind.PublicKeyword) ||
    param.hasModifier(SyntaxKind.ReadonlyKeyword)
  );
}

/** Static property declarations, sans accessors. */
export function staticFields(cls: ClassDeclaration): PropertyDeclaration[] {
  return cls
    .getStaticProperties()
    .filter(
      (p): p is PropertyDeclaration =>
        p.getKind() === SyntaxKind.PropertyDeclaration,
    );
}

/**
 * Walk the AST beneath `node` and collect every `NewExpression` whose
 * class name matches `className`. Useful for detectors that need to
 * know "does this method ever instantiate the enclosing class?".
 */
export function newExpressionsOfClass(node: Node, className: string): Node[] {
  const hits: Node[] = [];
  node.forEachDescendant((n) => {
    if (n.getKind() === SyntaxKind.NewExpression) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const expr = (n as any).getExpression?.() as Node | undefined;
      if (expr !== undefined && expr.getText() === className) {
        hits.push(n);
      }
    }
  });
  return hits;
}
