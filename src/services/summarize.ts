import { OpenAI } from 'openai';
import { createLogger } from '../utils/logger';

interface SummaryOptions {
  maxLength?: number;
  style?: 'concise' | 'detailed' | 'bullet-points';
}

interface SummaryResult {
  summary: string;
  error?: string;
  cached?: boolean;
}

interface CachedSummary {
  summary: string;
  timestamp: number;
  videoId: string;
}

// Create a logger instance for the summarization service
const logger = createLogger('Summarize');

export class SummarizationService {
  private openai: OpenAI;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Required for browser environment
    });
  }

  public async getCachedSummary(videoId: string): Promise<string | null> {
    try {
      const key = `summary_${videoId}`;
      const result = await chrome.storage.local.get([key]);
      const cached: CachedSummary = result[key];

      if (cached) {
        logger.info('Found cached summary for video:', videoId);
        return cached.summary;
      }

      return null;
    } catch (error) {
      logger.error('Error accessing cache:', error);
      return null;
    }
  }

  private async cacheSummary(videoId: string, summary: string): Promise<void> {
    try {
      const key = `summary_${videoId}`;
      const cacheEntry: CachedSummary = {
        summary,
        timestamp: Date.now(),
        videoId
      };

      await chrome.storage.local.set({ [key]: cacheEntry });
      logger.info('Cached summary for video:', videoId);
    } catch (error) {
      logger.error('Error caching summary:', error);
    }
  }

  async summarizeText(text: string, options: SummaryOptions = {}, videoId?: string): Promise<SummaryResult> {
    try {
      logger.info('Starting text summarization');
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that summarizes text in a clear and concise manner."
          },
          {
            role: "user",
            content: `Please summarize the following text in a ${options.style || 'concise'} style, with a maximum length of ${options.maxLength || 1000} characters:\n\n${text}`
          }
        ],
        max_tokens: options.maxLength || 1000,
        temperature: 0.7
      });

      const summary = response.choices[0]?.message?.content?.trim() || '';
      
      if (videoId) {
        await this.cacheSummary(videoId, summary);
      }

      logger.info('Successfully generated summary');
      return { summary };
    } catch (error) {
      logger.error('Error in summarization:', error);
      
      // Handle specific OpenAI errors
      if (error instanceof Error) {
        if (error.message.includes('429') || error.message.includes('exceeded your current quota')) {
          return {
            summary: '',
            error: 'OpenAI API quota exceeded. Please check your API key billing status or try again later. You can update your API key in the extension options.'
          };
        } else if (error.message.includes('401') || error.message.includes('invalid api key')) {
          return {
            summary: '',
            error: 'Invalid OpenAI API key. Please check your API key in the extension options.'
          };
        } else if (error.message.includes('503') || error.message.includes('service unavailable')) {
          return {
            summary: '',
            error: 'OpenAI service is temporarily unavailable. Please try again in a few minutes.'
          };
        }
      }
      
      return {
        summary: '',
        error: error instanceof Error ? error.message : 'Failed to generate summary'
      };
    }
  }
}

// Singleton instance for the extension
let summarizationService: SummarizationService | null = null;

export function initializeSummarizationService(apiKey: string): void {
  logger.info('Initializing summarization service');
  summarizationService = new SummarizationService(apiKey);
}

export function getSummarizationService(): SummarizationService {
  if (!summarizationService) {
    logger.error('Summarization service not initialized');
    throw new Error('Summarization service not initialized. Call initializeSummarizationService first.');
  }
  return summarizationService;
} 