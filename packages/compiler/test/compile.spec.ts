/**
 * Behavior tests for `compile`.
 *
 * The central check is parity: the same IGraph and the same node modules are
 * executed by `@hlang-org/interpreter` in-process and, compiled by this
 * package, as an ES module in a separate Node.js process. Both must deliver the
 * same values to the same sinks.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Flow } from '@hlang-org/runtime';
import { interpret, NodeRegistry } from '@hlang-org/interpreter';
import type { NodeConstructor } from '@hlang-org/interpreter';
import Collect from './fixtures/nodes/collect.mts';
import FailingSink from './fixtures/nodes/failing-sink.mts';
import Faulty from './fixtures/nodes/faulty.mts';
import Loop from './fixtures/nodes/loop.mts';
import Pair from './fixtures/nodes/pair.mts';
import Scale from './fixtures/nodes/scale.mts';
import Source from './fixtures/nodes/source.mts';
import TeardownTicker from './fixtures/nodes/teardown-ticker.mts';
import Ticker from './fixtures/nodes/ticker.mts';
import type { SinkEntry } from './fixtures/nodes/support.mts';
import type { IConnection, IGraph, INodeInfo, NodeKind, ParamBag } from '@hlang-org/ir';
import { compile, CompileError, GraphError } from '../src';
import type { NodeImport } from '../src';

const FIXTURES = join(__dirname, 'fixtures', 'nodes');
const GENERATED = join(__dirname, '.generated');
/** The fixture node classes, by node code; both backends run these same classes. */
const FIXTURE_NODES: Readonly<Record<string, NodeConstructor>> = {
  source: Source,
  scale: Scale,
  pair: Pair,
  collect: Collect,
  faulty: Faulty,
  'failing-sink': FailingSink,
  loop: Loop,
  ticker: Ticker,
  'teardown-ticker': TeardownTicker,
};

/** Each node code imports the default export of its fixture module. */
const NODES: Record<string, NodeImport> = Object.fromEntries(
  Object.keys(FIXTURE_NODES).map((code) => [code, { from: pathToFileURL(join(FIXTURES, `${code}.mts`)).href }]),
);

function node(nodeId: string, code: string, type: NodeKind, params: ParamBag = {}): INodeInfo {
  return { nodeId, code, name: nodeId, type, bizData: { params } };
}

function link(from: string, to: string, fromPort = 'out', toPort = 'in'): IConnection {
  return { Output: { nodeId: from, portConf: { id: fromPort } }, Input: { nodeId: to, portConf: { id: toPort } } };
}

/** A diamond-shaped program: two sources, a transform, a two-input join, two sinks. */
const PROGRAM: IGraph = {
  nodeList: [
    node('numbers', 'source', 'R', { values: [1, 2, 3] }),
    node('words', 'source', 'R', { values: ['x', 'y'] }),
    node('double', 'scale', 'T', { factor: 2 }),
    node('join', 'pair', 'T'),
    node('scaled', 'collect', 'W'),
    node('joined', 'collect', 'W'),
  ],
  connections: [
    link('numbers', 'double'),
    link('double', 'scaled'),
    link('double', 'join', 'out', 'a'),
    link('words', 'join', 'out', 'b'),
    link('join', 'joined'),
  ],
};

/** Runs `graph` with the interpreter; the fixture sinks report through the `record` middleware. */
function runInterpreted(graph: IGraph): SinkEntry[] {
  const registry = new NodeRegistry();
  for (const [code, nodeClass] of Object.entries(FIXTURE_NODES)) {
    registry.register(code, nodeClass);
  }
  const entries: SinkEntry[] = [];
  const handle = interpret(graph, { registry, createFlow: (options) => new Flow(options) }, { middleware: { record: (entry: SinkEntry) => entries.push(entry) } });
  handle.dispose();
  return entries;
}

/** Runs the compiled program once and prints what its sinks reported through `record`. */
const RUN_AND_PRINT_RECORDED =
  'const entries = []; const handle = program.run({ middleware: { record: (entry) => entries.push(entry) } }); handle.dispose(); console.log(JSON.stringify(entries));';

let fileCounter = 0;

/** Write the compiled module next to this package's node_modules and run `script` against it. */
function runCompiled(code: string, script: string): string {
  mkdirSync(GENERATED, { recursive: true });
  fileCounter += 1;
  const file = join(GENERATED, `program-${process.pid}-${fileCounter}.mjs`);
  writeFileSync(file, code);
  const runner = `import * as program from ${JSON.stringify(pathToFileURL(file).href)};\n${script}`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', runner], {
    encoding: 'utf8',
    timeout: 10_000,
  });
  if (result.status !== 0) {
    throw new Error(`compiled program failed (${String(result.status)}): ${result.stderr}`);
  }
  return result.stdout.trim();
}

