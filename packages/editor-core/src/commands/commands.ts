/**
 * Concrete reversible commands. Each captures exactly what it needs to undo.
 *
 * Removal commands snapshot the removed subgraph (node + incident edges),
 * because `GraphModel.removeNode` cascades — without the snapshot, undo could
 * not restore the deleted edges.
 */

import type {
  EditorEdge,
  EditorNode,
  EdgeId,
  Endpoint,
  NodeId,
  ParamBag,
  Point,
} from '../model/types';
import type { CommandContext, IEditorCommand } from '../services/interfaces';
import { CommandValidationError } from '../services/command-service';

/** Add a node. Undo removes it (and — trivially — nothing else yet). */
export class AddNodeCommand implements IEditorCommand {
  readonly kind = 'addNode';
  readonly label = 'Add Node';
  constructor(private readonly node: EditorNode) {}
  execute(ctx: CommandContext): void {
    ctx.model.addNode(this.node);
    ctx.bus.emit({ kind: 'nodeAdded', node: this.node });
  }
  undo(ctx: CommandContext): void {
    ctx.model.removeNode(this.node.id);
    ctx.bus.emit({ kind: 'nodeRemoved', nodeId: this.node.id });
  }
}

/** Remove a node and its incident edges; undo restores the whole subgraph. */
export class RemoveNodeCommand implements IEditorCommand {
  readonly kind = 'removeNode';
  readonly label = 'Remove Node';
  private removedNode?: EditorNode;
  private removedEdges: readonly EditorEdge[] = [];
  constructor(private readonly nodeId: NodeId) {}
  execute(ctx: CommandContext): void {
    const node = ctx.model.getNode(this.nodeId);
    if (node === undefined) {
      throw new CommandValidationError({
        ok: false,
        reason: 'missing-node',
        message: `Node "${this.nodeId}" does not exist.`,
      });
    }
    this.removedNode = node;
    this.removedEdges = ctx.model.incidentEdges(this.nodeId);
    ctx.model.removeNode(this.nodeId);
    for (const edge of this.removedEdges) {
      ctx.bus.emit({ kind: 'edgeRemoved', edgeId: edge.id });
    }
    ctx.bus.emit({ kind: 'nodeRemoved', nodeId: this.nodeId });
  }
  undo(ctx: CommandContext): void {
    if (this.removedNode === undefined) {
      return;
    }
    ctx.model.addNode(this.removedNode);
    ctx.bus.emit({ kind: 'nodeAdded', node: this.removedNode });
    for (const edge of this.removedEdges) {
      ctx.model.addEdge(edge);
      ctx.bus.emit({ kind: 'edgeAdded', edge });
    }
  }
}

/** Connect two endpoints (validated). Undo removes the created edge. */
export class ConnectCommand implements IEditorCommand {
  readonly kind = 'connect';
  readonly label = 'Connect Nodes';
  constructor(
    private readonly edgeId: EdgeId,
    private readonly source: Endpoint,
    private readonly target: Endpoint,
  ) {}
  execute(ctx: CommandContext): void {
    const result = ctx.validator.validate(this.source, this.target, ctx.model);
    if (!result.ok) {
      throw new CommandValidationError(result);
    }
    const edge: EditorEdge = {
      id: this.edgeId,
      source: this.source,
      target: this.target,
    };
    ctx.model.addEdge(edge);
    ctx.bus.emit({ kind: 'edgeAdded', edge });
  }
  undo(ctx: CommandContext): void {
    ctx.model.removeEdge(this.edgeId);
    ctx.bus.emit({ kind: 'edgeRemoved', edgeId: this.edgeId });
  }
}

/** Remove an edge; undo restores it. */
export class DisconnectCommand implements IEditorCommand {
  readonly kind = 'disconnect';
  readonly label = 'Disconnect';
  private removedEdge?: EditorEdge;
  constructor(private readonly edgeId: EdgeId) {}
  execute(ctx: CommandContext): void {
    const edge = ctx.model.getEdge(this.edgeId);
    if (edge === undefined) {
      throw new CommandValidationError({
        ok: false,
        reason: 'missing-edge',
        message: `Edge "${this.edgeId}" does not exist.`,
      });
    }
    this.removedEdge = edge;
    ctx.model.removeEdge(this.edgeId);
    ctx.bus.emit({ kind: 'edgeRemoved', edgeId: this.edgeId });
  }
  undo(ctx: CommandContext): void {
    if (this.removedEdge === undefined) {
      return;
    }
    ctx.model.addEdge(this.removedEdge);
    ctx.bus.emit({ kind: 'edgeAdded', edge: this.removedEdge });
  }
}

