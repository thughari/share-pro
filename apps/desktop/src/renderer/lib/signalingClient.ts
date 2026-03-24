export interface SignalEvent {
  type: string;
  [key: string]: unknown;
}

export class SignalingClient {
  private ws?: WebSocket;
  private attempts = 0;
  private closedManually = false;

  constructor(
    private readonly url: string,
    private readonly onEvent: (event: SignalEvent) => void,
    private readonly onConnection: (connected: boolean) => void,
    private readonly onError: (message: string) => void
  ) {}

  connect(): Promise<void> {
    this.closedManually = false;

    return new Promise((resolve) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.attempts = 0;
        this.onConnection(true);
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          this.onEvent(JSON.parse(event.data));
        } catch {
          this.onError('Received invalid event from signaling server');
        }
      };

      this.ws.onerror = () => {
        this.onError('WebSocket connection error');
      };

      this.ws.onclose = () => {
        this.onConnection(false);
        if (this.closedManually) return;
        const delay = Math.min(10000, 500 * 2 ** this.attempts++);
        setTimeout(() => {
          void this.connect();
        }, delay);
      };
    });
  }

  disconnect(): void {
    this.closedManually = true;
    this.ws?.close();
  }

  send(payload: unknown): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.onError('Not connected to signaling yet');
      return;
    }
    this.ws.send(JSON.stringify(payload));
  }
}
