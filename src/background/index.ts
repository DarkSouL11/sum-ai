import { initializeSummarizationService, getSummarizationService } from '../services/summarize';
import { getVideoIdFromUrl } from '../services/youtube';

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

// Function to clean up expired cache entries
async function cleanupExpiredCache() {
  console.log('SUM-AI - Background: Starting cache cleanup');
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
      console.log('SUM-AI - Background: Removed', keysToRemove.length, 'expired cache entries');
    } else {
      console.log('SUM-AI - Background: No expired cache entries found');
    }
  } catch (error) {
    console.error('SUM-AI - Background: Error during cache cleanup:', error);
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
  console.log('SUM-AI - Background: Broadcasting state update:', summarizationState);
  chrome.runtime.sendMessage({
    type: 'SUMMARIZATION_UPDATE',
    state: summarizationState
  }, () => {
    if (chrome.runtime.lastError) {
      console.warn('SUM-AI - Background: Error broadcasting update:', chrome.runtime.lastError);
    }
  });
}

// Function to update summarization state
function updateSummarizationState(newState: Partial<SummarizationState>) {
  console.log('SUM-AI - Background: Updating state:', newState);
  summarizationState = { ...summarizationState, ...newState };
  broadcastSummarizationUpdate();
}

// Function to fetch transcript using Tactiq API
async function fetchTranscript(videoUrl: string): Promise<string> {
  console.log('SUM-AI - Background: Fetching transcript for video:', videoUrl);
  
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

  console.log('SUM-AI - Background: Successfully fetched transcript, length:', transcript.length);
  return transcript;
}

// Initialize summarization service when API key is available
console.log('SUM-AI - Background: Initializing background script');
chrome.storage.sync.get(['openaiApiKey'], (result) => {
  if (result.openaiApiKey) {
    console.log('SUM-AI - Background: Found API key, initializing service');
    initializeSummarizationService(result.openaiApiKey);
  } else {
    console.warn('SUM-AI - Background: No API key found in storage');
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('SUM-AI - Background: Received message:', message.type, message);

  if (message.type === 'SUMMARIZE') {
    console.log('SUM-AI - Background: Starting summarization for video:', message.data);
    // Store the video data
    currentVideoData = message.data;
    updateSummarizationState({ inProgress: true });
    
    // Start summarization process if we have an API key
    chrome.storage.sync.get(['openaiApiKey'], async (result) => {
      if (!result.openaiApiKey) {
        console.error('SUM-AI - Background: No API key found when trying to summarize');
        updateSummarizationState({
          inProgress: false,
          error: 'OpenAI API key not set. Please set it in the extension options.'
        });
        return;
      }

      try {
        // Get video ID
        const videoId = getVideoIdFromUrl(currentVideoData?.url || '');
        console.log('SUM-AI - Background: Processing video:', videoId);

        // Check cache first
        console.log('SUM-AI - Background: Checking cache...');
        const summarizer = getSummarizationService();
        const cachedResult = await summarizer.getCachedSummary(videoId);
        
        if (cachedResult) {
          console.log('SUM-AI - Background: Found cached summary');
          updateSummarizationState({
            inProgress: false,
            summary: cachedResult
          });
          return;
        }

        // If no cache, get transcript and generate summary
        console.log('SUM-AI - Background: No cache found, fetching transcript...');
        const transcript = await fetchTranscript(currentVideoData?.url || '');
        
        console.log('SUM-AI - Background: Generating summary...');
        const { summary, error } = await summarizer.summarizeText(transcript, {
          maxLength: 1000,
          style: 'concise'
        }, videoId);

        console.log('SUM-AI - Background: Summary generated:', { 
          length: summary?.length, 
          error
        });
        
        updateSummarizationState({
          inProgress: false,
          summary,
          error
        });
      } catch (error) {
        console.error('SUM-AI - Background: Error during summarization:', error);
        updateSummarizationState({
          inProgress: false,
          error: error instanceof Error ? error.message : 'Failed to generate summary'
        });
      }
    });

    // Open the popup
    console.log('SUM-AI - Background: Opening popup');
    chrome.action.openPopup();
  }
  return true;
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('SUM-AI - Background: Received message from popup:', message.type);

  if (message.type === 'GET_VIDEO_DATA') {
    const response = {
      videoData: currentVideoData,
      summarizationState
    };
    console.log('SUM-AI - Background: Sending video data to popup:', response);
    sendResponse(response);
  } else if (message.type === 'SET_API_KEY') {
    console.log('SUM-AI - Background: Setting new API key');
    chrome.storage.sync.set({ openaiApiKey: message.apiKey }, () => {
      if (chrome.runtime.lastError) {
        console.error('SUM-AI - Background: Error saving API key:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('SUM-AI - Background: API key saved, initializing service');
        initializeSummarizationService(message.apiKey);
        sendResponse({ success: true });
      }
    });
  }
  return true;
});

// Export empty object to make this a module
export {}; 