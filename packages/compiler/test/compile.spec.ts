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
import type { IConnection, IGraph, INodeInfo, NodeKind, ParamBag } from '@hlang-org/ir';
import { compile, CompileError, GraphError } from '../src';
import type { NodeImport } from '../src';

const FIXTURES = join(__dirname, 'fixtures', 'nodes');
const GENERATED = join(__dirname, '.generated');
const CODES = ['source', 'scale', 'pair', 'collect', 'faulty', 'ticker'] as const;

/** Each node code imports the default export of its fixture module. */
const NODES: Record<string, NodeImport> = Object.fromEntries(
  CODES.map((code) => [code, { from: pathToFileURL(join(FIXTURES, `${code}.cjs`)).href }]),
);

interface SinkEntry {
  readonly nodeId: string;
  readonly value: unknown;
}

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

function loadFixture(code: string): NodeConstructor {
  // The fixtures are CommonJS classes shared by both backends.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic fixture lookup by code
  return require(join(FIXTURES, `${code}.cjs`)) as NodeConstructor;
}

function sinkOf(): SinkEntry[] {
  const holder = globalThis as { hlangSink?: SinkEntry[] };
  const entries = holder.hlangSink ?? [];
  holder.hlangSink = [];
  return entries;
}

function runInterpreted(graph: IGraph): SinkEntry[] {
  sinkOf();
  const registry = new NodeRegistry();
  for (const code of CODES) {
    registry.register(code, loadFixture(code));
  }
  const handle = interpret(graph, { registry, createFlow: () => new Flow() });
  handle.dispose();
  return sinkOf();
}

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
      nodes: Object.fromEntries(CODES.map((code) => [code, { from: `./nodes/${code}.js` }])),
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
      'const handle = program.run(); handle.dispose(); console.log(JSON.stringify(globalThis.hlangSink));',
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
      'const handle = program.run(); handle.dispose(); console.log(JSON.stringify(globalThis.hlangSink));',
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
        'const handle = program.run();',
        'await new Promise((resolve) => setTimeout(resolve, 60));',
        'handle.dispose();',
        'const stopped = globalThis.hlangSink.length;',
        'await new Promise((resolve) => setTimeout(resolve, 60));',
        'console.log(JSON.stringify({ ticked: stopped > 0, stable: globalThis.hlangSink.length === stopped }));',
      ].join('\n'),
    );
    // The process exiting at all proves no interval outlived dispose().
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
