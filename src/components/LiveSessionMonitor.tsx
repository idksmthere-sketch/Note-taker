import React, { useState } from 'react';
import {
  Mic,
  Image as ImageIcon,
  Square,
  Clock,
  ExternalLink,
  Layers,
  Database,
  ShieldCheck,
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

  const tabClass = (active: boolean) =>
    `flex items-center gap-2 px-4 py-2 text-xs font-medium transition whitespace-nowrap border-b-2 -mb-px ${
      active
        ? 'border-blue-600 text-gray-900'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;

  return (
    <div className="space-y-6">
      {/* ACTIVE SESSION COMMAND BAR */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Active Meeting Session #{status.meetingId}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-md">
                {status.mode}
              </span>
            </div>

            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Active Session • Chunk #{status.currentChunkNumber}
            </h2>

            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Total Elapsed: <span className="font-mono font-semibold text-gray-700">{formatTime(status.elapsedSeconds)}</span>
              <span className="text-gray-300">•</span>
              Chunk Timer: <span className="font-mono font-semibold text-gray-700">{formatTime(status.chunkElapsedSeconds)}</span> / {formatTime(status.chunkMaxSeconds)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {/* Force Process & Flush Chunk */}
            <button
              onClick={onManualFlush}
              disabled={flushing}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50"
            >
              {flushing ? 'Processing...' : 'Process & Export Chunk Now'}
            </button>

            {/* Stop Session */}
            <button
              onClick={onStopSession}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold bg-white border border-red-300 text-red-600 hover:bg-red-50 transition"
            >
              <Square className="w-4 h-4 fill-red-500" />
              Stop Session
            </button>
          </div>
        </div>

        {/* Chunk Progress Bar Gauge */}
        <div className="mt-5 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-gray-500 font-medium">Rolling Chunk Buffer Progress</span>
            <span className="text-gray-900 font-mono font-semibold">{chunkProgressPercent}%</span>
          </div>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${chunkProgressPercent}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
            <span>Captured Transcripts: {status.transcriptCount}</span>
            <span>Captured Slide Screenshots: {status.screenshotCount}</span>
            <span>Exported Chunks: {status.totalExportedChunks}</span>
          </div>
        </div>
      </div>

      {/* TELEMETRY TABS HEADER */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('TRANSCRIPT')}
          className={tabClass(activeTab === 'TRANSCRIPT')}
        >
          <Mic className="w-4 h-4" />
          Live Audio Transcript ({transcripts.length})
        </button>

        <button
          onClick={() => setActiveTab('VISION')}
          className={tabClass(activeTab === 'VISION')}
        >
          <ImageIcon className="w-4 h-4" />
          Vision Slide Filmstrip ({screenshots.length})
        </button>

        <button
          onClick={() => setActiveTab('CHUNKS')}
          className={tabClass(activeTab === 'CHUNKS')}
        >
          <Layers className="w-4 h-4" />
          Chunk Buffer
        </button>

        <button
          onClick={() => setActiveTab('NOTION')}
          className={tabClass(activeTab === 'NOTION')}
        >
          <Database className="w-4 h-4" />
          Notion Exports ({history.length})
        </button>
      </div>

      {/* TAB CONTENT 1: LIVE AUDIO TRANSCRIPT */}
      {activeTab === 'TRANSCRIPT' && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 min-h-[360px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Mic className="w-4 h-4 text-gray-400" />
              Real-Time Diarized Speech Stream
            </h3>
            <span className="text-xs text-gray-500">{transcripts.length} lines</span>
          </div>

          {transcripts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
              <Mic className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-medium text-gray-500">Listening for audio stream...</p>
              <p className="text-xs mt-1">Speaker diarization will automatically format lines as speech occurs.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
              {transcripts.map((t) => (
                <div key={t.id} className="p-3 rounded-md bg-gray-50 border border-gray-200 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {t.speaker}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">{t.timestamp}</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed">{t.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: VISION SLIDE FILMSTRIP */}
      {activeTab === 'VISION' && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 min-h-[360px]">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-gray-400" />
              Vision Capture Slide Filmstrip
            </h3>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
              WebP Compressed &lt; 5 MB Verified
            </span>
          </div>

          {screenshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
              <ImageIcon className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-medium text-gray-500">No slide changes detected yet.</p>
              <p className="text-xs mt-1">The vision engine analyzes screen share canvas deltas to capture slide transitions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {screenshots.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedScreenshot(s)}
                  className="group cursor-pointer rounded-lg border border-gray-200 bg-gray-50 p-2.5 hover:border-blue-500 transition"
                >
                  <div className="relative aspect-video rounded-md overflow-hidden bg-gray-100 border border-gray-200 mb-2">
                    <img
                      src={s.webpBase64}
                      alt={`Slide #${s.slideIndex}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-gray-900/70 text-[10px] font-semibold text-white">
                      Slide #{s.slideIndex}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 px-1">
                    <span>{s.timestamp}</span>
                    <span className="font-mono font-medium">{Math.round(s.byteSize / 1024)} KB WebP</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: CHUNK BUFFER */}
      {activeTab === 'CHUNKS' && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-400" />
            Chunk Buffer Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Unprocessed Transcripts</p>
              <p className="text-2xl font-bold text-gray-900">{transcripts.length}</p>
              <p className="text-xs text-gray-400 mt-1">Awaiting processing</p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Unprocessed Screenshots</p>
              <p className="text-2xl font-bold text-gray-900">{screenshots.length}</p>
              <p className="text-xs text-gray-400 mt-1">WebP compressed</p>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Current Chunk Elapsed</p>
              <p className="text-2xl font-bold text-gray-900">{formatTime(status.chunkElapsedSeconds)}</p>
              <p className="text-xs text-gray-400 mt-1">Target: {formatTime(status.chunkMaxSeconds)}</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-2">
            <p className="text-gray-700 leading-relaxed">
              When the rolling chunk timer completes or "Process & Export Chunk Now" is pressed, the buffer is
              sent to the LLM, structured outputs are pushed to Notion, and the buffer is cleared for the next chunk.
            </p>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: NOTION EXPORTS & HISTORY */}
      {activeTab === 'NOTION' && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-gray-400" />
              Exported Notion Chunks History
            </h3>
            <span className="text-xs text-gray-500">Total Exported: {history.length}</span>
          </div>

          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
              <Database className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm font-medium text-gray-500">No chunks exported yet.</p>
              <p className="text-xs mt-1">Chunks auto-export every 10-30 mins or when manually flushed.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {history.map((chunk) => (
                <div key={chunk.id} className="rounded-lg border border-gray-200 bg-gray-50 p-5 space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-gray-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                          Chunk #{chunk.chunkNumber}
                        </span>
                        <span className="text-xs font-medium text-gray-600">
                          {chunk.startTime} - {chunk.endTime}
                        </span>
                      </div>
                    </div>

                    {chunk.notionPageUrl && (
                      <a
                        href={chunk.notionPageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View in Notion
                      </a>
                    )}
                  </div>

                  {/* Markdown Summary */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Summary</h4>
                    <div className="p-3.5 rounded-md bg-white border border-gray-200 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {chunk.summaryMarkdown}
                    </div>
                  </div>

                  {/* Native Action Items Table */}
                  {chunk.actionItems && chunk.actionItems.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Action Items Table</h4>
                      <div className="overflow-x-auto rounded-md border border-gray-200">
                        <table className="w-full text-xs text-left text-gray-600">
                          <thead className="bg-gray-100 text-gray-500 font-semibold border-b border-gray-200">
                            <tr>
                              <th className="px-3 py-2">Assignee</th>
                              <th className="px-3 py-2">Task Description</th>
                              <th className="px-3 py-2">Deadline</th>
                              <th className="px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {chunk.actionItems.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-3 py-2 font-medium text-gray-900 flex items-center gap-1">
                                  <User className="w-3 h-3 text-gray-400" />
                                  {item.assignee}
                                </td>
                                <td className="px-3 py-2 text-gray-600">{item.task}</td>
                                <td className="px-3 py-2 text-gray-500 font-mono">
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    {item.deadline}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
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
                      <h4 className="text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">Mermaid Diagram</h4>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl w-full rounded-lg border border-gray-200 bg-white p-4 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200 text-xs font-semibold text-gray-900">
              <span>Captured Slide #{selectedScreenshot.slideIndex} ({selectedScreenshot.timestamp})</span>
              <span className="text-gray-500 font-mono">{Math.round(selectedScreenshot.byteSize / 1024)} KB WebP</span>
            </div>
            <img src={selectedScreenshot.webpBase64} alt="Slide Preview" className="w-full h-auto rounded-md max-h-[80vh] object-contain" />
            <p className="text-xs text-center text-gray-500 mt-3">Click anywhere to close preview</p>
          </div>
        </div>
      )}
    </div>
  );
};
