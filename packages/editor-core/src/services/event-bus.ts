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

function isKind<K extends EditorEventKind>(event: EditorEvent, kind: K): event is EventOfKind<K> {
  return event.kind === kind;
}

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
    // Listeners are kept by kind; the guard gives this one its event type.
    const forward: AnyListener = event => {
      if (isKind(event, kind)) {
        listener(event);
      }
    };
    set.add(forward);
    this.listeners.set(kind, set);
    return {
      dispose: (): void => {
        set.delete(forward);
      },
    };
  }
}
