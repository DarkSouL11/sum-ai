import React, { useEffect, useState } from 'react';
import styled from '@emotion/styled';

const Container = styled.div`
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
`;

const Title = styled.h1`
  color: #1a73e8;
  font-size: 24px;
  margin-bottom: 20px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Label = styled.label`
  font-weight: 500;
  color: #5f6368;
`;

const Input = styled.input`
  padding: 8px 12px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
  margin-top: 4px;

  &:focus {
    outline: none;
    border-color: #1a73e8;
  }
`;

const Button = styled.button`
  background-color: #1a73e8;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  align-self: flex-start;

  &:hover {
    background-color: #1557b0;
  }

  &:disabled {
    background-color: #dadce0;
    cursor: not-allowed;
  }
`;

const Message = styled.div<{ isError?: boolean }>`
  padding: 8px 12px;
  border-radius: 4px;
  background-color: ${props => props.isError ? '#fce8e6' : '#e6f4ea'};
  color: ${props => props.isError ? '#c5221f' : '#137333'};
  margin-top: 16px;
  display: ${props => props.children ? 'block' : 'none'};
`;

const Options: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Load saved API key
    chrome.storage.sync.get(['openaiApiKey'], (result) => {
      if (result.openaiApiKey) {
        setApiKey(result.openaiApiKey);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'SET_API_KEY', apiKey }, (response) => {
          if (response.success) {
            resolve();
          } else {
            reject(new Error('Failed to save API key'));
          }
        });
      });

      setMessage('API key saved successfully');
      setIsError(false);
    } catch (error) {
      setMessage('Failed to save API key');
      setIsError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container>
      <Title>SumAI Options</Title>
      <Form onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="apiKey">
            OpenAI API Key
          </Label>
          <Input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            required
          />
        </div>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Message isError={isError}>
          {message}
        </Message>
      </Form>
    </Container>
  );
};

export default Options; 