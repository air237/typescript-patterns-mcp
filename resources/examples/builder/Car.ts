/**
 * Immutable Car built via a fluent Builder.
 *
 * Pattern shape:
 *   - The Car has many optional fields with cross-field validation. A
 *     telescoping constructor would be unreadable, and a soup of setters
 *     would break immutability.
 *   - `Car.builder(...)` returns a fresh Builder holding required arguments;
 *     optional fields have chainable setters returning `this`.
 *   - `build()` validates cross-field invariants and constructs the frozen
 *     product.
 *   - The Car constructor is `private`, forcing callers through the builder.
 *
 * The Java sibling uses a static-nested Builder class. In TypeScript the
 * closest idiomatic shape is a separate exported class in the same module,
 * still coupled tightly to Car through a private constructor accessor. To
 * keep this file compilable in isolation without extra plumbing, the private
 * constructor is exposed to CarBuilder via a symbol-keyed factory function.
 */

// Module-private handshake: only CarBuilder can mint a Car.
const BUILDER_KEY: unique symbol = Symbol("Car.build");

export class Car {
  readonly seats: number;
  readonly engine: string;
  readonly gps: boolean;
  readonly tripComputer: boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private constructor(token: typeof BUILDER_KEY, data: any) {
    if (token !== BUILDER_KEY) {
      throw new Error("Use Car.builder(...) to construct a Car.");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as {
      seats: number;
      engine: string;
      gps: boolean;
      tripComputer: boolean;
    };
    this.seats = d.seats;
    this.engine = d.engine;
    this.gps = d.gps;
    this.tripComputer = d.tripComputer;
    Object.freeze(this);
  }

  static builder(seats: number, engine: string): CarBuilder {
    return new CarBuilder(seats, engine);
  }

  /** @internal — do not call from outside CarBuilder. */
  static _mint(data: {
    seats: number;
    engine: string;
    gps: boolean;
    tripComputer: boolean;
  }): Car {
    return new Car(BUILDER_KEY, data);
  }
}

export class CarBuilder {
  #gps = false;
  #tripComputer = false;

  constructor(
    private readonly seats: number,
    private readonly engine: string,
  ) {
    if (!Number.isInteger(seats) || seats < 1) {
      throw new Error(`seats must be a positive integer, got ${seats}`);
    }
    if (engine.trim() === "") {
      throw new Error("engine must be non-blank");
    }
  }

  withGps(gps = true): this {
    this.#gps = gps;
    return this;
  }

  withTripComputer(tripComputer = true): this {
    this.#tripComputer = tripComputer;
    return this;
  }

  build(): Car {
    // Cross-field validation goes here — trip computer requires GPS.
    if (this.#tripComputer && !this.#gps) {
      throw new Error(
        "Invalid Car: trip computer requires GPS (add .withGps() first).",
      );
    }
    return Car._mint({
      seats: this.seats,
      engine: this.engine,
      gps: this.#gps,
      tripComputer: this.#tripComputer,
    });
  }
}
