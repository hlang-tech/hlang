import { describe, expect, it } from 'vitest';
import { previewValue } from './preview';

describe('previewValue', () => {
  it('quotes strings and escapes what would break a line', () => {
    expect(previewValue('hi')).toBe('"hi"');
    expect(previewValue('a\nb')).toBe('"a\\nb"');
  });

  it('prints primitives as they read in code', () => {
    expect(previewValue(42)).toBe('42');
    expect(previewValue(-0.5)).toBe('-0.5');
    expect(previewValue(Number.NaN)).toBe('NaN');
    expect(previewValue(true)).toBe('true');
    expect(previewValue(null)).toBe('null');
    expect(previewValue(undefined)).toBe('undefined');
    expect(previewValue(BigInt(10))).toBe('10n');
    expect(previewValue(Symbol('tag'))).toBe('Symbol(tag)');
  });

  it('names functions without printing their source', () => {
    expect(previewValue(function render(): number {
      return 1;
    })).toBe('ƒ render');
    expect(previewValue(() => undefined)).toBe('ƒ anonymous');
  });

  it('prints an error as its name and message', () => {
    expect(previewValue(new TypeError('bad input'))).toBe('TypeError: bad input');
  });

  it('prints dates, maps and sets by what they hold', () => {
    expect(previewValue(new Date('2026-11-01T00:00:00.000Z'))).toBe('2026-11-01T00:00:00.000Z');
    expect(previewValue(new Date(Number.NaN))).toBe('Invalid Date');
    expect(previewValue(new Map([['a', 1]]))).toBe('Map(1)');
    expect(previewValue(new Set([1, 2]))).toBe('Set(2)');
  });

  it('prints plain objects and arrays as compact JSON', () => {
    expect(previewValue({ a: 1, b: [true, null] })).toBe('{"a":1,"b":[true,null]}');
    expect(previewValue([1, 'x'])).toBe('[1,"x"]');
  });

  it('names a class instance', () => {
    class Frame {
      readonly width = 2;
    }
    expect(previewValue(new Frame())).toBe('Frame {"width":2}');
  });

  it('survives cycles, bigints and functions inside objects', () => {
    const node: Record<string, unknown> = { id: 1 };
    node.self = node;
    expect(previewValue(node)).toBe('{"id":1,"self":"[Circular]"}');
    expect(previewValue({ n: BigInt(2), f: () => 1 })).toBe('{"n":"2n","f":"ƒ f"}');
  });

  it('survives an object whose serialization throws', () => {
    const hostile = {
      get boom(): never {
        throw new Error('no');
      },
    };
    expect(previewValue(hostile)).toBe('Object');
  });

  it('cuts long previews to the limit with an ellipsis', () => {
    expect(previewValue('x'.repeat(100), 10)).toBe('"xxxxxxxx…');
    expect(previewValue('x'.repeat(100), 10)).toHaveLength(10);
    expect(previewValue('short', 10)).toBe('"short"');
  });
});
