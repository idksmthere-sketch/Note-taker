import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Eye,
  EyeOff,
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

const inputClass =
  'w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

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
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Section A: Required Credentials</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Your Zoom and API credentials for automated sessions.
            </p>
          </div>

          <button
            onClick={onSaveVault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Save Vault
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Zoom Email */}
          <div>
            <label className={labelClass}>Zoom Email ID</label>
            <input
              type="email"
              value={credentials.zoomEmail}
              onChange={(e) => handleCredChange('zoomEmail', e.target.value)}
              placeholder="user@company.com"
              className={inputClass}
            />
          </div>

          {/* Zoom Password */}
          <div>
            <label className={labelClass}>Zoom Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={credentials.zoomPassword}
                onChange={(e) => handleCredChange('zoomPassword', e.target.value)}
                placeholder="••••••••••••"
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Zoom Meeting ID */}
          <div>
            <label className={labelClass}>
              Zoom Meeting ID <span className="text-blue-600">*</span>
            </label>
            <input
              type="text"
              value={credentials.zoomMeetingId}
              onChange={(e) => handleCredChange('zoomMeetingId', e.target.value)}
              placeholder="123 4567 8901"
              className={inputClass}
            />
          </div>

          {/* Optional Zoom Passcode */}
          <div>
            <label className={labelClass}>Zoom Passcode (Optional)</label>
            <input
              type="text"
              value={credentials.zoomPasscode || ''}
              onChange={(e) => handleCredChange('zoomPasscode', e.target.value)}
              placeholder="e.g. 123456"
              className={inputClass}
            />
          </div>

          {/* Notion Integration Key */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass + ' mb-0'}>
                Notion Integration API Key <span className="text-blue-600">*</span>
              </label>
              <button
                type="button"
                onClick={handleTestNotion}
                disabled={testingNotion || !credentials.notionApiKey || !credentials.notionDatabaseId}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-40 disabled:hover:text-blue-600"
              >
                {testingNotion && <RefreshCw className="w-3 h-3 animate-spin" />}
                {testingNotion ? 'Testing Notion...' : 'Test Notion Connection'}
              </button>
            </div>
            <input
              type="password"
              value={credentials.notionApiKey}
              onChange={(e) => handleCredChange('notionApiKey', e.target.value)}
              placeholder="secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className={inputClass}
            />
          </div>

          {/* Target Notion Page / Database ID */}
          <div className="md:col-span-2">
            <label className={labelClass}>
              Notion Target Page ID or Database ID <span className="text-blue-600">*</span>
            </label>
            <input
              type="text"
              value={credentials.notionDatabaseId}
              onChange={(e) => handleCredChange('notionDatabaseId', e.target.value)}
              placeholder="e.g. 182745a9a8344589a123bcdef0123456"
              className={inputClass}
            />
            <p className="text-xs text-gray-500 mt-1">
              Tip: Open your Notion page in browser, copy the 32-character ID from URL. Make sure to share the page with your Notion integration connection!
            </p>
          </div>

          {notionTest && (
            <div
              className={`md:col-span-2 p-3 rounded-md border text-xs flex items-start gap-2 ${
                notionTest.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {notionTest.success ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{notionTest.message}</p>
              </div>
            </div>
          )}

          {/* LLM API Key */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass + ' mb-0'}>
                LLM API Key (OpenAI / Gemini BYOK) <span className="text-blue-600">*</span>
              </label>
              <button
                type="button"
                onClick={handleTestLLM}
                disabled={testingLlm || !credentials.llmApiKey}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-40 disabled:hover:text-blue-600"
              >
                {testingLlm && <RefreshCw className="w-3 h-3 animate-spin" />}
                {testingLlm ? 'Testing LLM...' : 'Test LLM Endpoint'}
              </button>
            </div>
            <input
              type="password"
              value={credentials.llmApiKey}
              onChange={(e) => handleCredChange('llmApiKey', e.target.value)}
              placeholder="AIzaSy... or sk-..."
              className={inputClass}
            />
          </div>

          {llmTest && (
            <div
              className={`md:col-span-2 p-3 rounded-md border text-xs flex items-start gap-2 ${
                llmTest.success
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {llmTest.success ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{llmTest.message}</p>
                {llmTest.modelResponse && (
                  <p className="text-xs text-red-700/70 mt-0.5 font-mono">Response: "{llmTest.modelResponse}"</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION B: AI MODEL SETTINGS */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="pb-4 mb-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Section B: AI Model Settings (BYOK Defaults)</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configurable OpenAI-compatible endpoint, Gemini defaults, rolling chunk frequency, and vision sensitivity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* API Base URL */}
          <div className="md:col-span-2">
            <label className={labelClass}>API Base URL</label>
            <input
              type="text"
              value={settings.apiBaseUrl}
              onChange={(e) => handleSettingChange('apiBaseUrl', e.target.value)}
              placeholder="https://generativelanguage.googleapis.com/v1beta/openai/"
              className={`${inputClass} font-mono`}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleSettingChange('apiBaseUrl', 'https://generativelanguage.googleapis.com/v1beta/openai/')}
                className="text-xs px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md border border-gray-200"
              >
                Gemini Default
              </button>
              <button
                type="button"
                onClick={() => handleSettingChange('apiBaseUrl', 'https://api.openai.com/v1/')}
                className="text-xs px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md border border-gray-200"
              >
                OpenAI Official
              </button>
              <button
                type="button"
                onClick={() => handleSettingChange('apiBaseUrl', 'https://api.groq.com/openai/v1/')}
                className="text-xs px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md border border-gray-200"
              >
                Groq Fast
              </button>
            </div>
          </div>

          {/* Model Choice */}
          <div>
            <label className={labelClass}>Model Choice</label>
            <input
              type="text"
              value={settings.modelChoice}
              onChange={(e) => handleSettingChange('modelChoice', e.target.value)}
              placeholder="gemini-2.5-flash"
              className={inputClass}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => handleSettingChange('modelChoice', 'gemini-2.5-flash')}
                className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-600 border border-gray-200 rounded hover:text-blue-600 hover:border-blue-300"
              >
                gemini-2.5-flash
              </button>
              <button
                type="button"
                onClick={() => handleSettingChange('modelChoice', 'gemini-3.6-flash')}
                className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-600 border border-gray-200 rounded hover:text-blue-600 hover:border-blue-300"
              >
                gemini-3.6-flash
              </button>
              <button
                type="button"
                onClick={() => handleSettingChange('modelChoice', 'gpt-4o-mini')}
                className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-600 border border-gray-200 rounded hover:text-blue-600 hover:border-blue-300"
              >
                gpt-4o-mini
              </button>
            </div>
          </div>

          {/* Rolling Chunk Interval */}
          <div>
            <label className={labelClass}>
              Rolling Chunk Interval: {settings.chunkIntervalMinutes} Minutes
            </label>
            <select
              value={settings.chunkIntervalMinutes}
              onChange={(e) => handleSettingChange('chunkIntervalMinutes', Number(e.target.value))}
              className={inputClass}
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
              <label className={labelClass + ' mb-0'}>
                Vision Change Detection Threshold: {settings.visionThreshold}% Variance
              </label>
              <span className="text-xs text-gray-500">
                {settings.visionThreshold < 8 ? 'High Sensitivity (Captures minor changes)' : 'Standard (Captures slide transitions)'}
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={25}
              value={settings.visionThreshold}
              onChange={(e) => handleSettingChange('visionThreshold', Number(e.target.value))}
              className="w-full accent-blue-600 h-2 rounded-md cursor-pointer bg-gray-200"
            />
          </div>
        </div>
      </div>

      {/* START SESSION CONTROL BUTTONS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-lg border border-gray-200 bg-gray-50">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Launch Automated Bot Session</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Spin up headless Zoom client or run simulated session with real-time Notion & AI sync.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Simulated Demo Call */}
          <button
            type="button"
            onClick={() => onStartSession(true)}
            disabled={isSessionActive}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Simulated Demo Call
          </button>

          {/* Start Live Zoom Session */}
          <button
            type="button"
            onClick={() => onStartSession(false)}
            disabled={isSessionActive || !credentials.zoomMeetingId}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            Start Session
          </button>
        </div>
      </div>
    </div>
  );
};
