/**
 * `CommandService` — the only public mutation entry point.
 *
 * It obtains the `CommandContext` from the provider, runs the command's
 * `execute`, pushes it to history on success, and returns a typed result. A
 * command may throw a `CommandValidationError` to signal a rejected mutation
 * (e.g. an illegal connection); the service converts that into an unsuccessful
 * `CommandResult` and does NOT record it in history.
 */

import type {
  CommandResult,
  ICommandService,
  IEditorCommand,
  ValidationResult,
} from './interfaces';
import { IEditorModeService, IHistoryService } from './interfaces';
import { ICommandContextProvider } from './history-service';

/** Thrown by a command to reject a mutation with a validation reason. */
export class CommandValidationError extends Error {
  constructor(readonly result: ValidationResult) {
    super(result.message ?? 'Command validation failed.');
    this.name = 'CommandValidationError';
  }
}

export class CommandService implements ICommandService {
  constructor(
    @ICommandContextProvider private readonly provider: ICommandContextProvider,
    @IHistoryService private readonly history: IHistoryService,
    @IEditorModeService private readonly mode: IEditorModeService,
  ) {}

  execute<R>(command: IEditorCommand<R>): CommandResult<R> {
    if (this.mode.readOnly) {
      return {
        ok: false,
        error: { ok: false, reason: 'read-only', message: 'The editor is read-only: the graph cannot be changed.' },
      };
    }
    const ctx = this.provider.getContext();
    try {
      const value = command.execute(ctx);
      this.history.push(command);
      return { ok: true, value };
    } catch (error) {
      if (error instanceof CommandValidationError) {
        return { ok: false, error: error.result };
      }
      throw error;
    }
  }
}
