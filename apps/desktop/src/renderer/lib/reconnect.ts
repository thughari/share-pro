export function getReconnectDelay(attempt: number): number {
  return Math.min(10000, 250 * 2 ** attempt);
}
