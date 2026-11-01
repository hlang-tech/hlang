import { describe, expect, it } from 'vitest';
import { formatDuration, formatElapsed } from './format';

describe('formatDuration', () => {
  it('keeps two significant places below a millisecond and fewer above', () => {
    expect(formatDuration(0)).toBe('0 ms');
    expect(formatDuration(0.004)).toBe('<0.01 ms');
    expect(formatDuration(0.123)).toBe('0.12 ms');
    expect(formatDuration(4.56)).toBe('4.6 ms');
    expect(formatDuration(42.4)).toBe('42 ms');
    expect(formatDuration(1520)).toBe('1.52 s');
  });
});

describe('formatElapsed', () => {
  it('prints seconds since the run started, to the millisecond', () => {
    expect(formatElapsed(0)).toBe('0.000s');
    expect(formatElapsed(12.6)).toBe('0.013s');
    expect(formatElapsed(61_250)).toBe('61.250s');
  });
});
