/**
 * `useClipboard` — copy / cut / paste / duplicate / delete for the selected
 * nodes, orchestrated in the binding layer (which owns the id generator, command
 * service and selection).
 *
 * Design & invariants:
 *  - The clipboard is PRESENTATION state — an in-memory snapshot of cloned nodes
 *    plus the edges internal to the copied set. It never enters IGraph or the
 *    undo history.
 *  - Every GRAPH mutation goes through `ICommandService`, and multi-part actions
 *    (paste/duplicate/delete of several nodes + edges) are wrapped in
 *    `history.transact(...)` so they undo as a SINGLE step.
 *  - Cloning is delegated to the pure `cloneNodesWithEdges` from editor-core, so
 *    id-minting and internal-edge remapping are tested independently.
 *  - After paste/duplicate the new nodes become the selection; after cut/delete
 *    the selection is cleared (selection is not auto-pruned on node removal).
 */

import { useCallback, useMemo, useRef } from 'react';
import type { EditorCore, EditorEdge, EditorNode, Point } from '@hlang-org/editor-core';
import { AddNodeCommand, ConnectCommand, RemoveNodeCommand, cloneNodesWithEdges } from '@hlang-org/editor-core';

/** A self-contained snapshot of copied nodes + their internal edges. */
interface Clipboard {
  readonly nodes: readonly EditorNode[];
  readonly edges: readonly EditorEdge[];
}

/** Tagged envelope written to the system clipboard so pasted text is verifiable. */
interface ClipboardEnvelope extends Clipboard {
  readonly __hlang_clipboard: 1;
}

export interface ClipboardState {
  /** Copy the current selection into the clipboard (no graph change). */
  copy(): void;
  /** Copy the selection, then delete it as one undo step. */
  cut(): void;
  /**
   * Paste the clipboard as fresh nodes, selecting them. If `flowPos` is given
   * (the canvas cursor in flow space), the pasted set is anchored there; else a
   * small fixed offset is used. Prefers the system clipboard (cross-document),
   * falling back to the in-memory copy. Async because it reads the OS clipboard.
   */
  paste(flowPos?: Point): void;
  /** Clone the current selection in place (offset), selecting the clones. */
  duplicate(): void;
  /** Delete the current selection as one undo step. */
  remove(): void;
  /** Whether the in-memory clipboard holds something to paste. */
  canPaste(): boolean;
}

/**
 * Fixed diagonal nudge for a paste/duplicate that has no cursor target, so the
 * clone doesn't land exactly on top of the original and become invisible. This
 * is a deliberate presentation constant (a small visible offset), not a value
 * derived from graph data — hence a named constant rather than an inline magic
 * number. When a cursor position is supplied, this is ignored (see paste()).
 */
const PASTE_OFFSET = { dx: 28, dy: 28 } as const;

/** Compute the offset that moves a clip's top-left anchor onto `target`. */
function offsetToAnchor(clip: Clipboard, target: Point): { dx: number; dy: number } {
  let minX = Infinity;
  let minY = Infinity;
  for (const n of clip.nodes) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return PASTE_OFFSET;
  }
  return { dx: target.x - minX, dy: target.y - minY };
}

/** Parse a system-clipboard string into a clip, or null if it isn't ours. */
function parseEnvelope(text: string): Clipboard | null {
  try {
    const parsed = JSON.parse(text) as Partial<ClipboardEnvelope>;
    if (parsed.__hlang_clipboard === 1 && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return { nodes: parsed.nodes, edges: parsed.edges };
    }
  } catch {
    // Not JSON / not ours — ignore.
  }
  return null;
}

/** Read the selected nodes and the edges wholly internal to that set. */
function readSelection(core: EditorCore): { nodes: EditorNode[]; edges: EditorEdge[] } {
  const ids = core.selection.getSelectedNodes();
  const nodes: EditorNode[] = [];
  for (const id of ids) {
    const node = core.model.getNode(id);
    if (node !== undefined) {
      nodes.push(node);
    }
  }
  const edges = core.model
    .getEdges()
    .filter(e => ids.has(e.source.nodeId) && ids.has(e.target.nodeId));
  return { nodes, edges };
}

