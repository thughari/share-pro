import { useEffect, useMemo, useState } from 'react';
import { SignalingClient } from '../lib/signalingClient';
import { useMeetingStore } from '../store/meetingStore';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL ?? 'ws://localhost:8080';

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
  const client = useMemo(() => new SignalingClient(
    SIGNALING_URL,
    (event) => {
      if (event.type === 'chat') {
        addMessage({ senderId: String(event.userId), body: String(event.body) });
      }
      if (event.type === 'presence') {
        setStatus(`${event.userId} ${event.state}`);
      }
    },
    (isConnected) => setConnected(isConnected),
    (msg) => setError(msg)
  ), [addMessage, setConnected, setError, setStatus]);

  useEffect(() => () => client.disconnect(), [client]);

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
      await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      if (!screenSharing) toggleScreenShare();
      setStatus('Screen sharing started');
    } catch {
      setError('Screen share permission denied or unavailable');
    }
  }

  function joinMeeting(): void {
    client.connect();
    setTimeout(() => {
      client.send({ type: 'join', roomId, userId });
    }, 200);
    setStatus(`Joining ${roomId}...`);
  }

  function leaveMeeting(): void {
    client.send({ type: 'leave', roomId, userId });
    client.disconnect();
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
          <button onClick={connected ? leaveMeeting : joinMeeting} className="rounded bg-indigo-600 px-3 py-2">
            {connected ? 'Leave' : 'Join'}
          </button>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        <button onClick={toggleMuted} className="rounded bg-slate-800 p-4">{muted ? 'Unmute' : 'Mute'}</button>
        <button onClick={toggleVideo} className="rounded bg-slate-800 p-4">{videoEnabled ? 'Video Off' : 'Video On'}</button>
        <button onClick={beginShare} className="rounded bg-slate-800 p-4">{screenSharing ? 'Sharing' : 'Share Screen'}</button>
        <button onClick={listSources} className="rounded bg-slate-800 p-4">List Sources</button>
        <button className="rounded bg-slate-800 p-4" onClick={() => setStatus('Hand raised')}>Raise Hand</button>
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
