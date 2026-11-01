/**
 * Prism, in development: a node-based tool for image and video creators, built
 * on the Lumen editor packages. The app assembles a headless EditorCore (interpreter-backed) and
 * drives a React Flow canvas via @hlang-org/editor-react, composed from the
 * @hlang-org/editor-ui design system. On start it loads a small starter flow
 * (a plain IGraph — the editor has no notion of templates), auto-lays it out,
 * and lets you edit it: add nodes, wire ports, edit params, and Run it.
 *
 * Note on execution: Run here interprets the graph IN THE BROWSER. That is a
 * portability BONUS for verifying the full pipeline end to end; in a product,
 * execution is dispatched to a server-side interpreter.
 *
 * Layers, end to end on our own packages: editor-core (model/commands) ->
 * editor-react (bindings) -> editor-ui (design system) -> Run serializes to
 * IGraph -> interpreter -> runtime.
 */

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { ReactElement } from 'react';
import { ReactFlow, ReactFlowProvider, useReactFlow, SelectionMode } from '@xyflow/react';
import type { Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import '@hlang-org/editor-ui/styles.css';
import {
  EditorShell,
  Toolbar,
  RunButton,
  ToolbarStat,
  ToolCluster,
  CanvasChrome,
  CanvasDock,
  EmptyState,
  InspectorPanel,
  OutlineTree,
  PreviewPanel,
  RailTabs,
  AssetGrid,
  PositionPanel,
  createHlangFlowTypes,
  useLiveSignals,
  LiveSignalProvider,
  LiveSignalStore,
  NodeSearch,
  useNodeSearch,
  useNodeSearchTriggers,
  useEditorHotkeys,
  isEditableTarget,
  NodeContextMenu,
  useNodeContextMenu,
  NodeInteractionProvider,
  Cheatsheet,
  ToastProvider,
  useToast,
} from '@hlang-org/editor-ui';
import type { ContextMenuItem, NodeInteraction, CanvasMode, ToolItem } from '@hlang-org/editor-ui';
import { useViewState, useClipboard, useDiagnostics, useRename, useReconnect } from '@hlang-org/editor-react';
import type { HlangRFEdge } from '@hlang-org/editor-react';
import type { EditorCore, IExecutionHandle, NodeId } from '@hlang-org/editor-core';
import './App.css';
import { createEditorCore, InterpreterGraphRunner, AddNodeCommand } from '@hlang-org/editor-core';
import { useHlangFlow, useHistory } from '@hlang-org/editor-react';
import { nodeDescriptors, makeRuntime } from './nodes';
import { buildStarterFlow } from './templates/showcase-flow';

const { nodeTypes, edgeTypes } = createHlangFlowTypes();

const RAIL: readonly { code: string; kind: string; label: string }[] = [
  { code: 'image-source', kind: 'R', label: 'Image' },
  { code: 'interval-source', kind: 'R', label: 'Interval' },
  { code: 'range-source', kind: 'R', label: 'Range' },
  { code: 'map-scale', kind: 'T', label: 'Map · Scale' },
  { code: 'merge', kind: 'T', label: 'Merge' },
  { code: 'scan-sum', kind: 'T', label: 'Scan · Sum' },
  { code: 'console-sink', kind: 'W', label: 'Console' },
];

let spawn = 0;

/** A minimal top-bar tool glyph (1.6px stroke, currentColor). */
function TopIcon({ d }: { readonly d: string }): ReactElement {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/**
 * The editable project name in the top bar. Double-click to rename; Enter/blur
 * commits, Escape cancels. Host state only (a project/flow name) — no model tie.
 */
function ProjectTitle({ name, onRename }: { readonly name: string; readonly onRename: (n: string) => void }): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const commit = (): void => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed.length > 0 && trimmed !== name) {
      onRename(trimmed);
    } else {
      setDraft(name);
    }
  };
  if (editing) {
    return (
      <input
        className="hl-project-input"
        value={draft}
        autoFocus
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            commit();
          } else if (e.key === 'Escape') {
            setDraft(name);
            setEditing(false);
          }
        }}
        aria-label="Project name"
      />
    );
  }
  return (
    <button
      className="hl-project-name"
      onDoubleClick={() => {
        setDraft(name);
        setEditing(true);
      }}
      title="Double-click to rename"
    >
      {name}
    </button>
  );
}

