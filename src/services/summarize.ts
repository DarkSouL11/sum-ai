import OpenAI from 'openai';

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
        console.log('SUM-AI - Summarize: Found cached summary for video:', videoId);
        return cached.summary;
      }

      return null;
    } catch (error) {
      console.error('SUM-AI - Summarize: Error accessing cache:', error);
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
      console.log('SUM-AI - Summarize: Cached summary for video:', videoId);
    } catch (error) {
      console.error('SUM-AI - Summarize: Error caching summary:', error);
    }
  }

  async summarizeText(text: string, options: SummaryOptions = {}, videoId?: string): Promise<SummaryResult> {
    try {
      // Check cache if videoId is provided
      if (videoId) {
        const cachedSummary = await this.getCachedSummary(videoId);
        if (cachedSummary) {
          return {
            summary: cachedSummary,
            cached: true
          };
        }
      }

      const { maxLength = 500, style = 'concise' } = options;
      
      let prompt = `Please summarize the following video transcript`;
      
      switch (style) {
        case 'bullet-points':
          prompt += ' in bullet points, highlighting the key points';
          break;
        case 'detailed':
          prompt += ' in detail, maintaining important context and examples';
          break;
        case 'concise':
        default:
          prompt += ' concisely, focusing on the main ideas';
          break;
      }
      
      prompt += `. Keep the summary under ${maxLength} characters.\n\nTranscript:\n${text}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates clear and accurate summaries of video transcripts."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: Math.floor(maxLength / 4), // Approximate tokens based on characters
      });

      const summary = response.choices[0]?.message?.content?.trim() || '';
      
      // Cache the summary if videoId is provided
      if (videoId && summary) {
        await this.cacheSummary(videoId, summary);
      }

      return {
        summary,
        cached: false
      };
    } catch (error) {
      console.error('Error in summarization:', error);
      
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
  summarizationService = new SummarizationService(apiKey);
}

export function getSummarizationService(): SummarizationService {
  if (!summarizationService) {
    throw new Error('Summarization service not initialized. Call initializeSummarizationService first.');
  }
  return summarizationService;
} 