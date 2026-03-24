import { create } from 'zustand';

export interface ChatMessage {
  senderId: string;
  body: string;
}

interface MeetingState {
  connected: boolean;
  muted: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  roomId: string;
  userId: string;
  status: string;
  error?: string;
  sources: Array<{ id: string; name: string }>;
  messages: ChatMessage[];
  setConnected: (connected: boolean) => void;
  toggleMuted: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  setRoomId: (roomId: string) => void;
  setUserId: (userId: string) => void;
  setStatus: (status: string) => void;
  setError: (error?: string) => void;
  setSources: (sources: Array<{ id: string; name: string }>) => void;
  addMessage: (message: ChatMessage) => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  connected: false,
  muted: false,
  videoEnabled: true,
  screenSharing: false,
  roomId: 'demo-room',
  userId: `user-${Math.floor(Math.random() * 10000)}`,
  status: 'Disconnected',
  error: undefined,
  sources: [],
  messages: [],
  setConnected: (connected) => set({ connected, status: connected ? 'Connected' : 'Disconnected' }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  toggleVideo: () => set((s) => ({ videoEnabled: !s.videoEnabled })),
  toggleScreenShare: () => set((s) => ({ screenSharing: !s.screenSharing })),
  setRoomId: (roomId) => set({ roomId }),
  setUserId: (userId) => set({ userId }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setSources: (sources) => set({ sources }),
  addMessage: (message) => set((s) => ({ messages: [...s.messages, message] }))
}));