function EditorBody(): ReactElement {
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [handle, setHandle] = useState<IExecutionHandle | undefined>(undefined);
  const handleRef = useRef<IExecutionHandle | undefined>(undefined);

  const core: EditorCore = useMemo(() => {
    const { registry, createFlow } = makeRuntime({
      onConsole: value => setLog(prev => [...prev, String(value)]),
      onCollect: summary => setLog(prev => [...prev, summary]),
    });
    const c = createEditorCore({
      graphRunner: new InterpreterGraphRunner(registry, createFlow),
    });
    for (const descriptor of nodeDescriptors()) {
      c.registry.register(descriptor);
    }
    return c;
  }, []);

  const liveStore = useMemo(() => new LiveSignalStore(), []);
  const flow = useHlangFlow(core);
  useLiveSignals(core, handle, liveStore);
  const rf = useReactFlow();

  const search = useNodeSearch(core);
  const triggers = useNodeSearchTriggers(core, search);

  // Editor interactions: keyboard shortcuts + right-click node menu.
  useEditorHotkeys(core);
  const clipboard = useClipboard(core);
  const viewState = useViewState(core);
  const diagnostics = useDiagnostics(core);
  const renamer = useRename(core);
  const reconnect = useReconnect(core);
  const contextMenu = useNodeContextMenu();
  const toast = useToast();
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);

  // The project name shown in the top bar (host state — a flow/project concept).
  const [projectName, setProjectName] = useState('Untitled Flow');

  const history = useHistory(core);

  // Canvas dock: interaction mode (select vs pan) + a live zoom readout.
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('select');
  const [zoom, setZoom] = useState(1);
  const onMove = useCallback((): void => setZoom(rf.getZoom()), [rf]);
  const dockZoomIn = useCallback((): void => void rf.zoomIn({ duration: 160 }), [rf]);
  const dockZoomOut = useCallback((): void => void rf.zoomOut({ duration: 160 }), [rf]);
  const dockFit = useCallback(
    (): void => void rf.fitView({ duration: 300, padding: 0.16, maxZoom: 1 }),
    [rf],
  );
  const dockAdd = useCallback((): void => {
    // Open the node search centred on the current viewport.
    const screen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    search.openBlank(screen, rf.screenToFlowPosition(screen));
  }, [search, rf]);

  // Top-centre tool cluster — generic editing actions only (no business/media).
  const toolItems = useMemo<readonly ToolItem[]>(
    () => [
      { id: 'add', title: 'Add node', onClick: dockAdd, icon: <TopIcon d="M12 5v14M5 12h14" /> },
      {
        id: 'fit',
        title: 'Fit view',
        onClick: dockFit,
        separatorBefore: true,
        icon: <TopIcon d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
      },
      {
        id: 'select-all',
        title: 'Select all',
        onClick: () =>
          core.selection.selectNodes(
            core.model.getNodes().map(n => n.id),
            'replace',
          ),
        icon: <TopIcon d="M4 8V5a1 1 0 011-1h3M20 8V5a1 1 0 00-1-1h-3M4 16v3a1 1 0 001 1h3M20 16v3a1 1 0 01-1 1h-3" />,
      },
    ],
    [dockAdd, dockFit, core],
  );

  // Track the latest canvas pointer in FLOW space, so paste lands at the cursor.
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const onPaneMouseMove = useCallback(
    (event: React.MouseEvent): void => {
      cursorRef.current = rf.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    },
    [rf],
  );

  // Per-node interaction wiring consumed by node chrome (diagnostic badge + rename).
  const nodeInteraction = useMemo<NodeInteraction>(
    () => ({
      diagnosticFor: (id: NodeId) => diagnostics.worstOf(id),
      rename: (id: NodeId, name: string) => renamer.rename(id, name),
    }),
    [diagnostics, renamer],
  );

  // `?` opens the shortcut cheatsheet (guarded against typing in inputs — reuses
  // editor-ui's shared isEditableTarget so the guard can't drift).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!isEditableTarget(e.target) && e.key === '?') {
        e.preventDefault();
        setCheatsheetOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Reconnect an edge endpoint to a new port (undoable).
  const onReconnect = useCallback(
    (oldEdge: HlangRFEdge, connection: Connection): void => {
      reconnect.onReconnect(oldEdge, connection);
    },
    [reconnect],
  );

  // Drop a node onto an edge → try a smart inline insert (A→N→B), snapping the
  // node to its projection on the edge. Legality is the core's call (only a T
  // with compatible ports splices; R/W are refused). All geometry is FLOW space.
  //
  // The hit range is DERIVED from the dragged node's own rendered size — a node
  // counts as "on" an edge when its centre is within half its own extent of the
  // edge segment — rather than a magic pixel constant. We measure the node's DOM
  // box and divide by the current zoom to get its flow-space extent.
  const onNodeDragStop = useCallback(
    (_event: unknown, dragged: { id: string }): void => {
      // Use React Flow's own live geometry (absolute position + measured size,
      // both in flow units) instead of scraping the DOM — the binding layer's
      // hit-test then finds the nearest legal edge to splice onto.
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
      if (edgeId !== undefined) {
        // Keep the node where it landed (top-left) — it already sits on the wire.
        const ok = reconnect.insertOnEdge(dragged.id, edgeId, box.position);
        if (ok) {
          toast.show('Inserted on connection');
        }
      }
    },
    [rf, reconnect, toast],
  );

  // Build the right-click menu for a node. Selection is set to the target so the
  // clipboard actions (which act on selection) operate on it.
  const menuItems = useCallback(
    (nodeId: NodeId): readonly ContextMenuItem[] => {
      const isHidden = viewState.isHidden(nodeId);
      const isLocked = viewState.isLocked(nodeId);
      return [
        { id: 'duplicate', label: 'Duplicate', shortcut: '⌘D', onSelect: () => clipboard.duplicate() },
        {
          id: 'copy',
          label: 'Copy',
          shortcut: '⌘C',
          onSelect: () => {
            clipboard.copy();
            toast.show('Copied');
          },
        },
        { id: 'cut', label: 'Cut', shortcut: '⌘X', onSelect: () => clipboard.cut() },
        {
          id: 'paste',
          label: 'Paste',
          shortcut: '⌘V',
          disabled: !clipboard.canPaste(),
          onSelect: () => clipboard.paste(cursorRef.current ?? undefined),
        },
        {
          id: 'hide',
          label: isHidden ? 'Show' : 'Hide',
          onSelect: () => viewState.setHidden(nodeId, !isHidden),
        },
        {
          id: 'lock',
          label: isLocked ? 'Unlock' : 'Lock',
          onSelect: () => viewState.setLocked(nodeId, !isLocked),
        },
        { id: 'delete', label: 'Delete', shortcut: '⌫', danger: true, onSelect: () => clipboard.remove() },
      ];
    },
    [clipboard, viewState, toast],
  );

  // Right-click a node: select it (so shortcuts/menu act on it) and open the menu.
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: { id: string }): void => {
      event.preventDefault();
      if (!core.selection.isSelected(node.id)) {
        core.selection.selectNodes([node.id], 'replace');
      }
      contextMenu.openForNode({ x: event.clientX, y: event.clientY }, node.id);
    },
    [core, contextMenu],
  );

  // Focus a node (pan/zoom to it) — used by the outline rows.
  const focusNode = useCallback(
    (id: NodeId): void => {
      void rf.fitView({ nodes: [{ id }], duration: 350, maxZoom: 1.1, padding: 0.6 });
    },
    [rf],
  );

  // Load the starter flow once, on mount: import the IGraph, auto-lay it out,
  // and resync the binding layer. The editor just receives an IGraph.
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) {
      return;
    }
    loadedRef.current = true;
    const graph = buildStarterFlow();
    const snapshot = core.serialization.fromIGraph(graph);
    // The template omits per-node portInfo (ports belong to the node type), so
    // enrich each node's ports from its registered descriptor. Positions are
    // curated in the template itself (a designed first impression), so they are
    // kept as-is — auto-layout drives only user-added nodes.
    const enriched = {
      ...snapshot,
      nodes: snapshot.nodes.map(n => {
        const descriptor = core.registry.get(n.code);
        const ports = n.ports.length > 0 ? n.ports : descriptor?.ports ?? n.ports;
        return { ...n, ports };
      }),
    };
    core.model.restore(enriched);
    // The imported edge ids (edge-1..N from serialization) were minted outside
    // the id generator, so reserve them — otherwise a later insert/paste would
    // re-issue a colliding id.
    core.idGenerator.reserve([
      ...enriched.nodes.map(n => n.id),
      ...enriched.edges.map(e => e.id),
    ]);
    core.history.clear();
    flow.resync();
  }, [core, flow]);

  const addNode = useCallback(
    (code: string): void => {
      const descriptor = core.registry.get(code);
      const column = { R: 0, T: 2, W: 4 }[descriptor?.kind ?? 'T'] ?? 2;
      spawn += 1;
      const node = core.registry.createNode(code, {
        x: 160 + column * 300,
        y: 120 + (spawn % 5) * 130,
      });
      core.commands.execute(new AddNodeCommand(node));
    },
    [core],
  );

  // Drop a static asset onto the canvas: create an image-source (R) node that
  // REFERENCES that asset (its imageUrl). This is the concrete "an asset becomes
  // a node that uses it" relationship — a real command, not a mock.
  const addAsset = useCallback(
    (url: string): void => {
      spawn += 1;
      const base = core.registry.createNode('image-source', {
        x: 120 + (spawn % 4) * 220,
        y: 120 + (spawn % 3) * 200,
      });
      const node = { ...base, params: { ...base.params, imageUrl: url, caption: 'Asset' } };
      core.commands.execute(new AddNodeCommand(node));
      core.selection.selectNodes([node.id], 'replace');
      toast.show('Added asset node');
    },
    [core, toast],
  );

  const stop = useCallback((): void => {
    handleRef.current?.dispose();
    handleRef.current = undefined;
    setHandle(undefined);
    setRunning(false);
  }, []);

  const run = useCallback((): void => {
    if (handleRef.current !== undefined) {
      stop();
      return;
    }
    setLog([]);
    try {
      const h = core.execution?.run(core.model);
      handleRef.current = h;
      setHandle(h);
      setRunning(h !== undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLog(prev => [...prev, `error: ${message}`]);
      handleRef.current = undefined;
      setHandle(undefined);
      setRunning(false);
    }
  }, [core, stop]);

  return (
    <LiveSignalProvider store={liveStore}>
      <NodeInteractionProvider value={nodeInteraction}>
      <EditorShell
        toolbar={
          <Toolbar
            title={
              <>
                <span className="hl-toolbar-glyph" aria-hidden="true" />
                <span className="hl-toolbar-wordmark">Prism</span>
                <span className="hl-toolbar-divider" aria-hidden="true" />
                <ProjectTitle name={projectName} onRename={setProjectName} />
              </>
            }
            center={<ToolCluster items={toolItems} />}
            actions={
              <>
                <ToolbarStat label="Nodes" value={`${String(flow.nodes.length)} nodes`} />
                <RunButton onRun={run} running={running} runLabel="Render" stopLabel="Stop" />
              </>
            }
          />
        }
        left={<LeftRail core={core} onAdd={addNode} onAddAsset={addAsset} onFocus={focusNode} />}
        right={
          <div className="hl-rightstack">
            <PreviewPanel
              title="Render"
              status={running ? 'live' : 'ready'}
              imageUrl="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=520&q=70"
            />
            <PositionPanel
              core={core}
              livePosition={id => flow.nodes.find(n => n.id === id)?.position}
            />
            <InspectorPanel core={core} />
          </div>
        }
        footer={<OutputStream log={log} />}
        canvas={
          <div className={`hl-canvas hl-canvas-${canvasMode}`}>
            <ReactFlow
              nodes={flow.nodes}
              edges={flow.edges}
              onNodesChange={flow.onNodesChange}
              onEdgesChange={flow.onEdgesChange}
              onConnect={flow.onConnect}
              isValidConnection={flow.isValidConnection}
              onConnectStart={triggers.onConnectStart}
              onConnectEnd={triggers.onConnectEnd}
              onPaneClick={triggers.onPaneClick}
              onNodeContextMenu={onNodeContextMenu}
              onReconnect={onReconnect}
              onNodeDragStop={onNodeDragStop}
              onPaneMouseMove={onPaneMouseMove}
              onMove={onMove}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.16, minZoom: 0.7, maxZoom: 1 }}
              minZoom={0.2}
              colorMode="dark"
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{ type: 'default' }}
              /* Delete is owned by useEditorHotkeys (one undoable command path);
                 disable React Flow's built-in delete so it can't double-delete. */
              deleteKeyCode={null}
              /* Interaction mode from the dock: SELECT = left-drag box-selects
                 (pan via middle/right/Space); PAN = left-drag pans the canvas. */
              selectionOnDrag={canvasMode === 'select'}
              panOnDrag={canvasMode === 'pan' ? true : [1, 2]}
              selectionMode={SelectionMode.Partial}
            >
              <CanvasChrome />
            </ReactFlow>
            {flow.nodes.length === 0 && (
              <EmptyState hint="double-click the canvas to search · or drag a port into empty space" />
            )}
            <CanvasDock
              zoom={zoom}
              mode={canvasMode}
              onModeChange={setCanvasMode}
              onZoomIn={dockZoomIn}
              onZoomOut={dockZoomOut}
              onFitView={dockFit}
              onAdd={dockAdd}
              onUndo={() => history.undo()}
              onRedo={() => history.redo()}
              canUndo={history.canUndo}
              canRedo={history.canRedo}
            />
            <NodeSearch controller={search} />
            <NodeContextMenu controller={contextMenu} items={menuItems} />
            <Cheatsheet open={cheatsheetOpen} onClose={() => setCheatsheetOpen(false)} />
          </div>
        }
      />
      </NodeInteractionProvider>
    </LiveSignalProvider>
  );
}

