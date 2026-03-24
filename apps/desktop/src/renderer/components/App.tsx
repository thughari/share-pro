import { useMeetingStore } from '../store/meetingStore';

export function App(): JSX.Element {
  const { connected, muted, videoEnabled, screenSharing, setConnected, toggleMuted, toggleVideo, toggleScreenShare } = useMeetingStore();

  return (
    <main className="min-h-screen p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Share Pro Meeting</h1>
        <button onClick={() => setConnected(!connected)} className="rounded bg-indigo-600 px-3 py-2">
          {connected ? 'Leave' : 'Join'}
        </button>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <button onClick={toggleMuted} className="rounded bg-slate-800 p-4">{muted ? 'Unmute' : 'Mute'}</button>
        <button onClick={toggleVideo} className="rounded bg-slate-800 p-4">{videoEnabled ? 'Video Off' : 'Video On'}</button>
        <button onClick={toggleScreenShare} className="rounded bg-slate-800 p-4">{screenSharing ? 'Stop Share' : 'Share Screen'}</button>
        <button className="rounded bg-slate-800 p-4">Raise Hand</button>
      </section>

      <section className="mt-6 rounded border border-slate-800 p-4">
        <p className="text-sm text-slate-300">Keyboard shortcuts: ⌘/Ctrl+D mute, ⌘/Ctrl+E video, ⌘/Ctrl+S share screen.</p>
      </section>
    </main>
  );
}
