import { type Component } from "./Component.js";

/**
 * Leaf — its cost is its own price.
 */
export class Product implements Component {
  constructor(private readonly price: number) {}

  cost(): number {
    return this.price;
  }
}
