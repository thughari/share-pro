import { describe, expect, it } from 'vitest';

function nextBackoffMs(attempt: number): number {
  return Math.min(30000, 500 * Math.pow(1.8, attempt));
}

describe('reconnect backoff', () => {
  it('caps at 30s', () => {
    expect(nextBackoffMs(0)).toBe(500);
    expect(nextBackoffMs(20)).toBe(30000);
  });
});
