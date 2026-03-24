import { useEffect, useMemo, useRef, useState } from 'react';
import { SignalingClient, type SignalEvent } from '../lib/signalingClient';
import { useMeetingStore } from '../store/meetingStore';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL ?? 'ws://localhost:8080';

type SignalPayload =
  | { kind: 'offer'; targetUserId: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; targetUserId: string; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice'; targetUserId: string; candidate: RTCIceCandidateInit };

export function App(): JSX.Element {
  const {
    connected,
    muted,
    videoEnabled,
    screenSharing,
    roomId,
    userId,
    status,
    error,
    sources,
    messages,
    setConnected,
    toggleMuted,
    toggleVideo,
    toggleScreenShare,
    setRoomId,
    setUserId,
    setStatus,
    setError,
    setSources,
    addMessage
  } = useMeetingStore();

  const [chatInput, setChatInput] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [remoteStreams, setRemoteStreams] = useState<Array<{ peerId: string; stream: MediaStream }>>([]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const client = useMemo(() => new SignalingClient(
    SIGNALING_URL,
    (event) => {
      void handleSignalEvent(event);
    },
    (isConnected) => setConnected(isConnected),
    (msg) => setError(msg)
  ), [setConnected, setError]);

  useEffect(() => () => {
    client.disconnect();
    peersRef.current.forEach((pc) => pc.close());
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
  }, [client]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() === 'd') toggleMuted();
      if (event.key.toLowerCase() === 'e') toggleVideo();
      if (event.key.toLowerCase() === 's') void beginShare();
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [toggleMuted, toggleVideo]);

  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }, [muted]);

  useEffect(() => {
    localStreamRef.current?.getVideoTracks().forEach((track) => {
      track.enabled = videoEnabled;
    });
  }, [videoEnabled]);

  async function ensureLocalMedia(): Promise<MediaStream> {
    if (localStreamRef.current) return localStreamRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  }

  function attachRemoteStream(peerId: string, stream: MediaStream): void {
    setRemoteStreams((prev) => {
      const filtered = prev.filter((s) => s.peerId !== peerId);
      return [...filtered, { peerId, stream }];
    });
  }

  function createPeer(peerId: string): RTCPeerConnection {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:turn.local:3478', username: 'turnuser', credential: 'turnpassword' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      const payload: SignalPayload = {
        kind: 'ice',
        targetUserId: peerId,
        candidate: event.candidate.toJSON()
      };
      client.send({ type: 'signal', roomId, userId, payload });
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) attachRemoteStream(peerId, stream);
    };

    peersRef.current.set(peerId, pc);
    return pc;
  }

  async function createOfferFor(peerId: string): Promise<void> {
    const pc = createPeer(peerId);
    const localStream = await ensureLocalMedia();
    localStream.getTracks().forEach((track) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
      if (!sender) pc.addTrack(track, localStream);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const payload: SignalPayload = { kind: 'offer', targetUserId: peerId, sdp: offer };
    client.send({ type: 'signal', roomId, userId, payload });
    setStatus(`Calling ${peerId}...`);
  }

  async function handleSignalEvent(event: SignalEvent): Promise<void> {
    if (event.type === 'chat') {
      const sender = String(event.userId ?? 'unknown');
      if (sender !== userId) addMessage({ senderId: sender, body: String(event.body ?? '') });
      return;
    }

    if (event.type === 'presence') {
      const peerId = String(event.userId ?? '');
      const state = String(event.state ?? '');
      if (!peerId || peerId === userId) return;

      setStatus(`${peerId} ${state}`);

      if (state === 'joined') {
        // deterministic initiator avoids glare
        if (userId.localeCompare(peerId) < 0) await createOfferFor(peerId);
      }

      if (state === 'left') {
        peersRef.current.get(peerId)?.close();
        peersRef.current.delete(peerId);
        setRemoteStreams((prev) => prev.filter((s) => s.peerId !== peerId));
      }
      return;
    }

    if (event.type !== 'signal') return;

    const senderId = String(event.userId ?? '');
    if (!senderId || senderId === userId) return;

    const payload = event.payload as SignalPayload;
    if (!payload || payload.targetUserId !== userId) return;

    const pc = createPeer(senderId);

    if (payload.kind === 'offer') {
      const localStream = await ensureLocalMedia();
      localStream.getTracks().forEach((track) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === track.kind);
        if (!sender) pc.addTrack(track, localStream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const answerPayload: SignalPayload = { kind: 'answer', targetUserId: senderId, sdp: answer };
      client.send({ type: 'signal', roomId, userId, payload: answerPayload });
      setStatus(`Connected with ${senderId}`);
      return;
    }

    if (payload.kind === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      setStatus(`Connected with ${senderId}`);
      return;
    }

    if (payload.kind === 'ice') {
      await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    }
  }

  async function listSources(): Promise<void> {
    if (!window.nativeScreen?.listSources) {
      setError('Desktop source listing is only available in Electron runtime');
      return;
    }
    const listed = await window.nativeScreen.listSources();
    setSources(listed);
    if (listed.length > 0) setSelectedSource(listed[0].id);
  }

  async function beginShare(): Promise<void> {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const videoTrack = displayStream.getVideoTracks()[0];
      if (!videoTrack) return;

      const localStream = await ensureLocalMedia();
      const oldTrack = localStream.getVideoTracks()[0];
      if (oldTrack) {
        localStream.removeTrack(oldTrack);
        oldTrack.stop();
      }
      localStream.addTrack(videoTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      peersRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) void sender.replaceTrack(videoTrack);
      });

      if (!screenSharing) toggleScreenShare();
      setStatus('Screen sharing started and published');
    } catch {
      setError('Screen share permission denied or unavailable');
    }
  }

  async function joinMeeting(): Promise<void> {
    try {
      await ensureLocalMedia();
      await client.connect();
      client.send({ type: 'join', roomId, userId });
      setStatus(`Joined ${roomId}`);
    } catch {
      setError('Failed to join meeting. Check camera/mic permissions and signaling server.');
    }
  }

  function leaveMeeting(): void {
    client.send({ type: 'leave', roomId, userId });
    client.disconnect();
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    setRemoteStreams([]);
    setConnected(false);
    setStatus('Left meeting');
  }

  function sendChat(): void {
    if (!chatInput.trim()) return;
    client.send({ type: 'chat', roomId, userId, body: chatInput });
    addMessage({ senderId: userId, body: chatInput });
    setChatInput('');
  }

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Share Pro Meeting</h1>
        <div className="flex gap-2">
          <input className="rounded bg-slate-900 px-2 py-1 text-sm" value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Room ID" />
          <input className="rounded bg-slate-900 px-2 py-1 text-sm" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" />
          <button onClick={connected ? leaveMeeting : () => void joinMeeting()} className="rounded bg-indigo-600 px-3 py-2">
            {connected ? 'Leave' : 'Join'}
          </button>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        <button onClick={toggleMuted} className="rounded bg-slate-800 p-4">{muted ? 'Unmute' : 'Mute'}</button>
        <button onClick={toggleVideo} className="rounded bg-slate-800 p-4">{videoEnabled ? 'Video Off' : 'Video On'}</button>
        <button onClick={() => void beginShare()} className="rounded bg-slate-800 p-4">{screenSharing ? 'Sharing' : 'Share Screen'}</button>
        <button onClick={() => void listSources()} className="rounded bg-slate-800 p-4">List Sources</button>
        <button className="rounded bg-slate-800 p-4" onClick={() => setStatus('Hand raised')}>Raise Hand</button>
      </section>

      <section className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded border border-slate-800 p-3 text-sm">
          <p className="mb-2">Your media</p>
          <video ref={localVideoRef} autoPlay muted playsInline className="h-56 w-full rounded bg-black object-cover" />
        </div>
        <div className="rounded border border-slate-800 p-3 text-sm">
          <p className="mb-2">Remote media ({remoteStreams.length})</p>
          <div className="grid grid-cols-1 gap-2">
            {remoteStreams.map(({ peerId, stream }) => (
              <RemoteVideo key={peerId} peerId={peerId} stream={stream} />
            ))}
            {remoteStreams.length === 0 ? <p className="text-slate-400">No remote peers connected yet.</p> : null}
          </div>
        </div>
      </section>

      <section className="mb-4 rounded border border-slate-800 p-3 text-sm">
        <p>Status: <span className="font-semibold">{status}</span></p>
        {error ? <p className="text-red-400">Error: {error}</p> : null}
        {selectedSource ? <p>Selected source: {selectedSource}</p> : null}
      </section>

      <section className="mb-4 rounded border border-slate-800 p-3 text-sm">
        <p className="mb-2">Desktop Sources ({sources.length}):</p>
        <ul className="max-h-24 overflow-auto text-slate-300">
          {sources.map((source) => <li key={source.id}>{source.name} ({source.id})</li>)}
        </ul>
      </section>

      <section className="rounded border border-slate-800 p-3 text-sm">
        <div className="mb-2 flex gap-2">
          <input
            className="flex-1 rounded bg-slate-900 px-2 py-1"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
            placeholder="Type chat message"
          />
          <button className="rounded bg-indigo-600 px-3" onClick={sendChat}>Send</button>
        </div>
        <ul className="max-h-32 overflow-auto text-slate-300">
          {messages.map((m, i) => <li key={`${m.senderId}-${i}`}><b>{m.senderId}:</b> {m.body}</li>)}
        </ul>
      </section>
    </main>
  );
}

function RemoteVideo({ peerId, stream }: { peerId: string; stream: MediaStream }): JSX.Element {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);

  return (
    <div>
      <p className="mb-1 text-xs text-slate-400">{peerId}</p>
      <video ref={ref} autoPlay playsInline className="h-40 w-full rounded bg-black object-cover" />
    </div>
  );
}
