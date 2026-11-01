/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useNodeContextMenu } from './useNodeContextMenu';

// Testing Library unmounts after each test only through an explicit cleanup
// when the test API is imported rather than global.
afterEach(cleanup);

describe('useNodeContextMenu', () => {
  it('opens for a node at a point and closes', () => {
    const { result } = renderHook(() => useNodeContextMenu());
    expect(result.current.state).toBeUndefined();
    act(() => {
      result.current.openForNode({ x: 12, y: 34 }, 'n1');
    });
    expect(result.current.state).toEqual({ screen: { x: 12, y: 34 }, nodeId: 'n1' });
    act(() => {
      result.current.close();
    });
    expect(result.current.state).toBeUndefined();
  });
});
