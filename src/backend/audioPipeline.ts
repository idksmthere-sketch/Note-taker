import { AudioTranscriptLine } from '../types';

/**
 * Audio Pipeline & Speaker Diarization Engine
 * Receives incoming audio transcript streams, formats speaker tags, and manages running transcript memory.
 */

export class AudioPipelineEngine {
  private lineCounter: number = 0;
  private speakers: string[] = ['Speaker 1 (Host)', 'Speaker 2 (Product)', 'Speaker 3 (Engineering)', 'Speaker 4 (Design)'];

  public formatTranscriptLine(speaker: string, text: string): AudioTranscriptLine {
    this.lineCounter++;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    return {
      id: `tr_${Date.now()}_${this.lineCounter}`,
      timestamp: now,
      speaker: speaker || 'Speaker 1',
      text: text.trim(),
    };
  }

  /**
   * Generates realistic simulated meeting dialogue for testing and demo calls
   */
  public generateSimulatedTranscriptLine(): AudioTranscriptLine {
    const dialogPool = [
      { speaker: 'Speaker 1 (Host)', text: "Welcome everyone to today's architecture and roadmap sync. Let's make sure we document all key decisions." },
      { speaker: 'Speaker 2 (Product)', text: "Thanks! On the product side, we need our Notion export to natively render Mermaid diagrams and Action Item tables." },
      { speaker: 'Speaker 3 (Engineering)', text: "Agreed. Our backend uses a rolling RAM buffer flush every 10 minutes so no credentials or raw audio hit disk." },
      { speaker: 'Speaker 4 (Design)', text: "We also need zero-trust Web Crypto API encryption in the PWA so API keys remain private in IndexedDB." },
      { speaker: 'Speaker 1 (Host)', text: "Let's assign the Web Crypto integration to Engineering with a deadline of Friday, 5 PM." },
      { speaker: 'Speaker 3 (Engineering)', text: "Will do! The vision capture pipeline is also detecting slide transitions using perceptual canvas variance." },
      { speaker: 'Speaker 2 (Product)', text: "Awesome. Make sure all screenshots compressed to WebP remain strictly under 5 MB to respect Notion limits." },
      { speaker: 'Speaker 4 (Design)', text: "I'll finalize the dark UI layout and ensure action items are categorized into clear table blocks." },
      { speaker: 'Speaker 1 (Host)', text: "Great discussion. Let's summarize our architecture flow chart and push the first chunk to Notion now." }
    ];

    const pick = dialogPool[this.lineCounter % dialogPool.length];
    return this.formatTranscriptLine(pick.speaker, pick.text);
  }
}
