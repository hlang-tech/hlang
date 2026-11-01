/**
 * `CommandContextProvider` — supplies the `CommandContext` that commands run
 * against. Extracted as its own service so that both `CommandService` and
 * `HistoryService` depend on it, breaking what would otherwise be a cycle
 * between them.
 */

import type { CommandContext } from './interfaces';
import { IConnectionValidator, IEventBus, IGraphModel, IViewStateService } from './interfaces';
import type { ICommandContextProvider } from './history-service';

export class CommandContextProvider implements ICommandContextProvider {
  constructor(
    @IGraphModel private readonly model: IGraphModel,
    @IConnectionValidator private readonly validator: IConnectionValidator,
    @IEventBus private readonly bus: IEventBus,
    @IViewStateService private readonly viewState: IViewStateService,
  ) {}

  getContext(): CommandContext {
    return {
      model: this.model,
      validator: this.validator,
      bus: this.bus,
      viewState: this.viewState,
    };
  }
}
