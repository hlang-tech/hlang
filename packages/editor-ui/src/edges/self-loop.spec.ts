import { describe, expect, it } from 'vitest';
import { SELF_LOOP_CLEARANCE, SELF_LOOP_RADIUS, selfLoopPath } from './self-loop';

/** A 120 x 40 node at (100, 200): output handle on its right edge, input on its left. */
const node = { x: 100, y: 200, width: 120, height: 40 };
const source = { x: 220, y: 220 };
const target = { x: 100, y: 220 };

describe('selfLoopPath', () => {
  it('leaves the output to the right, passes under the node, and enters the input from the left', () => {
    const loop = selfLoopPath({ source, target, node, clearance: 20, radius: 8 });
    expect(loop.path).toBe(
      [
        'M 220 220',
        'L 232 220 Q 240 220 240 228', // out to the right, turning down
        'L 240 252 Q 240 260 232 260', // down past the node, turning left
        'L 88 260 Q 80 260 80 252', // under the node, turning up
        'L 80 228 Q 80 220 88 220', // up the left side, turning right
        'L 100 220', // into the input
      ].join(' '),
    );
  });

  it('puts its label in the middle of the run under the node', () => {
    const loop = selfLoopPath({ source, target, node, clearance: 20, radius: 8 });
    expect([loop.labelX, loop.labelY]).toEqual([160, 260]);
  });

  it('keeps clear of the node when a handle sits inside it', () => {
    const loop = selfLoopPath({ source: { x: 210, y: 230 }, target: { x: 110, y: 210 }, node, clearance: 20, radius: 0 });
    expect(loop.path).toBe('M 210 230 L 240 230 L 240 260 L 80 260 L 80 210 L 110 210');
  });

  it('shrinks a corner that would not fit its segment', () => {
    // A handle at the node's bottom edge leaves only `clearance` to turn in.
    const loop = selfLoopPath({ source: { x: 220, y: 236 }, target, node, clearance: 6, radius: 12 });
    expect(loop.path.startsWith('M 220 236 L 223 236 Q 226 236 226 239')).toBe(true);
  });

  it('uses the defaults of the design system when none are given', () => {
    expect(selfLoopPath({ source, target, node }).path).toBe(selfLoopPath({ source, target, node, clearance: SELF_LOOP_CLEARANCE, radius: SELF_LOOP_RADIUS }).path);
  });
});
