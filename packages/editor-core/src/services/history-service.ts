/**
 * `HistoryService` — undo/redo stacks over reversible commands.
 *
 * It knows nothing about what commands do; it only re-runs `execute`/`undo`
 * against a `CommandContext` obtained from an injected provider. `transact`
 * groups several commands into one composite undo entry (e.g. a drag or paste).
 */

import { createDecorator } from '../di';
import type {
  CommandContext,
  IEditorCommand,
  IHistoryService,
} from './interfaces';
import { IEditorModeService, IEventBus } from './interfaces';

/** Supplies the context commands run against. Injected to avoid a cycle. */
export interface ICommandContextProvider {
  getContext(): CommandContext;
}
export const ICommandContextProvider =
  createDecorator<ICommandContextProvider>('commandContextProvider');

/** A composite command that runs several children as one history entry. */
class CompositeCommand implements IEditorCommand {
  readonly kind = 'composite';
  constructor(
    readonly label: string,
    private readonly children: readonly IEditorCommand[],
  ) {}
  execute(ctx: CommandContext): void {
    for (const child of this.children) {
      child.execute(ctx);
    }
  }
  undo(ctx: CommandContext): void {
    // Undo in reverse order.
    for (let i = this.children.length - 1; i >= 0; i -= 1) {
      const child = this.children[i];
      if (child !== undefined) {
        child.undo(ctx);
      }
    }
  }
}

export class HistoryService implements IHistoryService {
  private readonly undoStack: IEditorCommand[] = [];
  private readonly redoStack: IEditorCommand[] = [];

  /** When set, `push` collects into this batch instead of the undo stack. */
  private batch: IEditorCommand[] | null = null;

  constructor(
    @ICommandContextProvider private readonly provider: ICommandContextProvider,
    @IEventBus private readonly bus: IEventBus,
    @IEditorModeService private readonly mode: IEditorModeService,
  ) {}

  /** Read-only: nothing to undo or redo, since neither may change the graph. */
  canUndo(): boolean {
    return !this.mode.readOnly && this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return !this.mode.readOnly && this.redoStack.length > 0;
  }

  push(command: IEditorCommand): void {
    if (this.batch !== null) {
      this.batch.push(command);
      return;
    }
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.bus.emit({ kind: 'historyChanged' });
  }

  undo(): void {
    if (this.mode.readOnly) {
      return;
    }
    const command = this.undoStack.pop();
    if (command === undefined) {
      return;
    }
    command.undo(this.provider.getContext());
    this.redoStack.push(command);
    this.bus.emit({ kind: 'historyChanged' });
  }

  redo(): void {
    if (this.mode.readOnly) {
      return;
    }
    const command = this.redoStack.pop();
    if (command === undefined) {
      return;
    }
    command.execute(this.provider.getContext());
    this.undoStack.push(command);
    this.bus.emit({ kind: 'historyChanged' });
  }

  transact(label: string, fn: () => void): void {
    if (this.batch !== null) {
      // Already batching; just run inline (flat composition).
      fn();
      return;
    }
    const batch: IEditorCommand[] = [];
    this.batch = batch;
    try {
      fn();
    } finally {
      this.batch = null;
    }
    if (batch.length === 0) {
      return;
    }
    this.undoStack.push(new CompositeCommand(label, batch));
    this.redoStack.length = 0;
    this.bus.emit({ kind: 'historyChanged' });
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.bus.emit({ kind: 'historyChanged' });
  }
}
