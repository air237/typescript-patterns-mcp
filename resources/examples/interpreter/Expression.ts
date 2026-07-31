import { type Context } from "./Context.js";

/**
 * AST node interface — every expression can be evaluated against a Context.
 */
export interface Expression {
  evaluate(ctx: Context): boolean;
}
