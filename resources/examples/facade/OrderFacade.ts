/**
 * Facade — one call, `placeOrder(...)`, hides three internal subsystems
 * (inventory, payment, shipping) behind a stable surface. The subsystems
 * themselves are private module-level classes: not exported, therefore
 * unreachable from outside this module.
 */

class Inventory {
  private readonly stock = new Map<string, number>([
    ["sku-book", 3],
    ["sku-mug", 5],
  ]);

  reserve(sku: string, quantity: number): boolean {
    const available = this.stock.get(sku) ?? 0;
    if (available < quantity) return false;
    this.stock.set(sku, available - quantity);
    return true;
  }
}

class Payment {
  charge(customerId: string, amount: number): string {
    if (amount <= 0) throw new Error("amount must be positive");
    return `charge:${customerId}:${amount.toFixed(2)}`;
  }
}

class Shipping {
  book(sku: string, quantity: number, address: string): string {
    return `ship:${quantity}x${sku}->${address}`;
  }
}

export interface OrderSummary {
  chargeReceipt: string;
  shippingLabel: string;
}

export class OrderFacade {
  readonly #inventory = new Inventory();
  readonly #payment = new Payment();
  readonly #shipping = new Shipping();

  placeOrder(input: {
    customerId: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    address: string;
  }): OrderSummary {
    if (!this.#inventory.reserve(input.sku, input.quantity)) {
      throw new Error(`Out of stock: ${input.sku}`);
    }
    const chargeReceipt = this.#payment.charge(
      input.customerId,
      input.unitPrice * input.quantity,
    );
    const shippingLabel = this.#shipping.book(
      input.sku,
      input.quantity,
      input.address,
    );
    return { chargeReceipt, shippingLabel };
  }
}
