/**
 * Product interface. Both concrete buttons expose the same surface so the
 * abstract Dialog can render without caring about the concrete class.
 */
export interface Button {
  render(): string;
  onClick(handler: () => void): void;
}