describe('compile', () => {
  it('emits a deterministic ES module', () => {
    const first = compile(PROGRAM, { nodes: NODES });
    const second = compile(PROGRAM, { nodes: NODES });
    expect(second.code).toBe(first.code);
    const portable = compile(PROGRAM, {
      nodes: Object.fromEntries(Object.keys(FIXTURE_NODES).map((code) => [code, { from: `./nodes/${code}.js` }])),
    });
    expect(portable.code).toMatchSnapshot();
  });

  it('reports the modules the program imports', () => {
    const { imports } = compile(PROGRAM, { nodes: NODES });
    expect(imports).toEqual(
      ['@hlang-org/runtime', 'rxjs', NODES.source?.from, NODES.scale?.from, NODES.pair?.from, NODES.collect?.from],
    );
  });

  it('delivers the same values as the interpreter', () => {
    const expected = runInterpreted(PROGRAM);
    expect(expected.length).toBeGreaterThan(0);

    const { code } = compile(PROGRAM, { nodes: NODES });
    const output = runCompiled(
      code,
      RUN_AND_PRINT_RECORDED,
    );
    expect(JSON.parse(output)).toEqual(expected);
  });

  it('delivers on every connection between the same two nodes, in both backends', () => {
    // One output feeds both inputs of `join`: two connections between one pair of nodes.
    const graph: IGraph = {
      nodeList: [node('numbers', 'source', 'R', { values: [1] }), node('join', 'pair', 'T'), node('joined', 'collect', 'W')],
      connections: [link('numbers', 'join', 'out', 'a'), link('numbers', 'join', 'out', 'b'), link('join', 'joined')],
    };
    const expected = [
      { nodeId: 'joined', value: 'a:1' },
      { nodeId: 'joined', value: 'b:1' },
    ];

    expect(runInterpreted(graph)).toEqual(expected);
    const { code } = compile(graph, { nodes: NODES });
    const output = runCompiled(
      code,
      RUN_AND_PRINT_RECORDED,
    );
    expect(JSON.parse(output)).toEqual(expected);
  });

  it('passes flowId, env, middleware, and config to every node like the interpreter', () => {
    const graph: IGraph = {
      nodeList: [node('a', 'source', 'R', { values: [1] }), node('b', 'collect', 'W')],
      connections: [link('a', 'b')],
    };
    const { code } = compile(graph, { nodes: NODES });
    const output = runCompiled(
      code,
      [
        "const handle = program.run({ flowId: 'f-1', env: 'test', middleware: { tag: 'm' } });",
        'const opts = handle.nodes.a.opts;',
        'console.log(JSON.stringify({ flowId: handle.flowId, nodeId: opts.nodeId, optsFlowId: opts.flowId, env: opts.env, middleware: opts.middleware, config: opts.config, hasSignal: typeof opts.signal.onStop }));',
        'handle.dispose();',
      ].join('\n'),
    );
    expect(JSON.parse(output)).toEqual({
      flowId: 'f-1',
      nodeId: 'a',
      optsFlowId: 'f-1',
      env: 'test',
      middleware: { tag: 'm' },
      config: { params: { values: [1] } },
      hasSignal: 'function',
    });
  });

  it('gives nodes a frozen copy of the middleware, in both backends', () => {
    // Middleware carries the host's services; nodes cannot add to it to share state.
    const graph: IGraph = { nodeList: [node('a', 'source', 'R', { values: [] })], connections: [] };
    const host = { tag: 'm' };
    const registry = new NodeRegistry();
    registry.register('source', Source);
    const handle = interpret(graph, { registry, createFlow: (options) => new Flow(options) }, { middleware: host });
    const interpreted = handle.getNode('a');
    const middleware: unknown = interpreted !== undefined && 'opts' in interpreted && typeof interpreted.opts === 'object' && interpreted.opts !== null && 'middleware' in interpreted.opts ? interpreted.opts.middleware : undefined;
    handle.dispose();
    expect({ frozen: Object.isFrozen(middleware), hostFrozen: Object.isFrozen(host), middleware }).toEqual({
      frozen: true,
      hostFrozen: false,
      middleware: { tag: 'm' },
    });

    const output = runCompiled(
      compile(graph, { nodes: NODES }).code,
      "const host = { tag: 'm' }; const handle = program.run({ middleware: host }); const m = handle.nodes.a.opts.middleware; console.log(JSON.stringify({ frozen: Object.isFrozen(m), hostFrozen: Object.isFrozen(host), middleware: m })); handle.dispose();",
    );
    expect(JSON.parse(output)).toEqual({ frozen: true, hostFrozen: false, middleware: { tag: 'm' } });
  });

  it('defaults env to "prod" and generates a flow id', () => {
    const graph: IGraph = { nodeList: [node('a', 'source', 'R', { values: [] })], connections: [] };
    const output = runCompiled(
      compile(graph, { nodes: NODES }).code,
      'const handle = program.run(); console.log(JSON.stringify({ env: handle.nodes.a.opts.env, flowId: typeof handle.flowId })); handle.dispose();',
    );
    expect(JSON.parse(output)).toEqual({ env: 'prod', flowId: 'string' });
  });

  it('stops long-running nodes on dispose', () => {
    const graph: IGraph = {
      nodeList: [node('tick', 'ticker', 'R'), node('out', 'collect', 'W')],
      connections: [link('tick', 'out')],
    };
    const output = runCompiled(
      compile(graph, { nodes: NODES }).code,
      [
        'const entries = [];',
        'const handle = program.run({ middleware: { record: (entry) => entries.push(entry) } });',
        'await new Promise((resolve) => setTimeout(resolve, 60));',
        'handle.dispose();',
        'const stopped = entries.length;',
        'await new Promise((resolve) => setTimeout(resolve, 60));',
        'console.log(JSON.stringify({ ticked: stopped > 0, stable: entries.length === stopped }));',
      ].join('\n'),
    );
    // The process exiting at all proves no interval outlived dispose().
    expect(JSON.parse(output)).toEqual({ ticked: true, stable: true });
  });

  it('disposes the runtime flow on dispose, so node teardowns run', () => {
    const graph: IGraph = {
      nodeList: [node('tick', 'teardown-ticker', 'R'), node('out', 'collect', 'W')],
      connections: [link('tick', 'out')],
    };
    const output = runCompiled(
      compile(graph, { nodes: NODES }).code,
      [
        'const entries = [];',
        'const handle = program.run({ middleware: { record: (entry) => entries.push(entry) } });',
        'await new Promise((resolve) => setTimeout(resolve, 60));',
        'handle.dispose();',
        'const stopped = entries.length;',
        'await new Promise((resolve) => setTimeout(resolve, 60));',
        'console.log(JSON.stringify({ ticked: stopped > 0, stable: entries.length === stopped }));',
      ].join('\n'),
    );
    // The process exiting at all proves the teardown cleared the interval.
    expect(JSON.parse(output)).toEqual({ ticked: true, stable: true });
  });

  it('reports node errors through onError', () => {
    const graph: IGraph = {
      nodeList: [node('a', 'source', 'R', { values: [7] }), node('f', 'faulty', 'T'), node('w', 'collect', 'W')],
      connections: [link('a', 'f'), link('f', 'w')],
    };
    const output = runCompiled(
      compile(graph, { nodes: NODES }).code,
      'const errors = []; const handle = program.run({ onError: (event) => errors.push(event) }); handle.dispose(); console.log(JSON.stringify(errors));',
    );
    expect(JSON.parse(output)).toEqual([{ nodeId: 'f', error: 'bad:7' }]);
  });

  it('runs a graph that loops forever in slices when asked, and stops it on dispose', () => {
    const graph: IGraph = {
      nodeList: [node('a', 'source', 'R', { values: [1] }), node('x', 'loop', 'T'), node('y', 'loop', 'T')],
      connections: [link('a', 'x'), link('x', 'y'), link('y', 'x')],
    };
    const output = runCompiled(
      compile(graph, { nodes: NODES }).code,
      [
        'let count = 0;',
        "const handle = program.run({ slice: { budgetMs: 1 }, middleware: { record: () => { count += 1; } } });",
        // run() returned and this timer fires: the loop shares the thread.
        'await new Promise((resolve) => setTimeout(resolve, 40));',
        'handle.dispose();',
        'const stopped = count;',
        'await new Promise((resolve) => setTimeout(resolve, 40));',
        'console.log(JSON.stringify({ looped: stopped > 0, stopped: count === stopped }));',
      ].join('\n'),
    );
    // The child process exiting at all proves dispose ended the loop.
    expect(JSON.parse(output)).toEqual({ looped: true, stopped: true });
  });

  it('reports the same node errors as the interpreter', () => {
    const graph: IGraph = {
      nodeList: [
        node('a', 'source', 'R', { values: [7, 8] }),
        node('f', 'faulty', 'T'),
        node('w', 'failing-sink', 'W'),
      ],
      connections: [link('a', 'f'), link('a', 'w')],
    };
    const describe = (error: unknown): unknown => (error instanceof Error ? error.message : error);
    const registry = new NodeRegistry();
    for (const [code, nodeClass] of Object.entries(FIXTURE_NODES)) {
      registry.register(code, nodeClass);
    }
    const interpreted: unknown[] = [];
    const handle = interpret(graph, { registry, createFlow: (options) => new Flow(options) });
    handle.onError(({ nodeId, error }) => interpreted.push({ nodeId, error: describe(error) }));
    handle.dispose();

    const compiled: unknown = JSON.parse(
      runCompiled(
        compile(graph, { nodes: NODES }).code,
        'const errors = []; const handle = program.run({ onError: ({ nodeId, error }) => errors.push({ nodeId, error: error instanceof Error ? error.message : error }) }); handle.dispose(); console.log(JSON.stringify(errors));',
      ),
    );

    expect(interpreted).toEqual([
      { nodeId: 'f', error: 'bad:7' },
      { nodeId: 'w', error: 'sink:7' },
      { nodeId: 'f', error: 'bad:8' },
      { nodeId: 'w', error: 'sink:8' },
    ]);
    expect(compiled).toEqual(interpreted);
  });

  it('reports a Writable handler failure through onError with its node id', () => {
    const graph: IGraph = {
      nodeList: [node('a', 'source', 'R', { values: [7] }), node('w', 'failing-sink', 'W')],
      connections: [link('a', 'w')],
    };
    const output = runCompiled(
      compile(graph, { nodes: NODES }).code,
      'const errors = []; const handle = program.run({ onError: ({ nodeId, error }) => errors.push({ nodeId, error: error.message }) }); handle.dispose(); console.log(JSON.stringify(errors));',
    );
    expect(JSON.parse(output)).toEqual([{ nodeId: 'w', error: 'sink:7' }]);
  });

  it('serializes nested params, including keys that are not identifiers', () => {
    const graph: IGraph = {
      nodeList: [
        node('a', 'source', 'R', { values: [-1, 0.5, 'q"uote', null, true, { 'a-b': [1, { c: false }] }], ['__proto__']: 'own' }),
        node('b', 'collect', 'W'),
      ],
      connections: [link('a', 'b')],
    };
    const output = runCompiled(
      compile(graph, { nodes: NODES }).code,
      'const handle = program.run(); const p = handle.nodes.a.opts.config.params; console.log(JSON.stringify({ values: p.values, proto: Object.prototype.hasOwnProperty.call(p, "__proto__") })); handle.dispose();',
    );
    expect(JSON.parse(output)).toEqual({
      values: [-1, 0.5, 'q"uote', null, true, { 'a-b': [1, { c: false }] }],
      proto: true,
    });
  });

  it('rejects a node code without an import', () => {
    const graph: IGraph = { nodeList: [node('a', 'unknown', 'R')], connections: [] };
    expect(() => compile(graph, { nodes: NODES })).toThrow(CompileError);
    expect(() => compile(graph, { nodes: NODES })).toThrow(/unknown/);
  });

  it('rejects config values that JSON cannot represent', () => {
    for (const bad of [undefined, Number.NaN, Number.POSITIVE_INFINITY, () => 1, BigInt(10), new Date(0)]) {
      // `bizData` admits arbitrary `unknown` fields next to `params`.
      const graph: IGraph = {
        nodeList: [{ nodeId: 'a', code: 'source', name: 'a', type: 'R', bizData: { params: {}, payload: [bad] } }],
        connections: [],
      };
      expect(() => compile(graph, { nodes: NODES })).toThrow(/payload\[0\]/);
    }
  });

  it('rejects an import name that is not an identifier', () => {
    const graph: IGraph = { nodeList: [node('a', 'source', 'R')], connections: [] };
    expect(() => compile(graph, { nodes: { source: { from: 'x', name: 'not valid' } } })).toThrow(CompileError);
  });

  it('propagates graph errors from the shared front end', () => {
    const graph: IGraph = { nodeList: [node('t', 'scale', 'T')], connections: [] };
    expect(() => compile(graph, { nodes: NODES })).toThrow(GraphError);
  });

  it('imports a named export when one is given', () => {
    const graph: IGraph = { nodeList: [node('a', 'source', 'R')], connections: [] };
    const { code } = compile(graph, { nodes: { source: { from: 'pkg', name: 'Source' } } });
    expect(code).toContain('import {Source as Node0} from "pkg";');
  });
});
