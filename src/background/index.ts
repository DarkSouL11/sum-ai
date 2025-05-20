import { initializeSummarizationService, getSummarizationService } from '../services/summarize';
import { getVideoIdFromUrl } from '../services/youtube';
import { createLogger } from '../utils/logger';

interface VideoData {
  title: string;
  url: string;
}

interface SummarizationState {
  inProgress: boolean;
  error?: string;
  summary?: string;
}

interface CachedSummary {
  summary: string;
  timestamp: number;
  videoId: string;
}

const CACHE_CLEANUP_ALARM = 'cache-cleanup';
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

// Store the latest video data and summarization state
let currentVideoData: VideoData | null = null;
let summarizationState: SummarizationState = {
  inProgress: false
};

// Create a logger instance for the background script
const logger = createLogger('Background');

// Function to clean up expired cache entries
async function cleanupExpiredCache() {
  logger.info('Starting cache cleanup');
  try {
    const data = await chrome.storage.local.get(null);
    const now = Date.now();
    const keysToRemove: string[] = [];

    // Find all expired cache entries
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('summary_')) {
        const cached = value as CachedSummary;
        if (now - cached.timestamp > CACHE_EXPIRY) {
          keysToRemove.push(key);
        }
      }
    }

    // Remove expired entries
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      logger.info(`Removed ${keysToRemove.length} expired cache entries`);
    } else {
      logger.info('No expired cache entries found');
    }
  } catch (error) {
    logger.error('Error during cache cleanup:', error);
  }
}

// Set up periodic cache cleanup
chrome.alarms.create(CACHE_CLEANUP_ALARM, {
  periodInMinutes: 24 * 60 // Run once per day
});

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CACHE_CLEANUP_ALARM) {
    cleanupExpiredCache();
  }
});

// Run initial cleanup when extension starts
cleanupExpiredCache();

// Function to broadcast summarization state updates
function broadcastSummarizationUpdate() {
  logger.info('Broadcasting state update:', summarizationState);
  chrome.runtime.sendMessage({
    type: 'SUMMARIZATION_UPDATE',
    state: summarizationState
  }, () => {
    if (chrome.runtime.lastError) {
      logger.warn('Error broadcasting update:', chrome.runtime.lastError);
    }
  });
}

// Function to update summarization state
function updateSummarizationState(newState: Partial<SummarizationState>) {
  logger.info('Updating state:', newState);
  summarizationState = { ...summarizationState, ...newState };
  broadcastSummarizationUpdate();
}

// Function to fetch transcript using Tactiq API
async function fetchTranscript(videoUrl: string): Promise<string> {
  logger.info('Fetching transcript for video:', videoUrl);
  
  const response = await fetch('https://tactiq-apps-prod.tactiq.io/transcript', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      langCode: 'en',
      videoUrl: videoUrl
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transcript: ${response.status}`);
  }

  const data = await response.json();
  if (!data || !data.captions || !Array.isArray(data.captions)) {
    throw new Error('Invalid transcript data received');
  }

  const transcript = data.captions
    .map((segment: any) => segment.text?.trim())
    .filter(Boolean)
    .join(' ');

  if (!transcript) {
    throw new Error('No transcript text found');
  }

  logger.info('Successfully fetched transcript, length:', transcript.length);
  return transcript;
}

// Initialize summarization service when API key is available
logger.info('Initializing background script');
chrome.storage.sync.get(['openaiApiKey'], (result) => {
  if (result.openaiApiKey) {
    logger.info('Found API key, initializing service');
    initializeSummarizationService(result.openaiApiKey);
  } else {
    logger.warn('No API key found in storage');
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.info('Received message:', message.type, message);

  if (message.type === 'SUMMARIZE') {
    logger.info('Starting summarization for video:', message.data);
    // Store the video data
    currentVideoData = message.data;
    updateSummarizationState({ inProgress: true });
    
    // Start summarization process if we have an API key
    chrome.storage.sync.get(['openaiApiKey'], async (result) => {
      if (!result.openaiApiKey) {
        logger.error('No API key found when trying to summarize');
        updateSummarizationState({
          inProgress: false,
          error: 'OpenAI API key not set. Please set it in the extension options.'
        });
        return;
      }

      try {
        // Get video ID
        const videoId = getVideoIdFromUrl(currentVideoData?.url || '');
        logger.info('Processing video:', videoId);

        // Check cache first
        logger.info('Checking cache...');
        const summarizer = getSummarizationService();
        const cachedResult = await summarizer.getCachedSummary(videoId);
        
        if (cachedResult) {
          logger.info('Found cached summary');
          updateSummarizationState({
            inProgress: false,
            summary: cachedResult
          });
          return;
        }

        // If no cache, get transcript and generate summary
        logger.info('No cache found, fetching transcript...');
        const transcript = await fetchTranscript(currentVideoData?.url || '');
        
        logger.info('Generating summary...');
        const { summary, error } = await summarizer.summarizeText(transcript, {
          maxLength: 1000,
          style: 'concise'
        }, videoId);

        logger.info('Summary generated:', { 
          length: summary?.length, 
          error
        });
        
        updateSummarizationState({
          inProgress: false,
          summary,
          error
        });
      } catch (error) {
        logger.error('Error during summarization:', error);
        updateSummarizationState({
          inProgress: false,
          error: error instanceof Error ? error.message : 'Failed to generate summary'
        });
      }
    });

    // Open the popup
    logger.info('Opening popup');
    chrome.action.openPopup();
  }
  return true;
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.info('Received message from popup:', message.type);

  if (message.type === 'GET_VIDEO_DATA') {
    const response = {
      videoData: currentVideoData,
      summarizationState
    };
    logger.info('Sending video data to popup:', response);
    sendResponse(response);
  } else if (message.type === 'SET_API_KEY') {
    logger.info('Setting new API key');
    chrome.storage.sync.set({ openaiApiKey: message.apiKey }, () => {
      if (chrome.runtime.lastError) {
        logger.error('Error saving API key:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        logger.info('API key saved, initializing service');
        initializeSummarizationService(message.apiKey);
        sendResponse({ success: true });
      }
    });
  }
  return true;
});

// Export empty object to make this a module
export {}; 