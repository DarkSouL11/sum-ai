import React from 'react';
import { createRoot } from 'react-dom/client';
import Content from './Content';
import { log } from 'console';

function logMessage(message: string) {
  console.log('SUM-AI:', message);
}

// Function to inject our React app
function injectApp() {
  // Check if container already exists
  if (document.getElementById('sum-ai-root')) return;

  // Find YouTube's right controls
  const rightControls = document.querySelector('div#above-the-fold div#top-row div#actions');
  if (!rightControls) return;

  logMessage('Right controls found');
  // Create container for our app
  const container = document.createElement('div');
  container.id = 'sum-ai-root';
  rightControls.appendChild(container);

  logMessage('Appended container to right controls');
  // Create React root and render app
  const root = createRoot(container);
  root.render(
    <Content
      onSummarize={handleSummarize}
      isLoading={false}
    />
  );
  logMessage('Rendered Content');
}

// Function to handle summarize click
async function handleSummarize() {
  try {
    const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent;
    
    // Send message to popup
    chrome.runtime.sendMessage({
      type: 'SUMMARIZE',
      data: {
        title: videoTitle,
        url: window.location.href
      }
    });

    // Update button state (we'll need to implement state management)
    const root = document.getElementById('sum-ai-root');
    if (root) {
      createRoot(root).render(
        <Content
          onSummarize={handleSummarize}
          isLoading={true}
        />
      );

      // Reset state after 2 seconds (this should be handled better with proper state management)
      setTimeout(() => {
        createRoot(root).render(
          <Content
            onSummarize={handleSummarize}
            isLoading={false}
          />
        );
      }, 2000);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Function to check if we're on a YouTube video page
function isYouTubeVideo() {
  return window.location.hostname === 'www.youtube.com' && 
         window.location.pathname === '/watch';
}

// Initialize when on video page
function init() {
  if (isYouTubeVideo()) {
    injectApp();
  }
}

// Run initialization
init();

// Listen for navigation within YouTube (for SPA navigation)
let lastUrl = window.location.href;
const body = document.querySelector('body');
if (body) {
  new MutationObserver(() => {
    if (lastUrl !== window.location.href) {
      lastUrl = window.location.href;
      setTimeout(init, 1000); // Wait for page content to load
    }
  }).observe(body, { subtree: true, childList: true });
} 