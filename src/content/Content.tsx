import React, { useState } from 'react';
import styled from '@emotion/styled';

const ButtonContainer = styled.div`
  margin-left: 8px;
`;

const SummarizeButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: none;
  border-radius: 18px;
  background-color: #f1f1f1;
  color: #0f0f0f;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #e5e5e5;
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const SummarizeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 14.5V12C14 11.4477 13.5523 11 13 11H11C10.4477 11 10 11.4477 10 12V14.5C10 14.7761 10.2239 15 10.5 15H13.5C13.7761 15 14 14.7761 14 14.5Z" fill="currentColor"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M7 3C5.34315 3 4 4.34315 4 6V18C4 19.6569 5.34315 21 7 21H17C18.6569 21 20 19.6569 20 18V6C20 4.34315 18.6569 3 17 3H7ZM17 5H7C6.44772 5 6 5.44772 6 6V18C6 18.5523 6.44772 19 7 19H17C17.5523 19 18 18.5523 18 18V6C18 5.44772 17.5523 5 17 5Z" fill="currentColor"/>
  </svg>
);

const Content: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSummarize = async () => {
    try {
      const videoTitle = document.querySelector('h1.ytd-video-primary-info-renderer')?.textContent;
      
      // Start loading state
      setIsLoading(true);
      
      // Send message to popup
      chrome.runtime.sendMessage({
        type: 'SUMMARIZE',
        data: {
          title: videoTitle,
          url: window.location.href
        }
      });

      // Stop loading state after 2 seconds (this should be handled by the background script)
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
    }
  };

  return (
    <ButtonContainer>
      <SummarizeButton
        onClick={handleSummarize}
        disabled={isLoading}
      >
        {isLoading ? (
          'Summarizing...'
        ) : (
          <>
            <SummarizeIcon />
            Summarize
          </>
        )}
      </SummarizeButton>
    </ButtonContainer>
  );
};

export default Content; 