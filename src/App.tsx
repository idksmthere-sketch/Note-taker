import React, { useEffect, useState } from 'react';
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
        if (data && data.status) {
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

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.status) {
          setSessionStatus(event.status);
        }

        if (event.type === 'TRANSCRIPT_LINE' && event.transcriptLine) {
          setTranscripts((prev) => [...prev, event.transcriptLine]);
        }

        if (event.type === 'SLIDE_CHANGE' && event.screenshot) {
          setScreenshots((prev) => [...prev, event.screenshot]);
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
      eventSource.close();
    };
  }, []);

  // Vault Unlock Handler
  const handleUnlockVault = async (passphrase: string): Promise<boolean> => {
    try {
      const payload = await getEncryptedVault();
      if (!payload) return false;

      const decrypted = await decryptData(passphrase, payload);
      setCredentials(decrypted.credentials);
      setSettings(decrypted.settings);
      setMasterPassphrase(passphrase);
      setIsVaultUnlocked(true);
      return true;
    } catch {
      return false;
    }
  };

  // Create New Vault Handler
  const handleCreateVault = async (passphrase: string): Promise<void> => {
    const payload: EncryptedPayload = await encryptData(passphrase, { credentials, settings });
    await saveEncryptedVault(payload);
    setMasterPassphrase(passphrase);
    setHasVault(true);
    setIsVaultUnlocked(true);
  };

  // Save Vault Handler
  const handleSaveVault = async () => {
    if (!masterPassphrase) {
      setIsVaultModalOpen(true);
      return;
    }

    try {
      const payload = await encryptData(masterPassphrase, { credentials, settings });
      await saveEncryptedVault(payload);
      setGlobalMessage('Credentials saved to encrypted vault.');
      setTimeout(() => setGlobalMessage(null), 4000);
    } catch (err) {
      console.error('Save vault error:', err);
    }
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
        onClose={() => setIsVaultModalOpen(false)}
      />
    </div>
  );
}
