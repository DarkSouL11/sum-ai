import { createLogger } from '../utils/logger';

// Create a logger instance for the YouTube service
const logger = createLogger('Youtube');

interface TactiqResponse {
  title: string;
  captions: Array<{
    start: string;
    dur: string;
    text: string;
  }>;
}

export async function getVideoTranscript(videoId: string): Promise<string> {
  logger.info('Fetching transcript for video:', videoId);

  try {
    // Send message to background script to fetch transcript
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { 
          type: 'FETCH_TRANSCRIPT',
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`
        },
        (response) => {
          if (chrome.runtime.lastError) {
            logger.error('Runtime error:', chrome.runtime.lastError);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response.success) {
            logger.error('Failed to fetch transcript:', response.error);
            reject(new Error(response.error));
            return;
          }

          const data = response.data as TactiqResponse;
          if (!data || !data.captions || !Array.isArray(data.captions)) {
            reject(new Error('Invalid transcript data received'));
            return;
          }

          // Combine all caption segments into a single transcript
          const transcript = data.captions
            .map(segment => segment.text?.trim())
            .filter(Boolean)
            .join(' ');

          if (!transcript) {
            reject(new Error('No transcript text found'));
            return;
          }

          logger.info('Successfully fetched transcript, length:', transcript.length);
          resolve(transcript);
        }
      );
    });
  } catch (error) {
    logger.error('Error getting transcript:', error);
    throw error instanceof Error ? error : new Error('Failed to get video transcript');
  }
}

export function getVideoIdFromUrl(url: string): string {
  logger.info('Extracting video ID from URL:', url);
  try {
    const urlObj = new URL(url);
    const videoId = urlObj.searchParams.get('v');
    if (!videoId) {
      logger.error('No video ID found in URL');
      throw new Error('Invalid YouTube URL');
    }
    logger.info('Extracted video ID:', videoId);
    return videoId;
  } catch (error) {
    logger.error('Error parsing URL:', error);
    throw new Error('Invalid YouTube URL');
  }
} 