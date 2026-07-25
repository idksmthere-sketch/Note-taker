import React, { useState } from 'react';
import {
  Key,
  Video,
  Database,
  Brain,
  Sliders,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Credentials, ModelSettings, NotionTestResult, LLMTestResult } from '../types';

interface CredentialsFormProps {
  credentials: Credentials;
  settings: ModelSettings;
  onChangeCredentials: (updated: Credentials) => void;
  onChangeSettings: (updated: ModelSettings) => void;
  onSaveVault: () => void;
  onStartSession: (isSimulated: boolean) => void;
  isSessionActive: boolean;
  isVaultUnlocked: boolean;
}

export const CredentialsForm: React.FC<CredentialsFormProps> = ({
  credentials,
  settings,
  onChangeCredentials,
  onChangeSettings,
  onSaveVault,
  onStartSession,
  isSessionActive,
  isVaultUnlocked,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [notionTest, setNotionTest] = useState<NotionTestResult | null>(null);
  const [llmTest, setLlmTest] = useState<LLMTestResult | null>(null);
  const [testingNotion, setTestingNotion] = useState(false);
  const [testingLlm, setTestingLlm] = useState(false);

  const handleCredChange = (field: keyof Credentials, value: string) => {
    onChangeCredentials({ ...credentials, [field]: value });
  };

  const handleSettingChange = (field: keyof ModelSettings, value: string | number) => {
    onChangeSettings({ ...settings, [field]: value });
  };

  const handleTestNotion = async () => {
    setTestingNotion(true);
    setNotionTest(null);
    try {
      const res = await fetch('/api/test/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionApiKey: credentials.notionApiKey,
          notionDatabaseId: credentials.notionDatabaseId,
        }),
      });
      const data = await res.json();
      setNotionTest(data);
    } catch {
      setNotionTest({ success: false, message: 'Failed to connect to Notion endpoint.' });
    } finally {
      setTestingNotion(false);
    }
  };

  const handleTestLLM = async () => {
    setTestingLlm(true);
    setLlmTest(null);
    try {
      const res = await fetch('/api/test/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmApiKey: credentials.llmApiKey,
          settings: settings,
        }),
      });
      const data = await res.json();
      setLlmTest(data);
    } catch {
      setLlmTest({ success: false, message: 'Failed to ping LLM endpoint.' });
    } finally {
      setTestingLlm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION A: REQUIRED CREDENTIALS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-950/80 border border-indigo-800/60 text-indigo-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Section A: Required Credentials</h2>
              <p className="text-xs text-slate-400">
                Encrypted locally via Web Crypto API in IndexedDB. Volatile RAM only.
              </p>
            </div>
          </div>

          <button
            onClick={onSaveVault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Save Vault
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Zoom Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Zoom Email ID</label>
            <input
              type="email"
              value={credentials.zoomEmail}
              onChange={(e) => handleCredChange('zoomEmail', e.target.value)}
              placeholder="user@company.com"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Zoom Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Zoom Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={credentials.zoomPassword}
                onChange={(e) => handleCredChange('zoomPassword', e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Zoom Meeting ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Zoom Meeting ID <span className="text-indigo-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={credentials.zoomMeetingId}
                onChange={(e) => handleCredChange('zoomMeetingId', e.target.value)}
                placeholder="123 4567 8901"
                className="w-full px-3 py-2 pl-9 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <Video className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          {/* Optional Zoom Passcode */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Zoom Passcode (Optional)</label>
            <input
              type="text"
              value={credentials.zoomPasscode || ''}
              onChange={(e) => handleCredChange('zoomPasscode', e.target.value)}
              placeholder="e.g. 123456"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Notion Integration Key */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Notion Integration API Key <span className="text-indigo-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleTestNotion}
                disabled={testingNotion || !credentials.notionApiKey || !credentials.notionDatabaseId}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-40"
              >
                {testingNotion ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                Test Notion Connection
              </button>
            </div>
            <input
              type="password"
              value={credentials.notionApiKey}
              onChange={(e) => handleCredChange('notionApiKey', e.target.value)}
              placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Target Notion Page / Database ID */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Notion Target Page ID or Database ID <span className="text-indigo-400">*</span>
            </label>
            <input
              type="text"
              value={credentials.notionDatabaseId}
              onChange={(e) => handleCredChange('notionDatabaseId', e.target.value)}
              placeholder="e.g. 182745a9a8344589a123bcdef0123456"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Tip: Open your Notion page in browser, copy the 32-character ID from URL. Make sure to share the page with your Notion integration connection!
            </p>
          </div>

          {notionTest && (
            <div
              className={`md:col-span-2 p-3 rounded-xl border text-xs flex items-start gap-2 ${
                notionTest.success
                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                  : 'bg-red-950/60 border-red-800/60 text-red-300'
              }`}
            >
              {notionTest.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{notionTest.message}</p>
              </div>
            </div>
          )}

          {/* LLM API Key */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">
                LLM API Key (OpenAI / Gemini BYOK) <span className="text-indigo-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleTestLLM}
                disabled={testingLlm || !credentials.llmApiKey}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-40"
              >
                {testingLlm ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                Test LLM Endpoint
              </button>
            </div>
            <input
              type="password"
              value={credentials.llmApiKey}
              onChange={(e) => handleCredChange('llmApiKey', e.target.value)}
              placeholder="AIzaSy... or sk-..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {llmTest && (
            <div
              className={`md:col-span-2 p-3 rounded-xl border text-xs flex items-start gap-2 ${
                llmTest.success
                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                  : 'bg-red-950/60 border-red-800/60 text-red-300'
              }`}
            >
              {llmTest.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{llmTest.message}</p>
                {llmTest.modelResponse && (
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Response: "{llmTest.modelResponse}"</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION B: AI MODEL SETTINGS */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl">
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Section B: AI Model Settings (BYOK Defaults)</h2>
            <p className="text-xs text-slate-400">
              Configurable OpenAI-compatible endpoint, Gemini defaults, rolling chunk frequency, and vision sensitivity.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* API Base URL */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1">API Base URL</label>
            <input
              type="text"
              value={settings.apiBaseUrl}
              onChange={(e) => handleSettingChange('apiBaseUrl', e.target.value)}
              placeholder="https://generativelanguage.googleapis.com/v1beta/openai/"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleSettingChange('apiBaseUrl', 'https://generativelanguage.googleapis.com/v1beta/openai/')}
                className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
              >
                Gemini Default
              </button>
              <button
                type="button"
                onClick={() => handleSettingChange('apiBaseUrl', 'https://api.openai.com/v1/')}
                className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
              >
                OpenAI Official
              </button>
              <button
                type="button"
                onClick={() => handleSettingChange('apiBaseUrl', 'https://api.groq.com/openai/v1/')}
                className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
              >
                Groq Fast
              </button>
            </div>
          </div>

          {/* Model Choice */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Model Choice</label>
            <input
              type="text"
              value={settings.modelChoice}
              onChange={(e) => handleSettingChange('modelChoice', e.target.value)}
              placeholder="gemini-2.5-flash"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => handleSettingChange('modelChoice', 'gemini-2.5-flash')}
                className="text-[10px] px-2 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 rounded"
              >
                gemini-2.5-flash
              </button>
              <button
                type="button"
                onClick={() => handleSettingChange('modelChoice', 'gemini-3.6-flash')}
                className="text-[10px] px-2 py-0.5 bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 rounded"
              >
                gemini-3.6-flash
              </button>
              <button
                type="button"
                onClick={() => handleSettingChange('modelChoice', 'gpt-4o-mini')}
                className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 rounded"
              >
                gpt-4o-mini
              </button>
            </div>
          </div>

          {/* Rolling Chunk Interval */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Rolling Chunk Interval: {settings.chunkIntervalMinutes} Minutes
            </label>
            <select
              value={settings.chunkIntervalMinutes}
              onChange={(e) => handleSettingChange('chunkIntervalMinutes', Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value={5}>5 Minutes (Fast Testing)</option>
              <option value={10}>10 Minutes (Recommended)</option>
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes (Long Meetings)</option>
            </select>
          </div>

          {/* Vision Sensitivity Slider */}
          <div className="md:col-span-2 pt-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300">
                Vision Change Detection Threshold: {settings.visionThreshold}% Variance
              </label>
              <span className="text-[11px] text-slate-400">
                {settings.visionThreshold < 8 ? 'High Sensitivity (Captures minor changes)' : 'Standard (Captures slide transitions)'}
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={25}
              value={settings.visionThreshold}
              onChange={(e) => handleSettingChange('visionThreshold', Number(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* START SESSION CONTROL BUTTONS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl border border-indigo-900/50 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-cyan-950/60 shadow-xl">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Launch Automated Bot Session
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Spin up headless Zoom client or run simulated session with real-time Notion & AI sync.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Simulated Demo Call */}
          <button
            type="button"
            onClick={() => onStartSession(true)}
            disabled={isSessionActive}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Simulated Demo Call
          </button>

          {/* Start Live Zoom Session */}
          <button
            type="button"
            onClick={() => onStartSession(false)}
            disabled={isSessionActive || !credentials.zoomMeetingId}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
};
