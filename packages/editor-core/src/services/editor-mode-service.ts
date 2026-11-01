/**
 * `EditorModeService` — whether the editor may change the graph. In read-only
 * mode the editor still shows and runs the graph and lets the user select to
 * inspect, but the command service refuses every command and history neither
 * undoes nor redoes, so no input path (a shortcut, a paste, a drag) can change
 * the graph. A host switches it as conditions change, such as a screen too
 * small to edit on; listeners learn of each change through `modeChanged`.
 */

import { IEventBus } from './interfaces';
import type { IEditorModeService } from './interfaces';

export class EditorModeService implements IEditorModeService {
  private current = false;

  constructor(@IEventBus private readonly bus: IEventBus) {}

  get readOnly(): boolean {
    return this.current;
  }

  setReadOnly(readOnly: boolean): void {
    if (readOnly === this.current) {
      return;
    }
    this.current = readOnly;
    this.bus.emit({ kind: 'modeChanged' });
  }
}
