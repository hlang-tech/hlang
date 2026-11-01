'use client';

/**
 * The Lumen editor, embedded in the home page and running in the visitor's
 * browser: @hlang-org/editor-core (model, commands, history, validation),
 * @hlang-org/editor-react (React Flow bindings) and @hlang-org/editor-ui (the
 * design system), with a kit of generic stream nodes. Run interprets the graph
 * with @hlang-org/interpreter; while it runs, every edit restarts it.
 *
 * Embedding rules: shortcuts answer only to keystrokes inside the editor, the
 * wheel scrolls the page (zoom with a pinch or the dock), and on touch screens a
 * one-finger drag on empty canvas scrolls the page too.
 */

import '@xyflow/react/dist/style.css';
import '@hlang-org/editor-ui/styles.css';
import './lumen.css';

import { ReactFlow, ReactFlowProvider, SelectionMode, useReactFlow } from '@xyflow/react';
import type { Connection } from '@xyflow/react';
import { AddNodeCommand, createEditorCore, InterpreterGraphRunner } from '@hlang-org/editor-core';
import type { EditorCore, IExecutionHandle, NodeDescriptor, NodeId } from '@hlang-org/editor-core';
import { useClipboard, useDiagnostics, useHistory, useHlangFlow, useReconnect, useRename, useViewState } from '@hlang-org/editor-react';
import type { HlangRFEdge } from '@hlang-org/editor-react';
import {
  CanvasChrome,
  CanvasDock,
  Cheatsheet,
  createHlangFlowTypes,
  EditorShell,
  EmptyState,
  InspectorPanel,
  isEditableTarget,
  LiveSignalProvider,
  LiveSignalStore,
  NodeContextMenu,
  NodeInteractionProvider,
  NodeSearch,
  OutlineTree,
  RailTabs,
  RunButton,
  ToastProvider,
  ToolCluster,
  Toolbar,
  ToolbarStat,
  useEditorHotkeys,
  useLiveSignals,
  useNodeContextMenu,
  useNodeSearch,
  useNodeSearchTriggers,
  useToast,
} from '@hlang-org/editor-ui';
import type { CanvasMode, ContextMenuItem, NodeInteraction, ToolItem } from '@hlang-org/editor-ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactElement } from 'react';
import { Flow } from '@/lib/live-nodes';
import { createLumenKit } from '@/lib/lumen/kit';
import { starterFlow } from '@/lib/lumen/starter-flow';

const { nodeTypes, edgeTypes } = createHlangFlowTypes();

/** Output lines kept on screen. */
const OUTPUT_LINES = 3;

const LEFT_TABS = [
  { id: 'outline', label: 'Outline' },
  { id: 'insert', label: 'Insert' },
] as const;

function TopIcon({ d }: { readonly d: string }): ReactElement {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/**
 * Matches a CSS media query, updating on change. The editor renders on the
 * client only, so the first render already has the real answer.
 */
function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const update = (): void => { setMatches(list.matches); };
    list.addEventListener('change', update);
    return () => { list.removeEventListener('change', update); };
  }, [query]);
  return matches;
}

/** The part of the graph that execution depends on: nodes, parameters, connections; not positions. */
function semanticKey(core: EditorCore): string {
  const graph = core.serialization.toIGraph(core.model);
  return JSON.stringify({
    nodes: graph.nodeList.map(node => [node.nodeId, node.code, node.bizData ?? null]),
    connections: graph.connections,
  });
}

interface LumenEditorProps {
  /** Start running when the editor comes into view (not under reduced motion). */
  readonly autoRun?: boolean;
}

