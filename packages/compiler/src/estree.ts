/**
 * Small, typed ESTree builders. The compiler constructs the output program as
 * an AST and prints it with `astring`, so generated code is syntactically
 * valid by construction and every value is escaped by the printer.
 */

import type {
  ArrayExpression,
  ArrowFunctionExpression,
  BinaryExpression,
  LogicalExpression,
  BlockStatement,
  CallExpression,
  Expression,
  ExpressionStatement,
  Identifier,
  Literal,
  MemberExpression,
  NewExpression,
  ObjectExpression,
  Pattern,
  Property,
  SimpleLiteral,
  SpreadElement,
  Statement,
  UnaryExpression,
  VariableDeclaration,
} from 'estree';
import { CompileError } from './errors';

export function id(name: string): Identifier {
  return { type: 'Identifier', name };
}

export function str(value: string): SimpleLiteral {
  return { type: 'Literal', value };
}

export function member(object: Expression, property: string): MemberExpression {
  return { type: 'MemberExpression', object, property: id(property), computed: false, optional: false };
}

/** `object[key]` with a string key; used for node ids, which are arbitrary strings. */
export function index(object: Expression, key: string): MemberExpression {
  return { type: 'MemberExpression', object, property: str(key), computed: true, optional: false };
}

export function call(callee: Expression, args: (Expression | SpreadElement)[] = []): CallExpression {
  return { type: 'CallExpression', callee, arguments: args, optional: false };
}

export function construct(callee: Expression, args: Expression[] = []): NewExpression {
  return { type: 'NewExpression', callee, arguments: args };
}

export function binary(operator: BinaryExpression['operator'], left: Expression, right: Expression): BinaryExpression {
  return { type: 'BinaryExpression', operator, left, right };
}

export function logical(operator: LogicalExpression['operator'], left: Expression, right: Expression): LogicalExpression {
  return { type: 'LogicalExpression', operator, left, right };
}

export function num(value: number): SimpleLiteral {
  return { type: 'Literal', value };
}

export function statement(expression: Expression): ExpressionStatement {
  return { type: 'ExpressionStatement', expression };
}

export function constant(name: string, init: Expression): VariableDeclaration {
  return {
    type: 'VariableDeclaration',
    kind: 'const',
    declarations: [{ type: 'VariableDeclarator', id: id(name), init }],
  };
}

export function block(body: Statement[]): BlockStatement {
  return { type: 'BlockStatement', body };
}

export function arrow(params: Pattern[], body: Expression | BlockStatement): ArrowFunctionExpression {
  return {
    type: 'ArrowFunctionExpression',
    params,
    body,
    async: false,
    expression: body.type !== 'BlockStatement',
  };
}

/** A property keyed by `key`. `__proto__` is computed so it defines an own property. */
export function property(key: string, value: Expression, shorthand = false): Property {
  const computed = key === '__proto__';
  return {
    type: 'Property',
    key: computed ? str(key) : isIdentifierName(key) ? id(key) : str(key),
    value,
    kind: 'init',
    method: false,
    shorthand: shorthand && !computed && isIdentifierName(key),
    computed,
  };
}

export function spread(argument: Expression): SpreadElement {
  return { type: 'SpreadElement', argument };
}

export function object(properties: (Property | SpreadElement)[]): ObjectExpression {
  return { type: 'ObjectExpression', properties };
}

export function array(elements: Expression[]): ArrayExpression {
  return { type: 'ArrayExpression', elements };
}

const IDENTIFIER_NAME = /^[A-Za-z_$][\w$]*$/;

export function isIdentifierName(name: string): boolean {
  return IDENTIFIER_NAME.test(name);
}

/**
 * Convert a JSON-compatible value to an expression. Anything JSON cannot
 * represent is rejected with the path to the offending value, because the
 * compiled program must reproduce node config exactly.
 */
export function valueToExpression(value: unknown, path: string): Expression {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return { type: 'Literal', value } satisfies Literal;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw unserializable(path, String(value));
    }
    return numberLiteral(value);
  }
  if (Array.isArray(value)) {
    return array(value.map((item: unknown, i) => valueToExpression(item, `${path}[${String(i)}]`)));
  }
  if (isPlainObject(value)) {
    return object(
      Object.entries(value).map(([key, item]) =>
        property(key, valueToExpression(item, isIdentifierName(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`)),
      ),
    );
  }
  throw unserializable(path, describe(value));
}

function numberLiteral(value: number): Expression {
  if (value < 0 || Object.is(value, -0)) {
    const negated: UnaryExpression = {
      type: 'UnaryExpression',
      operator: '-',
      prefix: true,
      argument: { type: 'Literal', value: -value },
    };
    return negated;
  }
  return { type: 'Literal', value };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function describe(value: unknown): string {
  if (typeof value === 'object' && value !== null) {
    return value.constructor.name;
  }
  return typeof value;
}

function unserializable(path: string, what: string): CompileError {
  return new CompileError(
    'unserializable-config',
    `Node config value at ${path} is ${what}; only JSON values (null, boolean, finite number, string, array, plain object) can be compiled.`,
  );
}
