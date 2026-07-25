export interface Credentials {
  zoomEmail: string;
  zoomPassword: string;
  zoomMeetingId: string;
  zoomPasscode?: string;
  zoomDisplayName?: string;
  notionApiKey: string;
  notionDatabaseId: string; // Target Page ID or Database ID
  llmApiKey: string;
}

export interface ModelSettings {
  apiBaseUrl: string; // Defaults to https://generativelanguage.googleapis.com/v1beta/openai/
  modelChoice: string; // Defaults to gemini-2.5-flash or gemini-3.6-flash
  chunkIntervalMinutes: number; // e.g., 10 (10 to 30 mins)
  visionThreshold: number; // 5% to 25% pixel variance threshold
}

export interface VaultMetadata {
  isLocked: boolean;
  hasVault: boolean;
  createdAt?: string;
  lastUnlockedAt?: string;
}

export interface EncryptedPayload {
  cipherText: string; // Base64
  iv: string; // Base64
  salt: string; // Base64
}

export type SessionPhase = 
  | 'IDLE'
  | 'INITIALIZING_VAULT'
  | 'CONNECTING_ZOOM'
  | 'JOINED_MEETING'
  | 'ACTIVE_RECORDING'
  | 'PROCESSING_CHUNK'
  | 'EXPORTING_NOTION'
  | 'STOPPED'
  | 'ERROR';

export interface AudioTranscriptLine {
  id: string;
  timestamp: string;
  speaker: string;
  text: string;
}

export interface VisionScreenshot {
  id: string;
  timestamp: string;
  slideIndex: number;
  webpBase64: string;
  byteSize: number;
  varianceDelta: number;
}

export interface ProcessedChunkResult {
  id: string;
  chunkNumber: number;
  startTime: string;
  endTime: string;
  summaryMarkdown: string;
  actionItems: {
    assignee: string;
    task: string;
    deadline: string;
    status?: string;
  }[];
  mermaidCode?: string;
  screenshots: VisionScreenshot[];
  notionPageUrl?: string;
  exportedAt?: string;
}

export interface SessionStatus {
  active: boolean;
  phase: SessionPhase;
  meetingId: string;
  startTime?: string;
  elapsedSeconds: number;
  currentChunkNumber: number;
  chunkElapsedSeconds: number;
  chunkMaxSeconds: number;
  transcriptCount: number;
  screenshotCount: number;
  totalExportedChunks: number;
  lastErrorMessage?: string;
  mode: 'LIVE_ZOOM' | 'SIMULATED_TEST';
}

export interface SessionEvent {
  type: 'STATUS_CHANGE' | 'TRANSCRIPT_LINE' | 'SLIDE_CHANGE' | 'CHUNK_PROCESSED' | 'NOTION_EXPORTED' | 'LOG' | 'ERROR';
  timestamp: string;
  status?: SessionStatus;
  transcriptLine?: AudioTranscriptLine;
  screenshot?: VisionScreenshot;
  processedChunk?: ProcessedChunkResult;
  message?: string;
  error?: string;
}

export interface NotionTestResult {
  success: boolean;
  message: string;
  title?: string;
}

export interface LLMTestResult {
  success: boolean;
  message: string;
  modelResponse?: string;
}
