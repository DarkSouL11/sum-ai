import React from 'react';
import { createRoot } from 'react-dom/client';
import Content from './Content';
import { createLogger } from '../utils/logger';

// Create a logger instance for the content script
const logger = createLogger('Content');

// Function to inject our React app
function injectApp() {
  // Check if container already exists
  if (document.getElementById('sum-ai-root')) return;

  // Find YouTube's right controls
  const rightControls = document.querySelector('div#above-the-fold div#top-row div#actions');
  if (!rightControls) return;

  logger.info('Right controls found');
  // Create container for our app
  const container = document.createElement('div');
  container.id = 'sum-ai-root';
  rightControls.appendChild(container);

  logger.info('Appended container to right controls');
  // Create React root and render app
  const root = createRoot(container);
  root.render(<Content />);
  logger.info('Rendered Content');
}

// Listen for URL changes to inject the app
let lastUrl = window.location.href;
new MutationObserver(() => {
  const url = window.location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    logger.info('URL changed, checking if we should inject app');
    if (url.includes('youtube.com/watch')) {
      logger.info('YouTube video page detected, injecting app');
      injectApp();
    }
  }
}).observe(document, { subtree: true, childList: true });

// Initial injection check
if (window.location.href.includes('youtube.com/watch')) {
  logger.info('Initial YouTube video page detected, injecting app');
  injectApp();
} 