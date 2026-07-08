/**
 * `ConnectionValidator` — encodes hlang's wiring rules so the editor never
 * builds a graph the runtime would reject at `O.connect(I)`.
 *
 * Rules (all traceable to runtime source):
 *   1. Direction: source must be an O port, target an I port.
 *   2. Kind legality falls out of (1): W has no O port (never a source),
 *      R has no I port (never a target), `@node/error` is O (source-only).
 *   3. Port DTO compatibility (stricter than the runtime, which only checks
 *      I/O) — prevents silent shape mismatches.
 *   4. No duplicate edge between the exact same endpoints.
 *   5. Cycles are ALWAYS allowed — T<->T feedback is a first-class feature.
 */

import type { DataType, Endpoint, PortDescriptor } from '../model/types';
import { findPort } from '../model/types';
import type {
  IConnectionValidator,
  IGraphModel,
  ValidationResult,
} from './interfaces';

const OK: ValidationResult = { ok: true };

function fail(reason: string, message: string): ValidationResult {
  return { ok: false, reason, message };
}

/** Two data types are compatible if either side is unknown, or names match. */
function typesCompatible(a: DataType, b: DataType): boolean {
  if (a.kind === 'unknown' || b.kind === 'unknown') {
    return true;
  }
  // Interface DTOs are structurally opaque here; treat matching names as
  // compatible and, pragmatically, allow generic "DTO"-style interface ports
  // to interconnect (the runtime carries arbitrary payloads on the stream).
  if (a.kind === 'interface' && b.kind === 'interface') {
    return true;
  }
  return a.name === b.name;
}

export class ConnectionValidator implements IConnectionValidator {
  validate(source: Endpoint, target: Endpoint, model: IGraphModel): ValidationResult {
    if (source.nodeId === target.nodeId) {
      return fail('self-connection', 'A node cannot connect to itself.');
    }

    const sourceNode = model.getNode(source.nodeId);
    const targetNode = model.getNode(target.nodeId);
    if (sourceNode === undefined || targetNode === undefined) {
      return fail('missing-node', 'Source or target node does not exist.');
    }

    const sourcePort = findPort(sourceNode.ports, source.portId);
    const targetPort = findPort(targetNode.ports, target.portId);
    if (sourcePort === undefined || targetPort === undefined) {
      return fail('missing-port', 'Source or target port does not exist.');
    }

    // Rules 1-3 (direction + DTO) are model-free — delegate to canLink.
    const link = this.canLink(sourcePort, targetPort);
    if (!link.ok) {
      return link;
    }

    // Rule 4: no exact-duplicate edge.
    for (const edge of model.getEdges()) {
      if (
        edge.source.nodeId === source.nodeId &&
        edge.source.portId === source.portId &&
        edge.target.nodeId === target.nodeId &&
        edge.target.portId === target.portId
      ) {
        return fail('duplicate', 'This exact connection already exists.');
      }
    }

    // Rule 5: cycles are intentionally NOT checked here.
    return OK;
  }

  canLink(sourcePort: PortDescriptor, targetPort: PortDescriptor): ValidationResult {
    // Rule 1 (and 2 by consequence): O -> I only.
    if (sourcePort.direction !== 'O') {
      return fail('bad-direction', 'The source endpoint must be an output (O) port.');
    }
    if (targetPort.direction !== 'I') {
      return fail('bad-direction', 'The target endpoint must be an input (I) port.');
    }

    // Rule 3: DTO compatibility.
    if (!typesCompatible(sourcePort.dataType, targetPort.dataType)) {
      return fail(
        'type-mismatch',
        `Port types are incompatible: "${sourcePort.dataType.name}" -> "${targetPort.dataType.name}".`,
      );
    }

    return OK;
  }
}

