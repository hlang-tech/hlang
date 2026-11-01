<p align="center">
  <img src="https://raw.githubusercontent.com/hlang-tech/hlang/main/media/logo.png" width="88" alt="hlang">
</p>

# @hlang-org/ir

The hlang intermediate representation. `IGraph` is the JSON form of an hlang program. `planGraph` validates a graph and lowers it to an execution plan. The interpreter and the compiler both start from this plan, so they apply the same rules.

[![npm](https://img.shields.io/npm/v/@hlang-org/ir?color=c8ccd4&labelColor=0f1114)](https://www.npmjs.com/package/@hlang-org/ir)
[![license](https://img.shields.io/npm/l/@hlang-org/ir?color=c8ccd4&labelColor=0f1114)](https://github.com/hlang-tech/hlang/blob/main/LICENSE)

## Install

```sh
npm install @hlang-org/ir
```

The same build is published as `@hlang-tech/ir`. No runtime dependencies. ESM and CommonJS builds with type declarations.

## IGraph

```ts
import type { IGraph } from '@hlang-org/ir';

const graph: IGraph = {
  nodeList: [
    { nodeId: 'a', code: 'numbers', name: 'Numbers', type: 'R', bizData: { params: { count: 3 } } },
    { nodeId: 'b', code: 'log', name: 'Log', type: 'W' },
  ],
  connections: [
    { Output: { nodeId: 'a', portConf: { id: 'out' } }, Input: { nodeId: 'b', portConf: { id: 'in' } } },
  ],
};
```

- `type` is the node kind: `'R'` (Readable), `'T'` (Transform), or `'W'` (Writable).
- `code` selects the node implementation. A backend maps it to a class or a module.
- `bizData` is passed to the node constructor as `config`; parameters are in `bizData.params`.
- In a connection, `Output` is the upstream output port and `Input` is the downstream input port. A missing port id defaults to `Output` and `Input`. The legacy spelling `portConfig.id` is also read.

## planGraph

```ts
import { planGraph, GraphError } from '@hlang-org/ir';

const plan = planGraph(graph);
// {
//   nodes: [{ nodeId: 'a', code: 'numbers', kind: 'R', config: { params: { count: 3 } } }, ...],
//   connections: [{ source: { nodeId: 'a', portId: 'out' }, target: { nodeId: 'b', portId: 'in' } }],
//   roots: ['a'],
// }
```

The plan keeps graph order. `config` is a copy of `bizData` with `params` defaulted to `{}`.

`planGraph` throws a `GraphError` with one of these codes:

| `code` | Cause |
| --- | --- |
| `duplicate-node-id` | Two nodes share a `nodeId`. |
| `invalid-node-kind` | A node `type` is not `R`, `T`, or `W`. |
| `unknown-node` | A connection references a node that is not in `nodeList`. |
| `invalid-connection` | A Writable node is a source, a Readable node is a target, or `@node/error` is a target. |
| `no-readable-root` | The graph has no Readable node to run. |

Transform-to-Transform cycles are valid.

## Exports

- Types: `IGraph`, `INodeInfo`, `IConnection`, `IConnectionEndpoint`, `IBizData`, `IPortInfo`, `IPackageInfo`, `ParamBag`, `ParamValue`, `IParamObject`, `NodeKind`, `ExecutionPlan`, `PlannedNode`, `PlannedConnection`, `PlannedEndpoint`, `GraphErrorCode`.
- Values: `planGraph`, `GraphError`, `ERROR_PORT_NAME` (`'@node/error'`).

Source and documentation: [github.com/hlang-tech/hlang](https://github.com/hlang-tech/hlang).

## License

MIT
