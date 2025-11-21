'use client';

import { useState, useCallback } from 'react';

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

  const speak = useCallback(
    async (text: string, callOptions?: { onEnd?: () => void }) => {
      if (!text) {
        return;
      }

      const callOnEnd = callOptions?.onEnd || onEnd;

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
            languageCode,
            voiceName,
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

        const audio = new Audio(url);
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          setAudioUrl(null);
          callOnEnd?.();
        };

        audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          setAudioUrl(null);
        };

        await audio.play();
      } catch (error) {
        console.error('TTS error:', error);
        setIsSpeaking(false);
        callOnEnd?.();
      }
    },
    [languageCode, voiceName, speakingRate, pitch, onEnd]
  );

  const cancel = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setIsSpeaking(false);
  }, [audioUrl]);

  return {
    speak,
    cancel,
    isSpeaking,
  };
}

