/**
 * `EditorShell` — composes the editor's regions (top toolbar, left panel,
 * center canvas, right inspector, footer). It holds NO graph logic; a host
 * slots children into named regions. Left/right panels are collapsible via
 * UI-only props, and the footer can be made resizable (presentation state,
 * never part of the graph).
 */

import { useEffect, useId, useRef } from 'react';
import type { ReactElement, ReactNode, RefObject } from 'react';
import { FooterResizer } from './FooterResizer';
import { useFooterResize } from './useFooterResize';
import type { FooterResizeOptions } from './useFooterResize';
import './EditorShell.css';

export interface EditorShellProps {
  /** Top toolbar region. */
  readonly toolbar?: ReactNode;
  /** Left region (node palette / outline). */
  readonly left?: ReactNode;
  /** Right region (inspector). */
  readonly right?: ReactNode;
  /** Center region — required; the host renders <ReactFlow> + <CanvasChrome>. */
  readonly canvas: ReactNode;
  /** Optional footer region (e.g. an output/console strip). */
  readonly footer?: ReactNode;
  /**
   * Makes the footer resizable: its top edge can be dragged, moved with the
   * keyboard, and double-clicked to collapse it. Without it the footer takes
   * its content's height.
   */
  readonly footerResize?: FooterResizeOptions & {
    /** The accessible name of the footer's resize handle. Default "Resize the panel". */
    readonly label?: string;
  };
  readonly leftCollapsed?: boolean;
  readonly rightCollapsed?: boolean;
}

export function EditorShell({
  toolbar,
  left,
  right,
  canvas,
  footer,
  footerResize,
  leftCollapsed = false,
  rightCollapsed = false,
}: EditorShellProps): ReactElement {
  const shellRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const className = [
    'hl-shell',
    leftCollapsed ? 'hl-left-collapsed' : '',
    rightCollapsed ? 'hl-right-collapsed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className} ref={shellRef}>
      {toolbar !== undefined && (
        <div className="hl-region-toolbar" ref={toolbarRef}>
          {toolbar}
        </div>
      )}
      <div className="hl-region-body">
        {left !== undefined && !leftCollapsed && (
          <aside className="hl-region-left">{left}</aside>
        )}
        <main className="hl-region-canvas">{canvas}</main>
        {right !== undefined && !rightCollapsed && (
          <aside className="hl-region-right">{right}</aside>
        )}
      </div>
      {footer !== undefined &&
        (footerResize === undefined ? (
          <div className="hl-region-footer">{footer}</div>
        ) : (
          <ResizableFooter options={footerResize} shellRef={shellRef} toolbarRef={toolbarRef}>
            {footer}
          </ResizableFooter>
        ))}
    </div>
  );
}

function ResizableFooter({
  options,
  shellRef,
  toolbarRef,
  children,
}: {
  readonly options: NonNullable<EditorShellProps['footerResize']>;
  readonly shellRef: RefObject<HTMLDivElement | null>;
  readonly toolbarRef: RefObject<HTMLDivElement | null>;
  readonly children: ReactNode;
}): ReactElement {
  const resize = useFooterResize(options);
  const id = useId();
  const { measure } = resize;

  // The footer may take what the toolbar leaves, less the canvas's minimum;
  // re-measured whenever the editor or its toolbar changes size.
  useEffect(() => {
    const shell = shellRef.current;
    if (shell === null) {
      return;
    }
    const update = (): void => {
      measure(shell.clientHeight - (toolbarRef.current?.offsetHeight ?? 0));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(shell);
    if (toolbarRef.current !== null) {
      observer.observe(toolbarRef.current);
    }
    return (): void => {
      observer.disconnect();
    };
  }, [measure, shellRef, toolbarRef]);

  return (
    <div
      id={id}
      className={`hl-region-footer is-resizable${resize.dragging ? ' is-resizing' : ''}`}
      style={{ height: resize.height }}
    >
      <FooterResizer resize={resize} controls={id} label={options.label ?? 'Resize the panel'} />
      {children}
    </div>
  );
}
