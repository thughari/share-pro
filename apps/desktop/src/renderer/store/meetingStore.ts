import { create } from 'zustand';

interface MeetingState {
  connected: boolean;
  muted: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  setConnected: (connected: boolean) => void;
  toggleMuted: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  connected: false,
  muted: false,
  videoEnabled: true,
  screenSharing: false,
  setConnected: (connected) => set({ connected }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  toggleVideo: () => set((s) => ({ videoEnabled: !s.videoEnabled })),
  toggleScreenShare: () => set((s) => ({ screenSharing: !s.screenSharing }))
}));
