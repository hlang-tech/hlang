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
    // End of stream and drops (RFC 0001), from a runner that traces them.
    const ended = handle.onEnded?.(event => {
      trace.recordEnded(event);
    });
    const finished = handle.onFinished?.(event => {
      trace.recordFinished(event);
    });
    const dropped = handle.onDropped?.(event => {
      trace.recordDropped(event);
    });
    return (): void => {
      deliveries?.dispose();
      errors.dispose();
      ended?.dispose();
      finished?.dispose();
      dropped?.dispose();
    };
  }, [trace, handle]);
}
