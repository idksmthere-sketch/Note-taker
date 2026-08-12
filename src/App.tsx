import React, { useEffect, useRef, useState } from 'react';
import { Navbar } from './components/Navbar';
import { CredentialsForm } from './components/CredentialsForm';
import { LiveSessionMonitor } from './components/LiveSessionMonitor';
import { VaultManager } from './components/VaultManager';
import {
  AudioTranscriptLine,
  Credentials,
  EncryptedPayload,
  ModelSettings,
  ProcessedChunkResult,
  SessionStatus,
  VisionScreenshot,
} from './types';
import { decryptData, encryptData } from './lib/crypto';
import { clearVault, getEncryptedVault, getVaultMetadata, saveEncryptedVault } from './lib/db';
import { Info } from 'lucide-react';

const DEFAULT_SETTINGS: ModelSettings = {
  apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  modelChoice: 'gemini-2.5-flash',
  chunkIntervalMinutes: 10,
  visionThreshold: 8,
};

// Maximum number of transcript lines / screenshots retained in memory.
// Caps unbounded array growth (BUG 8) to avoid browser memory pressure
// during long sessions — the oldest entries are dropped when the cap is hit.
const MAX_TRANSCRIPTS = 500;
const MAX_SCREENSHOTS = 500;

const INITIAL_CREDENTIALS: Credentials = {
  zoomEmail: '',
  zoomPassword: '',
  zoomMeetingId: '',
  zoomPasscode: '',
  zoomDisplayName: 'NoteBot AI',
  notionApiKey: '',
  notionDatabaseId: '',
  llmApiKey: '',
};

