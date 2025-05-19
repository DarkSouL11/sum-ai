import React, { useState, useEffect } from 'react';
import './App.css';

interface SummaryState {
  title: string;
  summary: string;
  loading: boolean;
  error: string | null;
}

interface VideoData {
  title: string;
  url: string;
}

interface SummarizationState {
  inProgress: boolean;
  error?: string;
  summary?: string;
}

interface BackgroundResponse {
  videoData: VideoData | null;
  summarizationState: SummarizationState;
}

function App() {
  const [state, setState] = useState<SummaryState>({
    title: '',
    summary: '',
    loading: false,
    error: null
  });

  useEffect(() => {
    console.log('SUM-AI - App: Component mounted');
    
    // Request video data from background script
    console.log('SUM-AI - App: Requesting video data from background');
    chrome.runtime.sendMessage({ type: 'GET_VIDEO_DATA' }, (response: BackgroundResponse) => {
      console.log('SUM-AI - App: Received response from background:', response);
      
      if (response?.videoData?.title) {
        console.log('SUM-AI - App: Updating state with video data');
        const { videoData, summarizationState } = response;
        setState(prev => ({
          ...prev,
          title: videoData.title,
          loading: summarizationState.inProgress,
          error: summarizationState.error || null,
          summary: summarizationState.summary || ''
        }));
      } else {
        console.log('SUM-AI - App: No video data in response');
      }
    });

    // Listen for updates from the background script
    const messageListener = (message: any) => {
      console.log('SUM-AI - App: Received message:', message);
      
      if (message.type === 'SUMMARIZATION_UPDATE') {
        console.log('SUM-AI - App: Updating state with summarization update');
        setState(prev => ({
          ...prev,
          loading: message.state.inProgress,
          error: message.state.error || null,
          summary: message.state.summary || prev.summary
        }));
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Cleanup listener on unmount
    return () => {
      console.log('SUM-AI - App: Cleaning up message listener');
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  console.log('SUM-AI - App: Current state:', state);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Sum AI</h1>
        {state.loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Generating summary...</p>
          </div>
        ) : state.error ? (
          <div className="error">
            <p>{state.error}</p>
          </div>
        ) : state.summary ? (
          <div className="summary">
            <h2>{state.title}</h2>
            <p>{state.summary}</p>
          </div>
        ) : (
          <div className="welcome">
            <p>Click the Summarize button on any YouTube video to get an AI-powered summary.</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
