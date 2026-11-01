/**
 * `useRunTrace` — feeds a run's deliveries and errors into a `RunTrace`. Each
 * new handle starts a new run in the trace; when the handle goes away (the
 * run stopped) the trace keeps what it recorded, so the log can still be read.
 * A handle that cannot trace (no `onDelivery`) still feeds its errors.
 */

import { useEffect } from 'react';
import type { IExecutionHandle } from '@hlang-org/editor-core';
import type { RunTrace } from '../live/run-trace';

export function useRunTrace(trace: RunTrace, handle: IExecutionHandle | undefined): void {
  useEffect(() => {
    if (handle === undefined) {
      return;
    }
    trace.start();
    const deliveries = handle.onDelivery?.(event => {
      trace.recordDelivery(event);
    });
    const errors = handle.onError(event => {
      trace.recordError(event);
    });
    return (): void => {
      deliveries?.dispose();
      errors.dispose();
    };
  }, [trace, handle]);
}