function EditorBody({ autoRun = true }: LumenEditorProps): ReactElement {
  const root = useRef<HTMLDivElement>(null);
  const [log, setLog] = useState<readonly { readonly id: number; readonly text: string }[]>([]);
  const [handle, setHandle] = useState<IExecutionHandle | undefined>(undefined);
  const handleRef = useRef<IExecutionHandle | undefined>(undefined);
  // Set when the visitor stops the flow; auto-run then leaves it stopped.
  const stoppedByVisitor = useRef(false);

  const wide = useMedia('(min-width: 1024px)');
  const touch = useMedia('(pointer: coarse)');
  const narrow = useMedia('(max-width: 639px)');

  const { core, descriptors } = useMemo(() => {
    const kit = createLumenKit(value => {
      setLog(previous => [{ id: (previous[0]?.id ?? 0) + 1, text: String(value) }, ...previous].slice(0, OUTPUT_LINES));
    });
    const editor = createEditorCore({ graphRunner: new InterpreterGraphRunner(kit.registry, () => new Flow()) });
    for (const descriptor of kit.descriptors) {
      editor.registry.register(descriptor);
    }
    return { core: editor, descriptors: kit.descriptors };
  }, []);

  const liveStore = useMemo(() => new LiveSignalStore(), []);
  const flow = useHlangFlow(core);
  useLiveSignals(core, handle, liveStore);
  const rf = useReactFlow();
  const search = useNodeSearch(core);
  const triggers = useNodeSearchTriggers(core, search);
  useEditorHotkeys(core, { scope: root });
  const clipboard = useClipboard(core);
  const viewState = useViewState(core);
  const diagnostics = useDiagnostics(core);
  const renamer = useRename(core);
  const reconnect = useReconnect(core);
  const contextMenu = useNodeContextMenu();
  const toast = useToast();
  const history = useHistory(core);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('select');
  const [zoom, setZoom] = useState(1);

  // Load the starter flow once: import the IGraph and take each node's ports from
  // its descriptor. A narrow canvas starts with the compact flow.
  const loaded = useRef(false);
  const compact = useRef(narrow);
  useEffect(() => {
    if (loaded.current) {
      return;
    }
    loaded.current = true;
    const snapshot = core.serialization.fromIGraph(starterFlow(compact.current));
    const enriched = {
      ...snapshot,
      nodes: snapshot.nodes.map(node => ({
        ...node,
        ports: node.ports.length > 0 ? node.ports : (core.registry.get(node.code)?.ports ?? node.ports),
      })),
    };
    core.model.restore(enriched);
    core.idGenerator.reserve([...enriched.nodes.map(node => node.id), ...enriched.edges.map(edge => edge.id)]);
    core.history.clear();
    flow.resync();
  }, [core, flow]);

  const stop = useCallback((): void => {
    handleRef.current?.dispose();
    handleRef.current = undefined;
    setHandle(undefined);
  }, []);

  const start = useCallback((): void => {
    stop();
    setLog([]);
    try {
      const next = core.execution?.run(core.model);
      handleRef.current = next;
      setHandle(next);
    } catch (error) {
      setLog([{ id: 1, text: `error: ${error instanceof Error ? error.message : String(error)}` }]);
    }
  }, [core, stop]);

  const running = handle !== undefined;

  const toggleRun = useCallback((): void => {
    if (handleRef.current === undefined) {
      stoppedByVisitor.current = false;
      start();
    } else {
      stoppedByVisitor.current = true;
      stop();
    }
  }, [start, stop]);

  // While running, an edit that changes what runs restarts the flow. Moving a node does not.
  const lastKey = useRef('');
  useEffect(() => {
    lastKey.current = semanticKey(core);
    const subscription = core.events.on('historyChanged', () => {
      const key = semanticKey(core);
      if (key !== lastKey.current) {
        lastKey.current = key;
        if (handleRef.current !== undefined) {
          start();
        }
      }
    });
    return () => { subscription.dispose(); };
  }, [core, start]);

  // Run while the editor is on screen; stop when it leaves, to spend nothing off screen.
  useEffect(() => {
    const element = root.current;
    if (!autoRun || element === null || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.some(entry => entry.isIntersecting);
        if (visible && handleRef.current === undefined && !stoppedByVisitor.current) {
          start();
        } else if (!visible && handleRef.current !== undefined) {
          stop();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => { observer.disconnect(); };
  }, [autoRun, start, stop]);

  // Stop for good on unmount.
  useEffect(() => stop, [stop]);

  const center = useCallback((): { x: number; y: number } => {
    const box = root.current?.getBoundingClientRect();
    return box === undefined ? { x: 0, y: 0 } : { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }, []);

  const openSearch = useCallback((): void => {
    const screen = center();
    search.openBlank(screen, rf.screenToFlowPosition(screen));
  }, [search, rf, center]);
  const fit = useCallback((): void => { void rf.fitView({ duration: 300, padding: 0.16, maxZoom: 1 }); }, [rf]);

  // Keep the whole flow in view while the canvas changes size, until the visitor moves the view.
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewTouched = useRef(false);
  useEffect(() => {
    const element = canvasRef.current;
    if (element === null) {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      if (!viewTouched.current) {
        void rf.fitView({ padding: 0.14, maxZoom: 1 });
      }
    });
    observer.observe(element);
    return () => { observer.disconnect(); };
  }, [rf]);

  const toolItems = useMemo<readonly ToolItem[]>(
    () => [
      { id: 'add', title: 'Add node', onClick: openSearch, icon: <TopIcon d="M12 5v14M5 12h14" /> },
      { id: 'fit', title: 'Fit view', onClick: fit, separatorBefore: true, icon: <TopIcon d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /> },
    ],
    [openSearch, fit],
  );

  const nodeInteraction = useMemo<NodeInteraction>(
    () => ({
      diagnosticFor: (id: NodeId) => diagnostics.worstOf(id),
      rename: (id: NodeId, name: string) => { renamer.rename(id, name); },
    }),
    [diagnostics, renamer],
  );

  // `?` toggles the shortcut sheet, for keystrokes inside the editor only.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const element = root.current;
      if (element === null || !(event.target instanceof Node) || !element.contains(event.target) || isEditableTarget(event.target)) {
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        setCheatsheetOpen(open => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, []);

  const cursor = useRef<{ x: number; y: number } | null>(null);

  const menuItems = useCallback(
    (nodeId: NodeId): readonly ContextMenuItem[] => {
      const hidden = viewState.isHidden(nodeId);
      const locked = viewState.isLocked(nodeId);
      return [
        { id: 'duplicate', label: 'Duplicate', shortcut: '⌘D', onSelect: () => { clipboard.duplicate(); } },
        { id: 'copy', label: 'Copy', shortcut: '⌘C', onSelect: () => { clipboard.copy(); toast.show('Copied'); } },
        { id: 'cut', label: 'Cut', shortcut: '⌘X', onSelect: () => { clipboard.cut(); } },
        { id: 'paste', label: 'Paste', shortcut: '⌘V', disabled: !clipboard.canPaste(), onSelect: () => { clipboard.paste(cursor.current ?? undefined); } },
        { id: 'hide', label: hidden ? 'Show' : 'Hide', onSelect: () => { viewState.setHidden(nodeId, !hidden); } },
        { id: 'lock', label: locked ? 'Unlock' : 'Lock', onSelect: () => { viewState.setLocked(nodeId, !locked); } },
        { id: 'delete', label: 'Delete', shortcut: '⌫', danger: true, onSelect: () => { clipboard.remove(); } },
      ];
    },
    [clipboard, viewState, toast],
  );

  const onNodeContextMenu = useCallback(
    (event: ReactMouseEvent, node: { id: string }): void => {
      event.preventDefault();
      if (!core.selection.isSelected(node.id)) {
        core.selection.selectNodes([node.id], 'replace');
      }
      contextMenu.openForNode({ x: event.clientX, y: event.clientY }, node.id);
    },
    [core, contextMenu],
  );

  // Drop a node onto an edge to splice it in; the core decides whether that is legal.
  const onNodeDragStop = useCallback(
    (_event: unknown, dragged: { id: string }): void => {
      const internal = rf.getInternalNode(dragged.id);
      if (internal === undefined) {
        return;
      }
      const box = {
        position: internal.internals.positionAbsolute,
        width: internal.measured.width ?? 0,
        height: internal.measured.height ?? 0,
      };
      const edgeId = reconnect.hitTestEdge(dragged.id, box);
      if (edgeId !== undefined && reconnect.insertOnEdge(dragged.id, edgeId, box.position)) {
        toast.show('Inserted on connection');
      }
    },
    [rf, reconnect, toast],
  );

  const onReconnect = useCallback(
    (oldEdge: HlangRFEdge, connection: Connection): void => { reconnect.onReconnect(oldEdge, connection); },
    [reconnect],
  );

  const addNode = useCallback(
    (code: string): void => {
      const screen = center();
      const position = rf.screenToFlowPosition(screen);
      const node = core.registry.createNode(code, { x: position.x - 90, y: position.y - 30 });
      core.commands.execute(new AddNodeCommand(node));
      core.selection.selectNodes([node.id], 'replace');
    },
    [core, rf, center],
  );

  const focusNode = useCallback(
    (id: NodeId): void => { void rf.fitView({ nodes: [{ id }], duration: 350, maxZoom: 1.1, padding: 0.6 }); },
    [rf],
  );

  // Focus the editor on pointer down, so its shortcuts apply until focus leaves it.
  const claimFocus = useCallback((event: ReactPointerEvent<HTMLDivElement>): void => {
    const element = root.current;
    if (element !== null && !(event.target instanceof HTMLElement && event.target.closest('input, textarea, select, button, [tabindex]') !== null)) {
      element.focus({ preventScroll: true });
    }
  }, []);

  return (
    <LiveSignalProvider store={liveStore}>
      <NodeInteractionProvider value={nodeInteraction}>
        <div
          ref={root}
          tabIndex={-1}
          aria-label="Lumen editor"
          role="application"
          className="lumen-embed"
          data-touch={touch ? '' : undefined}
          onPointerDown={claimFocus}
        >
          <EditorShell
            leftCollapsed={!wide}
            rightCollapsed={!wide}
            toolbar={
              <Toolbar
                title={
                  <>
                    <span className="hl-toolbar-glyph" aria-hidden="true" />
                    <span className="hl-toolbar-wordmark">Lumen</span>
                    <span className="hl-toolbar-divider" aria-hidden="true" />
                    <span className="lumen-flow-name">Running total</span>
                  </>
                }
                center={wide ? <ToolCluster items={toolItems} /> : undefined}
                actions={
                  <>
                    {wide ? <ToolbarStat label="Nodes" value={`${String(flow.nodes.length)} nodes`} /> : null}
                    <RunButton onRun={toggleRun} running={running} />
                  </>
                }
              />
            }
            left={<LeftRail core={core} descriptors={descriptors} onAdd={addNode} onFocus={focusNode} />}
            right={
              <div className="hl-rightstack">
                <InspectorPanel core={core} />
              </div>
            }
            footer={<Output log={log} running={running} />}
            canvas={
              <div ref={canvasRef} className={`hl-canvas hl-canvas-${canvasMode}`}>
                <ReactFlow
                  nodes={flow.nodes}
                  edges={flow.edges}
                  onNodesChange={flow.onNodesChange}
                  onEdgesChange={flow.onEdgesChange}
                  onConnect={flow.onConnect}
                  isValidConnection={flow.isValidConnection}
                  onConnectStart={triggers.onConnectStart}
                  onConnectEnd={triggers.onConnectEnd}
                  onPaneClick={event => { triggers.onPaneClick(event); }}
                  onNodeContextMenu={onNodeContextMenu}
                  onReconnect={onReconnect}
                  onNodeDragStop={onNodeDragStop}
                  onPaneMouseMove={event => { cursor.current = rf.screenToFlowPosition({ x: event.clientX, y: event.clientY }); }}
                  onMove={() => { setZoom(rf.getZoom()); }}
                  onMoveStart={event => {
                    // A move with an input event is the visitor's own pan or zoom.
                    if (event !== null) {
                      viewTouched.current = true;
                    }
                  }}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.14, maxZoom: 1 }}
                  minZoom={0.2}
                  colorMode="dark"
                  defaultEdgeOptions={{ type: 'default' }}
                  deleteKeyCode={null}
                  // The page keeps the wheel; zoom with a pinch or the dock.
                  zoomOnScroll={false}
                  preventScrolling={false}
                  selectionOnDrag={!touch && canvasMode === 'select'}
                  panOnDrag={touch ? false : canvasMode === 'pan' ? true : [1, 2]}
                  selectionMode={SelectionMode.Partial}
                >
                  <CanvasChrome />
                </ReactFlow>
                {flow.nodes.length === 0 ? <EmptyState hint="Double-click the canvas to search, or drag a port into empty space" /> : null}
                <CanvasDock
                  zoom={zoom}
                  mode={canvasMode}
                  onModeChange={setCanvasMode}
                  onZoomIn={() => { void rf.zoomIn({ duration: 160 }); }}
                  onZoomOut={() => { void rf.zoomOut({ duration: 160 }); }}
                  onFitView={fit}
                  onAdd={openSearch}
                  onUndo={() => { history.undo(); }}
                  onRedo={() => { history.redo(); }}
                  canUndo={history.canUndo}
                  canRedo={history.canRedo}
                />
                <NodeSearch controller={search} />
                <NodeContextMenu controller={contextMenu} items={menuItems} />
                <Cheatsheet open={cheatsheetOpen} onClose={() => { setCheatsheetOpen(false); }} />
              </div>
            }
          />
        </div>
      </NodeInteractionProvider>
    </LiveSignalProvider>
  );
}

interface LeftRailProps {
  readonly core: EditorCore;
  readonly descriptors: readonly NodeDescriptor[];
  readonly onAdd: (code: string) => void;
  readonly onFocus: (id: NodeId) => void;
}

function LeftRail({ core, descriptors, onAdd, onFocus }: LeftRailProps): ReactElement {
  const [tab, setTab] = useState<string>('outline');
  const groups = [...new Set(descriptors.map(descriptor => descriptor.group))];
  return (
    <div className="hl-leftrail">
      <RailTabs tabs={LEFT_TABS} active={tab} onChange={setTab} />
      {tab === 'outline' ? (
        <section className="hl-leftrail-body">
          <OutlineTree core={core} onFocus={onFocus} />
        </section>
      ) : (
        <section className="hl-leftrail-body">
          <p className="hl-rail-hint">Node types. Click one to add it to the canvas.</p>
          {groups.map(group => (
            <div key={group}>
              <p className="hl-rail-group">{group}</p>
              <div className="hl-rail-chips">
                {descriptors
                  .filter(descriptor => descriptor.group === group)
                  .map(descriptor => (
                    <button
                      key={descriptor.code}
                      type="button"
                      className={`hl-chip hl-chip-${descriptor.kind.toLowerCase()}`}
                      onClick={() => { onAdd(descriptor.code); }}
                    >
                      <span className="hl-chip-kind">{descriptor.kind}</span>
                      <span className="hl-chip-label">{descriptor.displayName}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function Output({ log, running }: { readonly log: readonly { readonly id: number; readonly text: string }[]; readonly running: boolean }): ReactElement {
  return (
    <section className="hl-output" aria-label="Console output" aria-live="off">
      <span className="hl-output-tag">Console</span>
      {log.length === 0 ? (
        <span className="hl-output-idle">{running ? 'Waiting for the first value' : 'Press Run to start the flow.'}</span>
      ) : (
        <div className="hl-output-body">
          {log.map(line => (
            <span key={line.id} className="hl-output-line">
              <span className="hl-output-arrow" aria-hidden>
                ▸
              </span>
              {line.text}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export function LumenEditor(props: LumenEditorProps): ReactElement {
  return (
    <ReactFlowProvider>
      {/* The editor's own box: its toasts stack inside it, not on the page. */}
      <div className="relative h-full">
        <ToastProvider>
          <EditorBody {...props} />
        </ToastProvider>
      </div>
    </ReactFlowProvider>
  );
}
