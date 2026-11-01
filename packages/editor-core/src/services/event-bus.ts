/**
 * A minimal synchronous typed event bus. No RxJS — keeps the core neutral.
 */

import type {
  EditorEvent,
  EditorEventKind,
  EventOfKind,
  IDisposable,
  IEventBus,
} from './interfaces';

type AnyListener = (event: EditorEvent) => void;

export class EventBus implements IEventBus {
  private readonly listeners = new Map<EditorEventKind, Set<AnyListener>>();

  emit(event: EditorEvent): void {
    const set = this.listeners.get(event.kind);
    if (set === undefined) {
      return;
    }
    // Copy to tolerate listeners that unsubscribe during dispatch.
    for (const listener of [...set]) {
      listener(event);
    }
  }

  on<K extends EditorEventKind>(
    kind: K,
    listener: (event: EventOfKind<K>) => void,
  ): IDisposable {
    const set = this.listeners.get(kind) ?? new Set<AnyListener>();
    set.add(listener as AnyListener);
    this.listeners.set(kind, set);
    return {
      dispose: (): void => {
        set.delete(listener as AnyListener);
      },
    };
  }
}
