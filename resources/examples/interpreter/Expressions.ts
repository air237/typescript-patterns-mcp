import { type Context } from "./Context.js";
import { type Expression } from "./Expression.js";

/**
 * Terminal expression — resolves a named variable through the Context.
 */
export class Variable implements Expression {
  constructor(private readonly name: string) {}

  evaluate(ctx: Context): boolean {
    return ctx.lookup(this.name);
  }
}

/**
 * Non-terminal expression — logical AND of two sub-expressions.
 */
export class And implements Expression {
  constructor(
    private readonly left: Expression,
    private readonly right: Expression,
  ) {}

  evaluate(ctx: Context): boolean {
    return this.left.evaluate(ctx) && this.right.evaluate(ctx);
  }
}

/**
 * Non-terminal expression — logical OR of two sub-expressions.
 */
export class Or implements Expression {
  constructor(
    private readonly left: Expression,
    private readonly right: Expression,
  ) {}

  evaluate(ctx: Context): boolean {
    return this.left.evaluate(ctx) || this.right.evaluate(ctx);
  }
}
