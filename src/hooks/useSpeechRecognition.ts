'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  onResult: (transcript: string) => void;
  onEnd?: () => void;
  continuous?: boolean;
  interimResults?: boolean;
}

export function useSpeechRecognition({
  onResult,
  onEnd,
  continuous = false,
  interimResults = true,
}: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldBeListeningRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        setIsSupported(true);
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = continuous;
        recognitionRef.current.interimResults = interimResults;

        recognitionRef.current.onresult = (event: any) => {
          // Get the final transcript (last result is usually the final one)
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript + ' ';
            }
          }
          
          // Prioritize final transcript, but also send interim for UI feedback
          const transcriptToUse = finalTranscript.trim() || interimTranscript.trim();
          if (transcriptToUse) {
            // Always send results - let the handler decide what to do with them
            onResult(transcriptToUse);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setError(event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          // Auto-restart if continuous mode and we should still be listening
          if (continuous && shouldBeListeningRef.current) {
            setTimeout(() => {
              if (recognitionRef.current && shouldBeListeningRef.current) {
                try {
                  recognitionRef.current.start();
                  setIsListening(true);
                } catch (err: any) {
                  // Ignore "already started" errors
                  if (err.name !== 'InvalidStateError') {
                    console.error('Failed to restart recognition:', err);
                  }
                }
              }
            }, 100);
          }
          onEnd?.();
        };
      } else {
        setIsSupported(false);
        setError('Speech recognition is not supported in this browser');
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [continuous, interimResults, onResult, onEnd]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.error('Speech recognition not initialized');
      return;
    }
    
    shouldBeListeningRef.current = true;
    
    // If already listening, don't restart
    if (isListening) {
      console.log('Already listening, skipping start');
      return;
    }
    
    try {
      console.log('Starting speech recognition...');
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
      console.log('Speech recognition started successfully');
    } catch (err: any) {
      // If already started, that's okay - just update state
      if (err.name === 'InvalidStateError') {
        console.log('Recognition already started, updating state');
        setIsListening(true);
        return;
      }
      console.error('Failed to start recognition:', err);
      setError('Failed to start speech recognition');
      // Retry once
      setTimeout(() => {
        if (recognitionRef.current && shouldBeListeningRef.current && !isListening) {
          try {
            console.log('Retrying speech recognition start...');
            recognitionRef.current.start();
            setIsListening(true);
          } catch (retryErr: any) {
            console.error('Retry failed:', retryErr);
            if (retryErr.name === 'InvalidStateError') {
              setIsListening(true);
            }
          }
        }
      }, 500);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    shouldBeListeningRef.current = false;
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
    }
  }, [isListening]);

  return {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
  };
}