/** Add the given nodes + edges as one undoable transaction; select the nodes. */
function insert(core: EditorCore, nodes: readonly EditorNode[], edges: readonly EditorEdge[], label: string): void {
  if (nodes.length === 0) {
    return;
  }
  core.history.transact(label, () => {
    for (const node of nodes) {
      core.commands.execute(new AddNodeCommand(node));
    }
    for (const edge of edges) {
      core.commands.execute(new ConnectCommand(edge.id, edge.source, edge.target));
    }
  });
  core.selection.selectNodes(nodes.map(n => n.id), 'replace');
}

/** Best-effort write to the OS clipboard (may be unavailable / denied). */
function writeSystemClipboard(clip: Clipboard): void {
  const envelope: ClipboardEnvelope = { __hlang_clipboard: 1, nodes: clip.nodes, edges: clip.edges };
  try {
    void navigator.clipboard?.writeText(JSON.stringify(envelope));
  } catch {
    // Clipboard API unavailable (insecure context, permissions) — ref still holds it.
  }
}

export function useClipboard(core: EditorCore): ClipboardState {
  const clipboard = useRef<Clipboard | null>(null);

  const copy = useCallback((): void => {
    const { nodes, edges } = readSelection(core);
    if (nodes.length === 0) {
      return;
    }
    // Snapshot immediately so later edits to the source can't mutate the copy,
    // and mirror to the OS clipboard so it survives across documents/tabs.
    clipboard.current = { nodes, edges };
    writeSystemClipboard(clipboard.current);
  }, [core]);

  const remove = useCallback((): void => {
    const ids = [...core.selection.getSelectedNodes()];
    if (ids.length === 0) {
      return;
    }
    core.history.transact('Delete', () => {
      // RemoveNodeCommand cascades to incident edges and restores them on undo.
      for (const id of ids) {
        core.commands.execute(new RemoveNodeCommand(id));
      }
    });
    core.selection.clear();
  }, [core]);

  const cut = useCallback((): void => {
    copy();
    remove();
  }, [copy, remove]);

  const pasteClip = useCallback(
    (clip: Clipboard, flowPos?: Point): void => {
      if (clip.nodes.length === 0) {
        return;
      }
      const offset = flowPos !== undefined ? offsetToAnchor(clip, flowPos) : PASTE_OFFSET;
      const { nodes, edges } = cloneNodesWithEdges(clip.nodes, clip.edges, core.idGenerator, offset);
      insert(core, nodes, edges, 'Paste');
    },
    [core],
  );

  const paste = useCallback(
    (flowPos?: Point): void => {
      // Prefer the OS clipboard (supports cross-document paste); fall back to the
      // in-memory ref if it's unavailable, denied, or holds foreign text.
      const readSystem = async (): Promise<void> => {
        try {
          const text = await navigator.clipboard?.readText();
          const fromSystem = text !== undefined ? parseEnvelope(text) : null;
          if (fromSystem !== null) {
            pasteClip(fromSystem, flowPos);
            return;
          }
        } catch {
          // fall through to ref
        }
        if (clipboard.current !== null) {
          pasteClip(clipboard.current, flowPos);
        }
      };
      void readSystem();
    },
    [pasteClip],
  );

  const duplicate = useCallback((): void => {
    const { nodes: selNodes, edges: selEdges } = readSelection(core);
    if (selNodes.length === 0) {
      return;
    }
    const { nodes, edges } = cloneNodesWithEdges(selNodes, selEdges, core.idGenerator, PASTE_OFFSET);
    insert(core, nodes, edges, 'Duplicate');
  }, [core]);

  const canPaste = useCallback((): boolean => clipboard.current !== null, []);

  return useMemo<ClipboardState>(
    () => ({ copy, cut, paste, duplicate, remove, canPaste }),
    [copy, cut, paste, duplicate, remove, canPaste],
  );
}