export default function App() {
  const [credentials, setCredentials] = useState<Credentials>(INITIAL_CREDENTIALS);
  const [settings, setSettings] = useState<ModelSettings>(DEFAULT_SETTINGS);

  const [hasVault, setHasVault] = useState(false);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [masterPassphrase, setMasterPassphrase] = useState<string | null>(null);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);

  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    active: false,
    phase: 'IDLE',
    meetingId: '',
    elapsedSeconds: 0,
    currentChunkNumber: 1,
    chunkElapsedSeconds: 0,
    chunkMaxSeconds: 600,
    transcriptCount: 0,
    screenshotCount: 0,
    totalExportedChunks: 0,
    mode: 'LIVE_ZOOM',
  });

  const [transcripts, setTranscripts] = useState<AudioTranscriptLine[]>([]);
  const [screenshots, setScreenshots] = useState<VisionScreenshot[]>([]);
  const [history, setHistory] = useState<ProcessedChunkResult[]>([]);
  const [flushing, setFlushing] = useState(false);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  // BUG 6: Tracks whether the SSE stream is currently connected / receiving
  // events. When SSE is live it is the single source of truth for
  // sessionStatus, so the 3s polling loop must not overwrite its updates.
  // Polling remains the fallback while SSE is disconnected.
  const sseConnectedRef = useRef(false);

  // BUG 7: Snapshots the credentials/settings edits made in the form before
  // the vault modal opens for re-authentication, so a successful unlock saves
  // the user's current edits instead of loading the stored (old) vault
  // contents over them.
  const pendingVaultSaveRef = useRef<{ credentials: Credentials; settings: ModelSettings } | null>(null);

  // BUG 8: Counts dropped entries so the cap warning doesn't flood the console
  // during long sessions (warn on first drop, then every 100 drops).
  const cappedDropCountRef = useRef(0);

  // BUG 8: Append an item to a bounded array. Once `max` is reached the oldest
  // entry is removed so memory usage stays flat during long sessions.
  const appendBounded = <T,>(prev: T[], item: T, max: number, label: string): T[] => {
    if (prev.length >= max) {
      cappedDropCountRef.current += 1;
      if (cappedDropCountRef.current === 1 || cappedDropCountRef.current % 100 === 0) {
        console.warn(
          `[App] ${label} capped at ${max} entries; dropping oldest (${cappedDropCountRef.current} drops so far).`
        );
      }
      return [...prev.slice(1), item];
    }
    return [...prev, item];
  };

  // Initialize DB & Vault Check
  useEffect(() => {
    getVaultMetadata().then((meta) => {
      setHasVault(meta.hasVault);
      if (meta.hasVault && !isVaultUnlocked) {
        setIsVaultModalOpen(true);
      }
    });
  }, []);

  // Poll Session Status & History
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/session/status');
        const data = await res.json();
        // BUG 6: When SSE is connected it is the source of truth for status —
        // skip the polled status to avoid a poll/SSE race overwriting fresh
        // SSE events with stale polling data. History polling continues.
        if (data && data.status && !sseConnectedRef.current) {
          setSessionStatus(data.status);
        }
      } catch (err) {
        console.warn('Status poll warning:', err);
      }
    };

    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/session/history');
        const data = await res.json();
        if (data && data.history) {
          setHistory(data.history);
        }
      } catch (err) {
        console.warn('History poll warning:', err);
      }
    };

    fetchStatus();
    fetchHistory();

    const interval = setInterval(() => {
      fetchStatus();
      fetchHistory();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Server-Sent Events (SSE) Stream Subscriber for real-time telemetry
  useEffect(() => {
    const eventSource = new EventSource('/api/session/stream');

    // BUG 6: Mark SSE as live once the stream opens or delivers events so the
    // polling loop stops competing for sessionStatus.
    eventSource.onopen = () => {
      sseConnectedRef.current = true;
    };

    eventSource.onerror = () => {
      // Connection dropped / reconnecting — fall back to polling for status.
      sseConnectedRef.current = false;
    };

    eventSource.onmessage = (e) => {
      try {
        sseConnectedRef.current = true;
        const event = JSON.parse(e.data);
        if (event.status) {
          setSessionStatus(event.status);
        }

        if (event.type === 'TRANSCRIPT_LINE' && event.transcriptLine) {
          setTranscripts((prev) => appendBounded(prev, event.transcriptLine, MAX_TRANSCRIPTS, 'Transcripts'));
        }

        if (event.type === 'SLIDE_CHANGE' && event.screenshot) {
          setScreenshots((prev) => appendBounded(prev, event.screenshot, MAX_SCREENSHOTS, 'Screenshots'));
        }

        if (event.type === 'CHUNK_PROCESSED' && event.processedChunk) {
          setHistory((prev) => [event.processedChunk, ...prev]);
        }

        if (event.message) {
          setGlobalMessage(event.message);
          setTimeout(() => setGlobalMessage(null), 6000);
        }
      } catch (err) {
        console.warn('SSE event parse error:', err);
      }
    };

    return () => {
      sseConnectedRef.current = false;
      eventSource.close();
    };
  }, []);

  // Vault Unlock Handler
  const handleUnlockVault = async (passphrase: string): Promise<boolean> => {
    let decrypted: { credentials: Credentials; settings: ModelSettings } | null = null;
    try {
      const payload = await getEncryptedVault();
      if (!payload) return false;
      decrypted = await decryptData(passphrase, payload);
    } catch {
      return false; // Wrong passphrase or corrupted vault
    }

    setMasterPassphrase(passphrase);
    setIsVaultUnlocked(true);

    // BUG 7: If the vault was opened to re-authenticate a "Save Vault" click,
    // keep the user's in-form edits instead of loading the stored (old)
    // credentials over them, and complete the save with the validated
    // passphrase.
    const pending = pendingVaultSaveRef.current;
    if (pending) {
      pendingVaultSaveRef.current = null;
      setCredentials(pending.credentials);
      setSettings(pending.settings);
      try {
        const savePayload = await encryptData(passphrase, pending);
        await saveEncryptedVault(savePayload);
        setGlobalMessage('Credentials saved to encrypted vault.');
        setTimeout(() => setGlobalMessage(null), 4000);
      } catch (err) {
        console.error('Save vault error:', err);
        setGlobalMessage('Vault unlocked, but saving failed. Please try again.');
        setTimeout(() => setGlobalMessage(null), 5000);
      }
    } else {
      setCredentials(decrypted.credentials);
      setSettings(decrypted.settings);
    }
    return true;
  };

  // Create New Vault Handler
  const handleCreateVault = async (passphrase: string): Promise<void> => {
    pendingVaultSaveRef.current = null;
    const payload: EncryptedPayload = await encryptData(passphrase, { credentials, settings });
    await saveEncryptedVault(payload);
    setMasterPassphrase(passphrase);
    setHasVault(true);
    setIsVaultUnlocked(true);
  };

  // Save Vault Handler
  const handleSaveVault = async () => {
    if (!masterPassphrase) {
      // BUG 7: Snapshot the current edits before the unlock modal opens so a
      // successful unlock saves these edits rather than the stored vault data.
      pendingVaultSaveRef.current = { credentials, settings };
      setIsVaultModalOpen(true);
      return;
    }

    pendingVaultSaveRef.current = null;
    try {
      const payload = await encryptData(masterPassphrase, { credentials, settings });
      await saveEncryptedVault(payload);
      setGlobalMessage('Credentials saved to encrypted vault.');
      setTimeout(() => setGlobalMessage(null), 4000);
    } catch (err) {
      console.error('Save vault error:', err);
    }
  };

  // Vault Modal Close Handler — discard any pending (unsaved) edit snapshot so
  // a later ordinary unlock doesn't trigger a stale save.
  const handleCloseVaultModal = () => {
    pendingVaultSaveRef.current = null;
    setIsVaultModalOpen(false);
  };

  // Start Session Handler
  const handleStartSession = async (isSimulated: boolean) => {
    setTranscripts([]);
    setScreenshots([]);

    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials,
          settings,
          isSimulated,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGlobalMessage(data.message);
        setTimeout(() => setGlobalMessage(null), 5000);
      } else {
        alert(`Failed to start session: ${data.message}`);
      }
    } catch (err) {
      alert(`Network error starting session: ${err}`);
    }
  };

  // Manual Flush Handler
  const handleManualFlush = async () => {
    setFlushing(true);
    try {
      const res = await fetch('/api/session/manual-flush', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setGlobalMessage('Chunk processed and pushed to Notion.');
        setTimeout(() => setGlobalMessage(null), 5000);
      } else {
        alert(`Flush Notice: ${data.message}`);
      }
    } catch (err) {
      alert(`Flush error: ${err}`);
    } finally {
      setFlushing(false);
    }
  };

  // Stop Session Handler
  const handleStopSession = async () => {
    try {
      const res = await fetch('/api/session/stop', { method: 'POST' });
      const data = await res.json();
      setGlobalMessage(data.message);
      setTimeout(() => setGlobalMessage(null), 4000);
    } catch (err) {
      alert(`Stop error: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-16">
      {/* Top Navigation */}
      <Navbar
        status={sessionStatus}
        isVaultUnlocked={isVaultUnlocked}
        onToggleVaultLock={() => setIsVaultModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Global Notification Banner */}
        {globalMessage && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <span>{globalMessage}</span>
            </div>
            <button onClick={() => setGlobalMessage(null)} className="text-gray-400 hover:text-gray-600 font-medium">
              ✕
            </button>
          </div>
        )}

        {/* Dashboard Content */}
        {sessionStatus.active ? (
          <LiveSessionMonitor
            status={sessionStatus}
            transcripts={transcripts}
            screenshots={screenshots}
            history={history}
            onManualFlush={handleManualFlush}
            onStopSession={handleStopSession}
            flushing={flushing}
          />
        ) : (
          <CredentialsForm
            credentials={credentials}
            settings={settings}
            onChangeCredentials={setCredentials}
            onChangeSettings={setSettings}
            onSaveVault={handleSaveVault}
            onStartSession={handleStartSession}
            isSessionActive={sessionStatus.active}
            isVaultUnlocked={isVaultUnlocked}
          />
        )}
      </main>

      {/* Vault Manager Modal */}
      <VaultManager
        isOpen={isVaultModalOpen}
        hasExistingVault={hasVault}
        onUnlock={handleUnlockVault}
        onCreateVault={handleCreateVault}
        onClose={handleCloseVaultModal}
      />
    </div>
  );
}
