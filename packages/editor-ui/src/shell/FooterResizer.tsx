/**
 * `FooterResizer` — the grab handle on a resizable footer's top edge. Drag it
 * with a mouse, a finger or a pen; with focus, the arrow keys move it (Shift
 * for larger steps), Home and End go to the smallest and largest heights, and
 * Enter or a double click collapses the footer and opens it again. It is a
 * focusable ARIA `separator` that reports the footer's height.
 */

import type { KeyboardEvent, PointerEvent, ReactElement } from 'react';
import type { FooterResize } from './useFooterResize';

export interface FooterResizerProps {
  readonly resize: FooterResize;
  /** The id of the footer the handle resizes. */
  readonly controls: string;
  /** Its accessible name. */
  readonly label: string;
}

export function FooterResizer({ resize, controls, label }: FooterResizerProps): ReactElement {
  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    // A mouse drags with its main button only; touch and pen always drag.
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resize.startDrag(event.clientY);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      resize.drag(event.clientY);
    }
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resize.endDrag();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (resize.keyDown(event.key, event.shiftKey)) {
      event.preventDefault();
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      aria-controls={controls}
      aria-valuemin={resize.bounds.min}
      aria-valuemax={resize.bounds.max}
      aria-valuenow={resize.height}
      tabIndex={0}
      className={`hl-footer-resizer${resize.dragging ? ' is-dragging' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={() => {
        resize.endDrag();
      }}
      onDoubleClick={() => {
        resize.toggle();
      }}
      onKeyDown={onKeyDown}
    />
  );
}