export function App(): ReactElement {
  return (
    <ReactFlowProvider>
      <ToastProvider>
        <EditorBody />
      </ToastProvider>
    </ReactFlowProvider>
  );
}

/** Mock render results for the Assets tab (Unsplash — demo data, not a product). */
const MOCK_RENDERS: readonly { id: string; url: string; label: string }[] = [
  '1618005182384-a83a8bd57fbe',
  '1633899306328-c5e70574aaa2',
  '1618556450994-a6a128ef0d9d',
  '1620503374956-c942862f0372',
  '1635776062127-d379bfcba9f8',
  '1682687220742-aba13b6e50ba',
  '1620121692029-d088224ddc74',
  '1614851099511-773084f6911d',
].map((id, i) => ({
  id,
  url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=280&q=60`,
  label: `Render ${String(i + 1)}`,
}));

const LEFT_TABS = [
  { id: 'outline', label: 'Outline' },
  { id: 'insert', label: 'Insert' },
  { id: 'assets', label: 'Assets' },
] as const;

/**
 * Left rail: a three-tab side panel (Outline / Insert / Assets), nover-style.
 * Outline is the layer tree, Insert is the node palette, Assets is the render
 * gallery (mock demo images). The tab strip + asset grid are editor-ui
 * primitives; the playground just composes them.
 */
function LeftRail(props: {
  core: EditorCore;
  onAdd: (code: string) => void;
  onAddAsset: (url: string) => void;
  onFocus: (id: NodeId) => void;
}): ReactElement {
  const [tab, setTab] = useState<string>('outline');
  return (
    <div className="hl-leftrail">
      <RailTabs tabs={LEFT_TABS} active={tab} onChange={setTab} />
      {tab === 'outline' && (
        <section className="hl-leftrail-body">
          <OutlineTree core={props.core} onFocus={props.onFocus} />
        </section>
      )}
      {tab === 'insert' && (
        <section className="hl-leftrail-body">
          {/* Insert = the node-TYPE library: pick a kind of node to create. */}
          <p className="hl-rail-hint">Node types — click to add one to the canvas.</p>
          <div className="hl-rail-chips">
            {RAIL.map(item => (
              <button
                key={item.code}
                className={`hl-chip hl-chip-${item.kind.toLowerCase()}`}
                onClick={() => props.onAdd(item.code)}
              >
                <span className="hl-chip-kind hl-mono">{item.kind}</span>
                <span className="hl-chip-label">{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}
      {tab === 'assets' && (
        <section className="hl-leftrail-body">
          {/* Assets = the static-media library: each is a concrete image. Clicking
              one creates an image-source node that references it. */}
          <p className="hl-rail-hint">Static media — click to add it as a source node.</p>
          <AssetGrid
            items={MOCK_RENDERS}
            emptyHint="No assets yet"
            onSelect={id => {
              const asset = MOCK_RENDERS.find(a => a.id === id);
              if (asset !== undefined) {
                props.onAddAsset(asset.url);
              }
            }}
          />
        </section>
      )}
    </div>
  );
}

function OutputStream(props: { log: string[] }): ReactElement | null {
  if (props.log.length === 0) {
    return null;
  }
  // The log is append-only; keying by the line's ABSOLUTE index (not the sliced
  // window index) keeps keys stable as new lines push the window forward, so
  // React reconciles rows correctly instead of remapping them each render.
  const start = Math.max(0, props.log.length - 40);
  const window = props.log.slice(start);
  return (
    <section className="hl-output" aria-label="Output stream">
      <span className="hl-output-tag hl-mono">output</span>
      <div className="hl-output-body hl-mono">
        {window.map((line, i) => (
          <span key={start + i} className="hl-output-line">
            <span className="hl-output-arrow">▸</span>
            {line}
          </span>
        ))}
      </div>
    </section>
  );
}
