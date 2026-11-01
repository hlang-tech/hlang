/**
 * @hlang-org/editor-ui
 *
 * Design-system component layer for the hlang visual editor, built on
 * @hlang-org/editor-react. Deep-space futuristic nodes, flowing-stream edges, a
 * schema-driven inspector, and a node-customization extension point.
 *
 * Import the base tokens once at your app root:
 *   import '@hlang-org/editor-ui/tokens.css';
 */

// Design tokens & theming
export { TOKEN_NAMES, tokenVar, KIND_TOKEN, KIND_ROLE } from './tokens/tokens';
export type { TokenName } from './tokens/tokens';
export { createTheme } from './tokens/theme';
export type { ThemeOverride } from './tokens/theme';
export { EditorUIThemeProvider } from './tokens/ThemeProvider';
export type { EditorUIThemeProviderProps } from './tokens/ThemeProvider';

// Node & edge chrome
export { HlangNode, NodeChrome } from './nodes/HlangNode';
export type { NodeChromeProps } from './nodes/HlangNode';
export { AssetNodeChrome } from './nodes/AssetNode';
export type { AssetNodeChromeProps } from './nodes/AssetNode';
export { PillNodeChrome } from './nodes/PillNode';
export type { PillNodeChromeProps } from './nodes/PillNode';
export { SignalBar } from './nodes/SignalBar';
export { PortRow } from './nodes/PortRow';
export type { PortRowProps } from './nodes/PortRow';
export { NodeBodySlot } from './nodes/NodeBodySlot';
export type { NodeBodySlotProps } from './nodes/NodeBodySlot';
export { FlowEdge } from './edges/FlowEdge';
export { createHlangFlowTypes } from './nodes/flow-types';
export type { HlangFlowTypes } from './nodes/flow-types';

// Shell / toolbar / canvas chrome
export { EditorShell } from './shell/EditorShell';
export type { EditorShellProps } from './shell/EditorShell';
export { Toolbar, UndoRedo, RunButton, ToolbarStat, ToolbarGhostButton } from './toolbar/Toolbar';
export type { ToolbarProps, UndoRedoProps, RunButtonProps } from './toolbar/Toolbar';
export { ToolCluster } from './toolbar/ToolCluster';
export type { ToolClusterProps, ToolItem } from './toolbar/ToolCluster';
export { CanvasChrome } from './canvas/CanvasChrome';
export type { CanvasChromeProps } from './canvas/CanvasChrome';
export { CanvasDock } from './canvas/CanvasDock';
export type { CanvasDockProps, CanvasMode } from './canvas/CanvasDock';
export { EmptyState } from './canvas/EmptyState';
export type { EmptyStateProps } from './canvas/EmptyState';

// Inspector (schema-driven property panel) + outline + preview panels
export { InspectorPanel } from './panels/InspectorPanel';
export type { InspectorPanelProps } from './panels/InspectorPanel';
export { OutlineTree } from './panels/OutlineTree';
export type { OutlineTreeProps } from './panels/OutlineTree';
export { PreviewPanel } from './panels/PreviewPanel';
export type { PreviewPanelProps } from './panels/PreviewPanel';
export { RailTabs } from './panels/RailTabs';
export type { RailTabsProps, RailTab } from './panels/RailTabs';
export { AssetGrid } from './panels/AssetGrid';
export type { AssetGridProps, AssetItem } from './panels/AssetGrid';
export { PositionPanel } from './panels/PositionPanel';
export type { PositionPanelProps } from './panels/PositionPanel';
export { DiagnosticBadge } from './panels/DiagnosticBadge';
export type { DiagnosticBadgeProps } from './panels/DiagnosticBadge';
export { ParamForm } from './panels/ParamForm';
export type { ParamFormProps } from './panels/ParamForm';
export { deriveParamSchema } from './schema/param-field';
export type { ParamField, ParamFieldBase } from './schema/param-field';
export { useNodeParams } from './hooks/useNodeParams';
export type { NodeParamsHandle } from './hooks/useNodeParams';

