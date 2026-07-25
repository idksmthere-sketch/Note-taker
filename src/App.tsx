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
import { Lock, ShieldCheck, Radio, AlertTriangle } from 'lucide-react';

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
      setGlobalMessage('Encrypted credentials saved to local Web Crypto vault!');
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
        setGlobalMessage('Chunk processed and pushed to Notion successfully!');
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        status={sessionStatus}
        isVaultUnlocked={isVaultUnlocked}
        onToggleVaultLock={() => setIsVaultModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Global Notification Banner */}
        {globalMessage && (
          <div className="p-3.5 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-xs text-indigo-200 flex items-center justify-between shadow-lg animate-fade-in">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
              <span>{globalMessage}</span>
            </div>
            <button onClick={() => setGlobalMessage(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Zero-Trust Vault Lock Warning Banner */}
        {!isVaultUnlocked && (
          <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-950 text-indigo-400 border border-indigo-800">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Encrypted Vault Locked</h3>
                <p className="text-xs text-slate-400">
                  Unlock your Web Crypto API vault to load saved Zoom credentials & Notion integration keys.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsVaultModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition shrink-0"
            >
              {hasVault ? 'Unlock Vault' : 'Initialize Vault'}
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