/** Move a node; captures the previous position for undo. */
export class MoveNodeCommand implements IEditorCommand {
  readonly kind = 'moveNode';
  readonly label = 'Move Node';
  private previous?: Point;
  constructor(
    private readonly nodeId: NodeId,
    private readonly next: Point,
  ) {}
  execute(ctx: CommandContext): void {
    const node = ctx.model.getNode(this.nodeId);
    if (node === undefined) {
      throw new CommandValidationError({
        ok: false,
        reason: 'missing-node',
        message: `Node "${this.nodeId}" does not exist.`,
      });
    }
    this.previous = node.position;
    ctx.model.updateNodePosition(this.nodeId, this.next);
    emitChanged(ctx, this.nodeId);
  }
  undo(ctx: CommandContext): void {
    if (this.previous === undefined) {
      return;
    }
    ctx.model.updateNodePosition(this.nodeId, this.previous);
    emitChanged(ctx, this.nodeId);
  }
}

/** Update a node's params; captures the previous params for undo. */
export class UpdateParamsCommand implements IEditorCommand {
  readonly kind = 'updateParams';
  readonly label = 'Update Parameters';
  private previous?: ParamBag;
  constructor(
    private readonly nodeId: NodeId,
    private readonly next: ParamBag,
  ) {}
  execute(ctx: CommandContext): void {
    const node = ctx.model.getNode(this.nodeId);
    if (node === undefined) {
      throw new CommandValidationError({
        ok: false,
        reason: 'missing-node',
        message: `Node "${this.nodeId}" does not exist.`,
      });
    }
    this.previous = node.params;
    ctx.model.updateNodeParams(this.nodeId, this.next);
    emitChanged(ctx, this.nodeId);
  }
  undo(ctx: CommandContext): void {
    if (this.previous === undefined) {
      return;
    }
    ctx.model.updateNodeParams(this.nodeId, this.previous);
    emitChanged(ctx, this.nodeId);
  }
}

/** Rename a node (top-level `name`); captures the previous name for undo. */
export class RenameNodeCommand implements IEditorCommand {
  readonly kind = 'renameNode';
  readonly label = 'Rename Node';
  private previous?: string;
  constructor(
    private readonly nodeId: NodeId,
    private readonly next: string,
  ) {}
  execute(ctx: CommandContext): void {
    const node = ctx.model.getNode(this.nodeId);
    if (node === undefined) {
      throw new CommandValidationError({
        ok: false,
        reason: 'missing-node',
        message: `Node "${this.nodeId}" does not exist.`,
      });
    }
    this.previous = node.name;
    ctx.model.updateNodeName(this.nodeId, this.next);
    emitChanged(ctx, this.nodeId);
  }
  undo(ctx: CommandContext): void {
    if (this.previous === undefined) {
      return;
    }
    ctx.model.updateNodeName(this.nodeId, this.previous);
    emitChanged(ctx, this.nodeId);
  }
}

function emitChanged(ctx: CommandContext, nodeId: NodeId): void {
  const node = ctx.model.getNode(nodeId);
  if (node !== undefined) {
    ctx.bus.emit({ kind: 'nodeChanged', node });
  }
}

/**
 * Set a node's `hidden` view flag; undo restores the prior value. The flag lives
 * in the (non-serialized) view-state service, but the toggle is a command so it
 * participates in undo/redo — a user who hides the wrong layer expects ⌘Z.
 */
export class SetHiddenCommand implements IEditorCommand {
  readonly kind = 'setHidden';
  readonly label = 'Toggle Visibility';
  private previous = false;
  constructor(
    private readonly nodeId: NodeId,
    private readonly next: boolean,
  ) {}
  execute(ctx: CommandContext): void {
    this.previous = ctx.viewState.isHidden(this.nodeId);
    ctx.viewState.setHidden(this.nodeId, this.next);
  }
  undo(ctx: CommandContext): void {
    ctx.viewState.setHidden(this.nodeId, this.previous);
  }
}

/** Set a node's `locked` view flag; undo restores the prior value. */
export class SetLockedCommand implements IEditorCommand {
  readonly kind = 'setLocked';
  readonly label = 'Toggle Lock';
  private previous = false;
  constructor(
    private readonly nodeId: NodeId,
    private readonly next: boolean,
  ) {}
  execute(ctx: CommandContext): void {
    this.previous = ctx.viewState.isLocked(this.nodeId);
    ctx.viewState.setLocked(this.nodeId, this.next);
  }
  undo(ctx: CommandContext): void {
    ctx.viewState.setLocked(this.nodeId, this.previous);
  }
}