// Node search (create-by-search: canvas double-click / link-release to empty)
export { NodeSearch } from './command-palette/NodeSearch';
export type { NodeSearchProps } from './command-palette/NodeSearch';
export { useNodeSearch } from './command-palette/useNodeSearch';
export type {
  NodeSearchController,
  NodeSearchState,
  NodeSearchResultView,
} from './command-palette/useNodeSearch';
export { useNodeSearchTriggers } from './command-palette/useNodeSearchTriggers';
export type {
  NodeSearchTriggers,
  NodeSearchTriggerOptions,
  PointerPosition,
  TouchPositions,
  ConnectionEnd,
} from './command-palette/useNodeSearchTriggers';
export {
  searchNodes,
  descriptorCandidates,
  connectableCandidates,
} from './command-palette/node-search-model';
export type {
  PendingConnection,
  NodeCandidate,
  NodeSearchResult,
  ConnectableResult,
} from './command-palette/node-search-model';
export { fuzzyScore, fuzzyRank } from './command-palette/fuzzy';
export type { FuzzyMatch, FuzzyCandidate, FuzzyResult } from './command-palette/fuzzy';

// Editor interactions: keyboard shortcuts + right-click node menu
export { useEditorHotkeys, isEditableTarget } from './hooks/useEditorHotkeys';
export type { EditorHotkeysOptions } from './hooks/useEditorHotkeys';
export { NodeContextMenu } from './context-menu/NodeContextMenu';
export type { NodeContextMenuProps, ContextMenuItem } from './context-menu/NodeContextMenu';
export { useNodeContextMenu } from './context-menu/useNodeContextMenu';
export type {
  NodeContextMenuController,
  NodeContextMenuState,
} from './context-menu/useNodeContextMenu';

// Per-node interaction wiring (diagnostics badge + inline rename)
export { NodeInteractionProvider, useNodeInteraction } from './nodes/NodeInteractionContext';
export type { NodeInteraction, NodeInteractionProviderProps } from './nodes/NodeInteractionContext';

// Discoverability overlays
export { Cheatsheet } from './overlays/Cheatsheet';
export type { CheatsheetProps, ShortcutGroup, ShortcutRow } from './overlays/Cheatsheet';
export { ToastProvider, useToast } from './overlays/Toast';
export type { ToastProviderProps, ToastApi } from './overlays/Toast';

// Live execution visuals ("living stream")
export { useLiveSignals } from './hooks/useLiveSignals';
export {
  LiveSignalProvider,
  useLiveSignalStore,
  useNodeLiveState,
  useEdgeFlowing,
} from './live/LiveSignalContext';
export type { LiveSignalProviderProps } from './live/LiveSignalContext';
export { LiveSignalStore, defaultLiveDeps } from './live/live-signal-store';

// Run trace: the live log and per-node statistics of a running graph
export { RunTrace, RUN_LOG_CAPACITY, involves } from './live/run-trace';
export type { RunTraceOptions, RunLogEntry, RunDeliveryEntry, RunErrorEntry, NodeRunSummary } from './live/run-trace';
export { RunTraceProvider, useRunTraceStore, useRunTraceVersion } from './live/RunTraceContext';
export type { RunTraceProviderProps } from './live/RunTraceContext';
export { useRunTrace } from './hooks/useRunTrace';
export { RunLog } from './panels/RunLog';
export type { RunLogProps } from './panels/RunLog';
export { NodeRunStats } from './panels/NodeRunStats';
export { previewValue, PREVIEW_LENGTH } from './live/preview';
export { formatDuration, formatElapsed } from './live/format';
export type {
  NodeLiveState,
  EdgeIndexEntry,
  LiveSignalStoreDeps,
} from './live/live-signal-store';
