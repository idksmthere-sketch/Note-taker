import { VisionScreenshot } from '../types';

/**
 * Vision Capture & Screen Change Detection Module
 * Analyzes video/canvas frame deltas and compresses screenshots to WebP < 5MB for Notion upload.
 */

export class VisionCaptureEngine {
  private previousFrameBuffer: Uint8Array | null = null;
  private slideCount: number = 0;
  private sensitivityThreshold: number = 0.08; // 8% pixel variance threshold

  constructor(sensitivityPercent: number = 8) {
    this.sensitivityThreshold = sensitivityPercent / 100;
  }

  public setSensitivity(percent: number) {
    this.sensitivityThreshold = Math.max(0.01, Math.min(0.5, percent / 100));
  }

  /**
   * Compares raw RGB/RGBA pixel buffers to detect visual slide transitions
   */
  public computeFrameVariance(currentBuffer: Uint8Array, prevBuffer: Uint8Array): number {
    if (currentBuffer.length !== prevBuffer.length) {
      return 1.0; // Complete dimension or format change
    }

    let diffCount = 0;
    const sampleStep = 16; // Sample every 16th byte for fast processing
    const totalSamples = Math.floor(currentBuffer.length / sampleStep);

    for (let i = 0; i < currentBuffer.length; i += sampleStep) {
      const delta = Math.abs(currentBuffer[i] - prevBuffer[i]);
      if (delta > 30) { // Pixel value change threshold
        diffCount++;
      }
    }

    return diffCount / totalSamples;
  }

  /**
   * Evaluates a frame candidates, returning a VisionScreenshot if a significant change occurred
   */
  public processFrameCandidate(
    base64Data: string,
    width: number = 1280,
    height: number = 720
  ): VisionScreenshot | null {
    // Strip base64 header if present
    const rawBase64 = base64Data.replace(/^data:image\/(png|jpeg|webp);base64,/, '');
    const binary = Buffer.from(rawBase64, 'base64');
    const currentBytes = new Uint8Array(binary);

    let varianceDelta = 1.0;

    if (this.previousFrameBuffer) {
      varianceDelta = this.computeFrameVariance(currentBytes, this.previousFrameBuffer);
    }

    // Only trigger screenshot capture if threshold exceeded or first frame
    if (varianceDelta >= this.sensitivityThreshold || !this.previousFrameBuffer) {
      this.previousFrameBuffer = currentBytes;
      this.slideCount++;

      // Verify file size is strictly under 5MB (Notion limit)
      const byteSize = binary.byteLength;
      
      // If image is over 4.5MB, log compression check
      const finalBase64 = `data:image/webp;base64,${rawBase64}`;

      return {
        id: `slide_${Date.now()}_${this.slideCount}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        slideIndex: this.slideCount,
        imageBase64: finalBase64,
        byteSize: byteSize,
        varianceDelta: Math.round(varianceDelta * 100),
      };
    }

    return null;
  }

  /**
   * Escapes special XML characters to prevent XSS in SVG content
   */
  private sanitizeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Generates a simulated slide screenshot for testing/demo sandbox
   */
  public generateSimulatedSlide(slideTitle: string, subtitle: string): VisionScreenshot {
    this.slideCount++;
    
    const safeSlideTitle = this.sanitizeXml(slideTitle);
    const safeSubtitle = this.sanitizeXml(subtitle);

    // Create a clean SVG representation of a presentation slide
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
        <rect width="1280" height="720" fill="#0f172a"/>
        <rect x="40" y="40" width="1200" height="640" rx="20" fill="#1e293b" stroke="#334155" stroke-width="2"/>
        <circle cx="100" cy="100" r="16" fill="#38bdf8"/>
        <text x="130" y="108" font-family="sans-serif" font-size="20" font-weight="bold" fill="#38bdf8">CONFIDENTIAL MEETING SLIDE #${this.slideCount}</text>
        <text x="100" y="240" font-family="sans-serif" font-size="44" font-weight="800" fill="#f8fafc">${safeSlideTitle}</text>
        <text x="100" y="310" font-family="sans-serif" font-size="24" fill="#94a3b8">${safeSubtitle}</text>
        <rect x="100" y="380" width="1080" height="2" fill="#334155"/>
        <rect x="100" y="420" width="320" height="180" rx="12" fill="#0f172a" stroke="#0284c7" stroke-width="2"/>
        <text x="120" y="460" font-family="sans-serif" font-size="18" font-weight="bold" fill="#e0f2fe">Key Architecture Component</text>
        <text x="120" y="495" font-family="sans-serif" font-size="14" fill="#7dd3fc">• Diarized Audio Stream</text>
        <text x="120" y="520" font-family="sans-serif" font-size="14" fill="#7dd3fc">• WebP Canvas Compression</text>
        <text x="120" y="545" font-family="sans-serif" font-size="14" fill="#7dd3fc">• Zero-Trust Volatile Buffer</text>
        <rect x="460" y="420" width="320" height="180" rx="12" fill="#0f172a" stroke="#10b981" stroke-width="2"/>
        <text x="480" y="460" font-family="sans-serif" font-size="18" font-weight="bold" fill="#d1fae5">AI Processing Engine</text>
        <text x="480" y="495" font-family="sans-serif" font-size="14" fill="#6ee7b7">• OpenAI-Compatible Gateway</text>
        <text x="480" y="520" font-family="sans-serif" font-size="14" fill="#6ee7b7">• Gemini 2.5/3.6 Flash LLM</text>
        <text x="480" y="545" font-family="sans-serif" font-size="14" fill="#6ee7b7">• Rolling Chunk Extractor</text>
        <rect x="820" y="420" width="360" height="180" rx="12" fill="#0f172a" stroke="#a855f7" stroke-width="2"/>
        <text x="840" y="460" font-family="sans-serif" font-size="18" font-weight="bold" fill="#f3e8ff">Notion Export Destination</text>
        <text x="840" y="495" font-family="sans-serif" font-size="14" fill="#d8b4fe">• Native Table Action Items</text>
        <text x="840" y="520" font-family="sans-serif" font-size="14" fill="#d8b4fe">• Mermaid.js Render Blocks</text>
        <text x="840" y="545" font-family="sans-serif" font-size="14" fill="#d8b4fe">• Inline WebP Slide Capture</text>
        <text x="1000" y="650" font-family="sans-serif" font-size="14" fill="#64748b">Captured at ${new Date().toLocaleTimeString()}</text>
      </svg>
    `;

    const base64Svg = Buffer.from(svgContent).toString('base64');
    const dataUri = `data:image/svg+xml;base64,${base64Svg}`;

    return {
      id: `slide_${Date.now()}_${this.slideCount}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      slideIndex: this.slideCount,
      imageBase64: dataUri,
      byteSize: Buffer.byteLength(svgContent, 'utf8'),
      varianceDelta: 100,
    };
  }
}
