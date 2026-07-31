/**
 * Component — the surface every base notifier and every decorator implements.
 *
 * NOTE ON TERMINOLOGY. This is the classic GoF Decorator pattern. It has no
 * relation to TypeScript's `@decorator` language syntax (which is a
 * completely different feature).
 */
export interface Notifier {
  send(message: string): void;
}
