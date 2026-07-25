import React, { useState } from 'react';
import {
  Mic,
  Image as ImageIcon,
  Square,
  Clock,
  Sparkles,
  ExternalLink,
  Layers,
  Database,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  User,
} from 'lucide-react';
import {
  AudioTranscriptLine,
  ProcessedChunkResult,
  SessionStatus,
  VisionScreenshot,
} from '../types';
import { MermaidViewer } from './MermaidViewer';

interface LiveSessionMonitorProps {
  status: SessionStatus;
  transcripts: AudioTranscriptLine[];
  screenshots: VisionScreenshot[];
  history: ProcessedChunkResult[];
  onManualFlush: () => void;
  onStopSession: () => void;
  flushing: boolean;
}

export const LiveSessionMonitor: React.FC<LiveSessionMonitorProps> = ({
  status,
  transcripts,
  screenshots,
  history,
  onManualFlush,
  onStopSession,
  flushing,
}) => {
  const [activeTab, setActiveTab] = useState<'TRANSCRIPT' | 'VISION' | 'CHUNKS' | 'NOTION'>('TRANSCRIPT');
  const [selectedScreenshot, setSelectedScreenshot] = useState<VisionScreenshot | null>(null);

  // Format seconds into MM:SS or HH:MM:SS
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const chunkProgressPercent = Math.min(
    100,
    Math.round((status.chunkElapsedSeconds / (status.chunkMaxSeconds || 600)) * 100)
  );

  return (
    <div className="space-y-6">
      {/* ACTIVE SESSION COMMAND BAR */}
      <div className="rounded-2xl border border-indigo-900/60 bg-slate-900/95 p-6 shadow-2xl relative overflow-hidden">
        {/* Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Active Meeting Session #{status.meetingId}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold text-cyan-300 bg-cyan-950 border border-cyan-800 rounded-full">
                {status.mode}
              </span>
            </div>

            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Volatile RAM Buffer Active • Chunk #{status.currentChunkNumber}
            </h2>

            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Total Elapsed: <span className="font-mono font-bold text-slate-200">{formatTime(status.elapsedSeconds)}</span>
              <span className="text-slate-600">•</span>
              Chunk Timer: <span className="font-mono font-bold text-cyan-300">{formatTime(status.chunkElapsedSeconds)}</span> / {formatTime(status.chunkMaxSeconds)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {/* Force Process & Flush Chunk */}
            <button
              onClick={onManualFlush}
              disabled={flushing}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {flushing ? 'Processing AI & Notion...' : 'Flush RAM to Notion Now'}
            </button>

            {/* Stop Session & Purge RAM */}
            <button
              onClick={onStopSession}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-950/80 hover:bg-red-900/90 text-red-300 border border-red-800/80 shadow-lg transition"
            >
              <Square className="w-4 h-4 fill-red-400" />
              Stop & Purge RAM
            </button>
          </div>
        </div>

        {/* Chunk Progress Bar Gauge */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-400 font-medium">Rolling Chunk Buffer Progress</span>
            <span className="text-cyan-400 font-mono font-bold">{chunkProgressPercent}%</span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${chunkProgressPercent}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
            <span>Captured Transcripts: {status.transcriptCount}</span>
            <span>Captured Slide Screenshots: {status.screenshotCount}</span>
            <span>Exported Chunks: {status.totalExportedChunks}</span>
          </div>
        </div>
      </div>

      {/* TELEMETRY TABS HEADER */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('TRANSCRIPT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'TRANSCRIPT'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Mic className="w-4 h-4" />
          Live Audio Transcript ({transcripts.length})
        </button>

        <button
          onClick={() => setActiveTab('VISION')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'VISION'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Vision Slide Filmstrip ({screenshots.length})
        </button>

        <button
          onClick={() => setActiveTab('CHUNKS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'CHUNKS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          RAM Buffer Gauge
        </button>

        <button
          onClick={() => setActiveTab('NOTION')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'NOTION'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          Notion Exports ({history.length})
        </button>
      </div>

      {/* TAB CONTENT 1: LIVE AUDIO TRANSCRIPT */}
      {activeTab === 'TRANSCRIPT' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl min-h-[360px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-400" />
              Real-Time Diarized Speech Stream
            </h3>
            <span className="text-xs text-slate-400 font-mono">Volatile RAM Buffer</span>
          </div>

          {transcripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <Mic className="w-10 h-10 mb-2 opacity-40 animate-pulse text-indigo-400" />
              <p className="text-sm font-medium">Listening for audio stream...</p>
              <p className="text-xs mt-1">Speaker diarization will automatically format lines as speech occurs.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
              {transcripts.map((t) => (
                <div key={t.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs hover:border-slate-700 transition">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-400" />
                      {t.speaker}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{t.timestamp}</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{t.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: VISION SLIDE FILMSTRIP */}
      {activeTab === 'VISION' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl min-h-[360px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-cyan-400" />
              Vision Capture Slide Filmstrip
            </h3>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              WebP Compressed &lt; 5 MB Verified
            </span>
          </div>

          {screenshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <ImageIcon className="w-10 h-10 mb-2 opacity-40 text-cyan-400" />
              <p className="text-sm font-medium">No slide changes detected yet.</p>
              <p className="text-xs mt-1">The vision engine analyzes screen share canvas deltas to capture slide transitions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {screenshots.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedScreenshot(s)}
                  className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-950 p-2.5 hover:border-indigo-500 transition shadow-md"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-800 mb-2">
                    <img
                      src={s.webpBase64}
                      alt={`Slide #${s.slideIndex}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur text-[10px] font-bold text-white border border-slate-800">
                      Slide #{s.slideIndex}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span>{s.timestamp}</span>
                    <span className="text-emerald-400 font-mono font-semibold">
                      {Math.round(s.byteSize / 1024)} KB WebP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: RAM BUFFER GAUGE */}
      {activeTab === 'CHUNKS' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Volatile RAM Buffer Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">Unprocessed Transcripts</p>
              <p className="text-2xl font-black text-indigo-300">{transcripts.length}</p>
              <p className="text-[11px] text-slate-500 mt-1">Held strictly in RAM</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">Unprocessed Screenshots</p>
              <p className="text-2xl font-black text-cyan-300">{screenshots.length}</p>
              <p className="text-[11px] text-slate-500 mt-1">WebP compressed in RAM</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-xs text-slate-400 mb-1">Current Chunk Elapsed</p>
              <p className="text-2xl font-black text-emerald-400">{formatTime(status.chunkElapsedSeconds)}</p>
              <p className="text-[11px] text-slate-500 mt-1">Target: {formatTime(status.chunkMaxSeconds)}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Zero-Trust Memory Lifecycle Guarantee
            </div>
            <p className="text-slate-400 leading-relaxed">
              When the rolling chunk timer completes or "Flush RAM to Notion Now" is pressed, the backend sends the buffer payload to the LLM and pushes structured outputs to Notion. The RAM buffer is instantly flushed and garbage-collected.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: NOTION EXPORTS & HISTORY */}
      {activeTab === 'NOTION' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Exported Notion Chunks History
            </h3>
            <span className="text-xs text-slate-400">Total Exported: {history.length}</span>
          </div>

          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
              <Database className="w-10 h-10 mb-2 opacity-40 text-emerald-400" />
              <p className="text-sm font-medium">No chunks exported yet.</p>
              <p className="text-xs mt-1">Chunks auto-export every 10-30 mins or when manually flushed.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((chunk) => (
                <div key={chunk.id} className="rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-lg space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 rounded">
                          Chunk #{chunk.chunkNumber}
                        </span>
                        <span className="text-xs font-medium text-slate-300">
                          {chunk.startTime} - {chunk.endTime}
                        </span>
                      </div>
                    </div>

                    {chunk.notionPageUrl && (
                      <a
                        href={chunk.notionPageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View in Notion
                      </a>
                    )}
                  </div>

                  {/* Markdown Summary */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Summary</h4>
                    <div className="p-3.5 rounded-xl bg-slate-900 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {chunk.summaryMarkdown}
                    </div>
                  </div>

                  {/* Native Action Items Table */}
                  {chunk.actionItems && chunk.actionItems.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Action Items Table</h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-xs text-left text-slate-200">
                          <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                            <tr>
                              <th className="px-3 py-2">Assignee</th>
                              <th className="px-3 py-2">Task Description</th>
                              <th className="px-3 py-2">Deadline</th>
                              <th className="px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 bg-slate-950">
                            {chunk.actionItems.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 font-medium text-indigo-300 flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-500" />
                                  {item.assignee}
                                </td>
                                <td className="px-3 py-2 text-slate-200">{item.task}</td>
                                <td className="px-3 py-2 text-slate-400 font-mono">
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-500" />
                                    {item.deadline}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                    {item.status || 'Pending'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Mermaid Diagram */}
                  {chunk.mermaidCode && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 mb-1 uppercase tracking-wide">Mermaid Diagram</h4>
                      <MermaidViewer code={chunk.mermaidCode} id={`chunk-${chunk.chunkNumber}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LIGHTBOX SCREENSHOT MODAL */}
      {selectedScreenshot && (
        <div
          onClick={() => setSelectedScreenshot(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl w-full rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs font-bold text-white">
              <span>Captured Slide #${selectedScreenshot.slideIndex} ({selectedScreenshot.timestamp})</span>
              <span className="text-emerald-400 font-mono">{Math.round(selectedScreenshot.byteSize / 1024)} KB WebP</span>
            </div>
            <img src={selectedScreenshot.webpBase64} alt="Slide Preview" className="w-full h-auto rounded-xl max-h-[80vh] object-contain" />
            <p className="text-[11px] text-center text-slate-400 mt-3">Click anywhere to close preview</p>
          </div>
        </div>
      )}
    </div>
  );
};
