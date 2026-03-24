import { describe, expect, it } from 'vitest';
import { getReconnectDelay } from './reconnect';

describe('getReconnectDelay', () => {
  it('exponentially backs off and caps', () => {
    expect(getReconnectDelay(0)).toBe(250);
    expect(getReconnectDelay(3)).toBe(2000);
    expect(getReconnectDelay(20)).toBe(10000);
  });
});
