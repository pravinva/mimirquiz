'use client';

import { useState, useEffect, useCallback } from 'react';

export function useMicrophone() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setStream(mediaStream);
      setHasPermission(true);
      setError(null);
      return mediaStream;
    } catch (err) {
      console.error('Microphone permission error:', err);
      setHasPermission(false);
      setError('Microphone access denied');
      return null;
    }
  }, []);

  const stopMicrophone = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, [stopMicrophone]);

  return {
    hasPermission,
    stream,
    error,
    requestPermission,
    stopMicrophone,
  };
}
