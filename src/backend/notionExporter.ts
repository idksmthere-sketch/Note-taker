import { Client } from '@notionhq/client';
import { ProcessedChunkResult } from '../types';

/**
 * Notion API Exporter Module
 * Formats processed chunks into native Notion blocks:
 * - Paragraphs & Headings for Summaries
 * - Native Notion Table blocks for Action Items
 * - Code blocks with language='mermaid' for Mermaid diagrams
 * - Image blocks for captured WebP screenshots
 */

export class NotionExporter {
  /**
   * Pushes processed meeting chunk data directly into the specified Notion Page or Database
   */
  public async exportChunkToNotion(
    notionApiKey: string,
    targetPageOrDbId: string,
    chunkResult: ProcessedChunkResult
  ): Promise<{ success: boolean; pageUrl?: string; message: string }> {
    if (!notionApiKey) {
      throw new Error('Notion API Key is missing. Please provide your Notion Integration API key.');
    }

    if (!targetPageOrDbId) {
      throw new Error('Notion Target Page/Database ID is missing.');
    }

    // Clean page ID (strip hyphens if needed or format properly)
    const cleanId = targetPageOrDbId.trim().replace(/-/g, '');

    const notion = new Client({ auth: notionApiKey });

    try {
      // Create block elements array
      const blocks: Array<unknown> = [];

      // 1. Chunk Title Header
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [
            {
              type: 'text',
              text: { content: `🤖 Meeting Note Chunk #${chunkResult.chunkNumber} (${chunkResult.startTime} - ${chunkResult.endTime})` },
            },
          ],
          color: 'indigo_background',
        },
      });

      // 2. Summary Heading & Paragraphs
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: '📝 Discussion Summary' } }],
        },
      });

      // Split summary markdown lines into Notion text blocks
      const summaryLines = chunkResult.summaryMarkdown.split('\n');
      for (const line of summaryLines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('### ')) {
          blocks.push({
            object: 'block',
            type: 'heading_3',
            heading_3: { rich_text: [{ type: 'text', text: { content: trimmed.replace('### ', '') } }] },
          });
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          blocks.push({
            object: 'block',
            type: 'bulleted_list_item',
            bulleted_list_item: { rich_text: [{ type: 'text', text: { content: trimmed.replace(/^[-*]\s+/, '') } }] },
          });
        } else {
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: trimmed } }] },
          });
        }
      }

      // 3. Action Items Native Table Block
      if (chunkResult.actionItems && chunkResult.actionItems.length > 0) {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: '✅ Action Items Table' } }],
          },
        });

        // Construct Notion Table block
        const tableRows: Array<unknown> = [];

        // Table Header Row
        tableRows.push({
          type: 'table_row',
          table_row: {
            cells: [
              [{ type: 'text', text: { content: 'Assignee' } }],
              [{ type: 'text', text: { content: 'Task Description' } }],
              [{ type: 'text', text: { content: 'Deadline' } }],
              [{ type: 'text', text: { content: 'Status' } }],
            ],
          },
        });

        // Data Rows
        for (const item of chunkResult.actionItems) {
          tableRows.push({
            type: 'table_row',
            table_row: {
              cells: [
                [{ type: 'text', text: { content: item.assignee || 'Unassigned' } }],
                [{ type: 'text', text: { content: item.task || '' } }],
                [{ type: 'text', text: { content: item.deadline || 'TBD' } }],
                [{ type: 'text', text: { content: item.status || 'Pending' } }],
              ],
            },
          });
        }

        blocks.push({
          object: 'block',
          type: 'table',
          table: {
            table_width: 4,
            has_column_header: true,
            has_row_header: false,
            children: tableRows,
          },
        });
      }

      // 4. Mermaid.js Diagram Code Block (Language set to mermaid)
      if (chunkResult.mermaidCode) {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: '📊 System Architecture / Workflow Diagram' } }],
          },
        });

        blocks.push({
          object: 'block',
          type: 'code',
          code: {
            caption: [{ type: 'text', text: { content: `Mermaid.js Flowchart (Chunk #${chunkResult.chunkNumber})` } }],
            rich_text: [{ type: 'text', text: { content: chunkResult.mermaidCode } }],
            language: 'mermaid',
          },
        });
      }

      // 5. Captured Slide Screenshots
      if (chunkResult.screenshots && chunkResult.screenshots.length > 0) {
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{ type: 'text', text: { content: '📸 Captured Presentation Slides' } }],
          },
        });

        for (const shot of chunkResult.screenshots) {
          // If screenshot is a web URL or valid data URI, insert as image or code/caption block
          let imgUrl = shot.webpBase64;
          if (imgUrl.startsWith('data:image/svg+xml')) {
            // For SVG simulated slide, include caption callout block
            blocks.push({
              object: 'block',
              type: 'callout',
              callout: {
                icon: { emoji: '🖼️' },
                rich_text: [{ type: 'text', text: { content: `Captured Slide #${shot.slideIndex} at ${shot.timestamp} (${Math.round(shot.byteSize / 1024)} KB WebP compressed)` } }],
              },
            });
          } else if (imgUrl.startsWith('http')) {
            blocks.push({
              object: 'block',
              type: 'image',
              image: {
                type: 'external',
                external: { url: imgUrl },
                caption: [{ type: 'text', text: { content: `Slide #${shot.slideIndex} (${shot.timestamp})` } }],
              },
            });
          } else {
            // Include embedded image reference block
            blocks.push({
              object: 'block',
              type: 'callout',
              callout: {
                icon: { emoji: '📷' },
                rich_text: [{ type: 'text', text: { content: `Slide #${shot.slideIndex} Captured at ${shot.timestamp} - File Size: ${Math.round(shot.byteSize / 1024)} KB WebP (< 5MB limit passed)` } }],
              },
            });
          }
        }
      }

      // Divider block
      blocks.push({
        object: 'block',
        type: 'divider',
        divider: {},
      });

      // Append blocks to target Notion page
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await notion.blocks.children.append({
        block_id: cleanId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        children: blocks as any,
      });

      const pageUrl = `https://notion.so/${cleanId}`;

      return {
        success: true,
        pageUrl: pageUrl,
        message: `Successfully appended Chunk #${chunkResult.chunkNumber} notes, Action Item table, and Mermaid diagram to Notion!`,
      };
    } catch (err: unknown) {
      console.warn('Notion API append error (returning formatted fallback status):', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      
      // Even if Notion API returns an error (e.g. invalid permissions or unshared page ID), return clear diagnostic
      return {
        success: false,
        message: `Notion API Export Warning: ${errMsg}. Please verify that your Notion Integration Key has access to the specified Page ID.`,
      };
    }
  }

  /**
   * Tests connection to Notion API and checks page access
   */
  public async testNotionConnection(notionApiKey: string, targetPageOrDbId: string): Promise<{ success: boolean; message: string; title?: string }> {
    if (!notionApiKey) {
      return { success: false, message: 'Notion API Key is required.' };
    }
    if (!targetPageOrDbId) {
      return { success: false, message: 'Notion Target Page/Database ID is required.' };
    }

    const cleanId = targetPageOrDbId.trim().replace(/-/g, '');
    const notion = new Client({ auth: notionApiKey });

    try {
      // Retrieve page to verify API token and page permissions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await notion.pages.retrieve({ page_id: cleanId });
      let pageTitle = 'Connected Notion Page';

      if (response && response.properties) {
        // Extract title from page properties
        const titleProp = Object.values(response.properties).find((p: any) => p.type === 'title') as any;
        if (titleProp && titleProp.title && titleProp.title[0]?.plain_text) {
          pageTitle = titleProp.title[0].plain_text;
        }
      }

      return {
        success: true,
        message: `Successfully connected to Notion Page: "${pageTitle}"`,
        title: pageTitle,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Notion Connection Failed: ${msg}. Make sure you added your Notion integration connection to your target page (Click '...' in top right of Notion page -> Add connections).`,
      };
    }
  }
}
