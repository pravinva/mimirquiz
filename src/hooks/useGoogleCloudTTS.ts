'use client';

import { useState, useCallback, useRef } from 'react';

interface UseGoogleCloudTTSOptions {
  onEnd?: () => void;
  languageCode?: string;
  voiceName?: string;
  speakingRate?: number;
  pitch?: number;
}

export function useGoogleCloudTTS({
  onEnd,
  languageCode = 'en-US',
  voiceName = 'en-US-Neural2-D',
  speakingRate = 1.0,
  pitch = 0,
}: UseGoogleCloudTTSOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const isCancellingRef = useRef(false);
  const speakInProgressRef = useRef(false);

  const cancel = useCallback(() => {
    // Stop and cleanup any currently playing audio
    console.log('Cancelling previous audio playback');
    isCancellingRef.current = true;
    
    // Stop the tracked audio element
    if (audioRef.current) {
      try {
        const audio = audioRef.current;
        // Remove event listeners FIRST to prevent callbacks
        audio.onended = null;
        audio.onerror = null;
        // Then stop playback
        audio.pause();
        audio.currentTime = 0;
        // Load empty source to fully stop
        audio.src = '';
        audio.load();
      } catch (error) {
        console.error('Error cancelling audio:', error);
      }
      audioRef.current = null;
    }
    
    // Also stop ALL audio elements on the page (nuclear option)
    try {
      const allAudioElements = document.querySelectorAll('audio');
      allAudioElements.forEach((audio) => {
        if (!audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    } catch (error) {
      console.error('Error stopping all audio elements:', error);
    }
    
    if (audioUrlRef.current) {
      try {
        URL.revokeObjectURL(audioUrlRef.current);
      } catch (error) {
        console.error('Error revoking audio URL:', error);
      }
      audioUrlRef.current = null;
    }
    setAudioUrl(null);
    setIsSpeaking(false);
    isCancellingRef.current = false;
  }, []);

  const speak = useCallback(
    async (text: string, callOptions?: { onEnd?: () => void; languageCode?: string; voiceName?: string }) => {
      if (!text) {
        return;
      }

      // Prevent multiple simultaneous speak calls
      if (speakInProgressRef.current) {
        console.log('Speak already in progress, cancelling previous and starting new');
        cancel();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      speakInProgressRef.current = true;

      // Cancel any currently playing audio before starting new one
      console.log(`Starting TTS for: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      cancel();
      
      // Small delay to ensure cancellation completes
      await new Promise(resolve => setTimeout(resolve, 50));

      const callOnEnd = callOptions?.onEnd || onEnd;
      const callLanguageCode = callOptions?.languageCode || languageCode;
      const callVoiceName = callOptions?.voiceName || voiceName;

      try {
        setIsSpeaking(true);

        // Call Next.js API route to get TTS audio
        const response = await fetch('/api/tts/synthesize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            languageCode: callLanguageCode,
            voiceName: callVoiceName,
            speakingRate,
            pitch,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to synthesize speech');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        audioUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        
        // Check if this audio was cancelled before it started playing
        const checkCancelled = () => {
          if (isCancellingRef.current || audioRef.current !== audio) {
            console.log('Audio was cancelled before/during playback');
            return true;
          }
          return false;
        };
        
        audio.onended = () => {
          // Don't fire callback if we were cancelled
          if (checkCancelled()) {
            speakInProgressRef.current = false;
            return;
          }
          
          // Ensure audio is fully stopped before proceeding
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (e) {
            // Ignore errors
          }
          
          speakInProgressRef.current = false;
          setIsSpeaking(false);
          if (audioUrlRef.current === url) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
          }
          setAudioUrl(null);
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
          
          // Small delay before firing callback to ensure cleanup is complete
          setTimeout(() => {
            callOnEnd?.();
          }, 100);
        };

        audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          setIsSpeaking(false);
          if (audioUrlRef.current === url) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
          }
          setAudioUrl(null);
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
        };

        // Double-check we weren't cancelled during async operations
        if (checkCancelled()) {
          audio.pause();
          URL.revokeObjectURL(url);
          speakInProgressRef.current = false;
          return;
        }

        // Ensure no other audio is playing before starting
        try {
          const allAudioElements = document.querySelectorAll('audio');
          allAudioElements.forEach((otherAudio) => {
            if (otherAudio !== audio && !otherAudio.paused) {
              otherAudio.pause();
              otherAudio.currentTime = 0;
            }
          });
        } catch (e) {
          // Ignore errors
        }

        await audio.play();
        speakInProgressRef.current = false;
      } catch (error) {
        console.error('TTS error:', error);
        speakInProgressRef.current = false;
        setIsSpeaking(false);
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        setAudioUrl(null);
        audioRef.current = null;
        callOnEnd?.();
      }
    },
    [languageCode, voiceName, speakingRate, pitch, onEnd, cancel]
  );

  return {
    speak,
    cancel,
    isSpeaking,
  };
}

