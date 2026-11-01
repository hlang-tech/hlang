/**
 * @hlang-org/editor-react
 *
 * React bindings for the hlang visual editor. Hooks and context that connect a
 * headless `@hlang-org/editor-core` to React Flow (`@xyflow/react`). This is the
 * ONLY layer that imports React Flow — the core stays framework-agnostic, and
 * design-system styling lives in `@hlang-org/editor-ui`, not here.
 */

export { EditorProvider, useEditor } from './context';
export type { EditorProviderProps } from './context';

export { useGraphSync } from './hooks/useGraphSync';
export type { GraphView } from './hooks/useGraphSync';

export { useConnect, useIsValidConnection } from './hooks/useConnect';
export { useNodeChanges, useEdgeChanges } from './hooks/useChanges';
export { useHistory } from './hooks/useHistory';
export type { HistoryState } from './hooks/useHistory';
export { useSelection } from './hooks/useSelection';
export type { SelectionState } from './hooks/useSelection';
export { useViewState } from './hooks/useViewState';
export type { ViewStateState } from './hooks/useViewState';
export { useClipboard } from './hooks/useClipboard';
export type { ClipboardState } from './hooks/useClipboard';
export { useRename } from './hooks/useRename';
export type { RenameHandle } from './hooks/useRename';
export { useDiagnostics } from './hooks/useDiagnostics';
export type { DiagnosticsState } from './hooks/useDiagnostics';
export { useReconnect } from './hooks/useReconnect';
export type { ReconnectHandle, NodeBox } from './hooks/useReconnect';
export { useHlangFlow } from './hooks/useHlangFlow';
export type { HlangFlowProps } from './hooks/useHlangFlow';

export { toRFNode, toRFEdge, endpointsFromConnection } from './mapping/convert';
export type { NodeViewState } from './mapping/convert';
export { findPort } from './mapping/types';
export type {
  HlangNodeData,
  HlangEdgeData,
  HlangRFNode,
  HlangRFEdge,
} from './mapping/types';
