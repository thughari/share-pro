export type UserRole = 'host' | 'co-host' | 'participant';

export interface AuthTokenClaims {
  sub: string;
  roomId: string;
  role: UserRole;
  exp: number;
}

export interface Participant {
  id: string;
  displayName: string;
  role: UserRole;
  handRaised: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  joinedAt: number;
}

export interface RoomState {
  id: string;
  passwordProtected: boolean;
  waitingRoomEnabled: boolean;
  participants: Participant[];
}

export type SignalMessage =
  | { type: 'join'; roomId: string; token: string }
  | { type: 'leave'; roomId: string }
  | { type: 'sdp-offer'; targetPeerId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'sdp-answer'; targetPeerId: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice-candidate'; targetPeerId: string; candidate: RTCIceCandidateInit }
  | { type: 'raise-hand'; roomId: string; raised: boolean }
  | { type: 'chat'; roomId: string; body: string };
