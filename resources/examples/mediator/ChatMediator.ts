/**
 * Mediator interface — Colleagues talk to each other exclusively through
 * this. No colleague ever holds a reference to another colleague.
 */
export interface ChatMediator {
  register(colleague: import("./Colleague.js").Colleague): void;
  send(from: import("./Colleague.js").Colleague, text: string): void;
}
