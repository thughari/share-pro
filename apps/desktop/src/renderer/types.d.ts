export {};

declare global {
  interface Window {
    nativeScreen?: {
      listSources: () => Promise<Array<{ id: string; name: string }>>;
    };
  }
}
