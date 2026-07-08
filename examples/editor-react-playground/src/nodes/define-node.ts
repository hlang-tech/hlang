/**
 * `defineNode` — the single contract that binds a node's DESIGN-TIME descriptor
 * (kind, ports, default params, shown in the palette / used by validation) to
 * its RUNTIME implementation (an RxJS node class), sharing one `code`.
 *
 * Declaring both together in one file per node removes the classic footgun of
 * keeping a design-time registry and a runtime registry in sync by hand — the
 * `code` cannot drift because there is only one.
 *
 * Port/error-port boilerplate for the R/T/W kinds lives here so each node file
 * declares only what is unique to it.
 */

import type { NodeDescriptor, PortDescriptor, ParamBag } from '@hlang-org/editor-core';
import type { NodeConstructor } from './runtime-boundary';

const DTO = { name: 'DTO', kind: 'interface' as const };

export const port = {
  in: (id = 'Input'): PortDescriptor => ({ id, direction: 'I', name: id, dataType: DTO, isError: false }),
  out: (id = 'Output'): PortDescriptor => ({ id, direction: 'O', name: id, dataType: DTO, isError: false }),
  error: (): PortDescriptor => ({ id: '@node/error', direction: 'O', name: 'error', dataType: DTO, isError: true }),
};

/** A fully-defined node: its palette descriptor + its runtime constructor. */
export interface NodeDefinition {
  readonly descriptor: NodeDescriptor;
  readonly ctor: NodeConstructor;
}

/** Inputs to define one node. Ports default to the canonical R/T/W topology. */
export interface DefineNodeInput {
  readonly code: string;
  readonly kind: NodeDescriptor['kind'];
  readonly displayName: string;
  readonly group: string;
  readonly defaultParams?: ParamBag;
  /** Override the ports; defaults derived from `kind` (+ optional extra ports). */
  readonly ports?: readonly PortDescriptor[];
  /** Extra input port ids to add to the default topology (e.g. merge's A/B). */
  readonly extraInputs?: readonly string[];
  readonly ctor: NodeConstructor;
}

/** Canonical port set for a kind, plus any extra named inputs. */
function defaultPorts(
  kind: NodeDescriptor['kind'],
  extraInputs: readonly string[],
): PortDescriptor[] {
  const extra = extraInputs.map(id => port.in(id));
  switch (kind) {
    case 'R':
      return [port.out(), port.error()];
    case 'T':
      return [port.in(), ...extra, port.out(), port.error()];
    case 'W':
      return [port.in(), ...extra];
  }
}

export function defineNode(input: DefineNodeInput): NodeDefinition {
  const ports = input.ports ?? defaultPorts(input.kind, input.extraInputs ?? []);
  return {
    descriptor: {
      code: input.code,
      kind: input.kind,
      displayName: input.displayName,
      group: input.group,
      ports,
      defaultParams: input.defaultParams ?? {},
      runtimeResource: `@playground/${input.code}@1`,
    },
    ctor: input.ctor,
  };
}
