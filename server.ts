import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { globalBotSession } from './src/backend/botSession';
import { NotionExporter } from './src/backend/notionExporter';
import { LLMChunkProcessor } from './src/backend/llmProcessor';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start Session (Zero-Trust RAM Credential Receiver)
  app.post('/api/session/start', async (req: Request, res: Response) => {
    try {
      const { credentials, settings, isSimulated } = req.body;
      if (!credentials || !credentials.zoomMeetingId) {
        return res.status(400).json({ success: false, message: 'Invalid or missing credentials payload.' });
      }

      const result = await globalBotSession.startSession(credentials, settings, !!isSimulated);
      return res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('POST /api/session/start error:', msg);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  // Stop Session & Purge RAM
  app.post('/api/session/stop', async (req: Request, res: Response) => {
    try {
      const result = await globalBotSession.stopSession();
      return res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('POST /api/session/stop error:', msg);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  // Session Status
  app.get('/api/session/status', (req: Request, res: Response) => {
    return res.json({
      status: globalBotSession.getStatus(),
    });
  });

  // Session History
  app.get('/api/session/history', (req: Request, res: Response) => {
    return res.json({
      history: globalBotSession.getRecentHistory(),
    });
  });

  // Force Process & Flush Chunk
  app.post('/api/session/manual-flush', async (req: Request, res: Response) => {
    try {
      const result = await globalBotSession.processAndFlushChunk();
      if (result) {
        return res.json({ success: true, result });
      }
      return res.status(400).json({ success: false, message: 'No active session or empty chunk buffer.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('POST /api/session/manual-flush error:', msg);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  });

  // Server-Sent Events (SSE) for Real-Time Telemetry
  app.get('/api/session/stream', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const unsubscribe = globalBotSession.subscribe((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.on('close', () => {
      unsubscribe();
    });
  });

  // Test Notion API Connection
  app.post('/api/test/notion', async (req: Request, res: Response) => {
    const { notionApiKey, notionDatabaseId } = req.body;
    const exporter = new NotionExporter();
    const result = await exporter.testNotionConnection(notionApiKey, notionDatabaseId);
    return res.json(result);
  });

  // Test LLM API Connection
  app.post('/api/test/llm', async (req: Request, res: Response) => {
    const { llmApiKey, settings } = req.body;
    const processor = new LLMChunkProcessor();
    const result = await processor.testEndpoint(llmApiKey, settings);
    return res.json(result);
  });

  // Vite middleware for dev or static server for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  }).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
  });
}

startServer();
