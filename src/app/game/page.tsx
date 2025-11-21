'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useGameStore } from '@/stores/gameStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useGoogleCloudTTS } from '@/hooks/useGoogleCloudTTS';
import { useMicrophone } from '@/hooks/useMicrophone';
import { gameEngine } from '@/lib/game/engine';
import { MIMIR_RULES, AnswerResult } from '@/lib/game/types';
import { playBellSound, playDingSound } from '@/lib/sounds';

export default function GamePage() {
  const { data: session, status } = useSession();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [languageCode, setLanguageCode] = useState('en-US');
  const [voiceName, setVoiceName] = useState('en-US-Neural2-D');
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voiceError, setVoiceError] = useState<string>('');

  // Fallback voices if API fails
  const fallbackVoices: { [key: string]: any[] } = {
    'en-US': [
      { name: 'en-US-Neural2-D', ssmlGender: 'MALE' },
      { name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' },
      { name: 'en-US-Neural2-J', ssmlGender: 'MALE' },
      { name: 'en-US-Standard-B', ssmlGender: 'MALE' },
      { name: 'en-US-Standard-C', ssmlGender: 'FEMALE' },
    ],
    'en-GB': [
      { name: 'en-GB-Neural2-B', ssmlGender: 'MALE' },
      { name: 'en-GB-Neural2-D', ssmlGender: 'FEMALE' },
      { name: 'en-GB-Standard-A', ssmlGender: 'FEMALE' },
      { name: 'en-GB-Standard-B', ssmlGender: 'MALE' },
    ],
    'en-AU': [
      { name: 'en-AU-Neural2-B', ssmlGender: 'MALE' },
      { name: 'en-AU-Neural2-C', ssmlGender: 'FEMALE' },
      { name: 'en-AU-Standard-A', ssmlGender: 'FEMALE' },
      { name: 'en-AU-Standard-B', ssmlGender: 'MALE' },
    ],
    'en-IN': [
      { name: 'en-IN-Neural2-A', ssmlGender: 'FEMALE' },
      { name: 'en-IN-Neural2-C', ssmlGender: 'MALE' },
      { name: 'en-IN-Standard-A', ssmlGender: 'FEMALE' },
      { name: 'en-IN-Standard-D', ssmlGender: 'MALE' },
    ],
  };

  const gameState = useGameStore();
  const { hasPermission, requestPermission } = useMicrophone();

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login');
    }
  }, [status]);

  useEffect(() => {
    fetchQuizzes();
    fetchVoices();
  }, []);

  useEffect(() => {
    if (languageCode) {
      fetchVoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageCode]);

  const fetchVoices = async () => {
    setIsLoadingVoices(true);
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`/api/tts/voices?languageCode=${languageCode}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setAvailableVoices(data.voices || []);
        setVoiceError(''); // Clear any previous errors
        // Set default voice if available
        if (data.voices && data.voices.length > 0) {
          const defaultVoice = data.voices.find((v: any) => v.name.includes('Neural2-D')) || data.voices[0];
          setVoiceName(defaultVoice.name);
        }
      } else {
        console.error('Failed to fetch voices:', response.status, await response.text());
        // Use fallback voices on error
        const fallback = fallbackVoices[languageCode] || fallbackVoices['en-US'] || [];
        setAvailableVoices(fallback);
        setVoiceError('Using default voices (API unavailable)');
        if (fallback.length > 0 && !voiceName) {
          setVoiceName(fallback[0].name);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch voices:', error);
      // Use fallback voices on error
      const fallback = fallbackVoices[languageCode] || fallbackVoices['en-US'] || [];
      setAvailableVoices(fallback);
      setVoiceError('Using default voices (API unavailable)');
      if (fallback.length > 0 && !voiceName) {
        setVoiceName(fallback[0].name);
      }
      if (error.name === 'AbortError') {
        console.error('Voice fetch timed out');
        setVoiceError('Voice fetch timed out - using defaults');
      }
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/quizzes');
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.quizzes);
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  const handleSpeechResult = useCallback(
    (result: string) => {
      if (!result || !result.trim()) {
        return;
      }

      const trimmedResult = result.trim();
      
      // Always update transcript for UI feedback
      setTranscript(trimmedResult);
      console.log('Speech detected:', trimmedResult, 'Mic state:', gameState.micState, 'Length:', trimmedResult.length);

      if (gameState.micState === 'overrule_window') {
        if (trimmedResult.toLowerCase().includes('overrule')) {
          handleOverruleDetected();
        }
      } else if (gameState.overruleInProgress) {
        // Listening for "I was correct" or "I was wrong" during overrule claim
        const lowerResult = trimmedResult.toLowerCase();
        if (lowerResult.includes('correct') || lowerResult.includes('right')) {
          handleOverruleClaim('correct');
        } else if (lowerResult.includes('wrong') || lowerResult.includes('incorrect')) {
          handleOverruleClaim('incorrect');
        }
      } else if (isInRepeatWindowRef.current) {
        // Check for "repeat" during the repeat window
        const lowerResult = trimmedResult.toLowerCase();
        if (lowerResult.includes('repeat')) {
          console.log('Repeat detected!');
          // Clear the repeat window timeout
          if (repeatWindowTimeoutRef.current) {
            clearTimeout(repeatWindowTimeoutRef.current);
            repeatWindowTimeoutRef.current = null;
          }
          isInRepeatWindowRef.current = false;
          
          // Give player 5 more seconds to answer
          speak('Repeat', {
            onEnd: () => {
              gameState.setGameState({
                micState: 'listening',
                timerSeconds: 5, // 5 seconds for repeat answer
              });
              startListening();
            },
          });
        }
      } else if (gameState.micState === 'listening') {
        // Process answer if we have a meaningful result (at least 2 characters)
        // This will be called for both interim and final results, but handleAnswer will process it
        if (trimmedResult.length >= 2) {
          console.log('Processing answer:', trimmedResult);
          handleAnswer(trimmedResult);
        }
      }
    },
    [gameState.micState, gameState.overruleInProgress]
  );

  const { startListening, stopListening, isListening } = useSpeechRecognition({
    onResult: handleSpeechResult,
    continuous: true, // Keep listening continuously
    interimResults: true, // Get interim results for better UX
  });

  const { speak, isSpeaking } = useGoogleCloudTTS({
    languageCode,
    voiceName,
  });

  // Ref to store handleAnswer function so timeout handler can access it
  const handleAnswerRef = useRef<((answer: string) => Promise<void>) | null>(null);

  // Refs for repeat feature
  const repeatWindowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInRepeatWindowRef = useRef(false);
  const repeatAnswerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentQuestionForRepeatRef = useRef<any>(null);
  const currentPlayerForRepeatRef = useRef<any>(null);

  // Memoized timeout handler to avoid stale closures in timer effect
  const handleTimeout = useCallback(() => {
    if (gameState.micState === 'listening' || gameState.micState === 'active') {
      // Player ran out of time - play bell sound
      playBellSound();
      stopListening();
      gameState.setGameState({ micState: 'disabled' });
      
      // Process timeout as an answer - use setTimeout to avoid calling during render
      if (gameState.questions && gameState.sessionId && handleAnswerRef.current) {
        setTimeout(() => {
          handleAnswerRef.current?.(''); // Empty answer = timeout
        }, 100);
      }
    } else if (gameState.micState === 'overrule_window') {
      // Overrule window expired
      gameState.setGameState({
        micState: 'disabled',
        overruleInProgress: false,
      });
    }
  }, [gameState.micState, stopListening, gameState, gameState.questions, gameState.sessionId]);

  // Timer countdown effect - implements MIMIR rules for timed answers
  useEffect(() => {
    if (
      gameState.micState === 'active' ||
      gameState.micState === 'listening' ||
      gameState.micState === 'overrule_window'
    ) {
      const interval = setInterval(() => {
        if (gameState.timerSeconds && gameState.timerSeconds > 0) {
          gameState.setGameState({ timerSeconds: gameState.timerSeconds - 1 });
        } else if (gameState.timerSeconds === 0) {
          handleTimeout();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [gameState.micState, gameState.timerSeconds, handleTimeout]);

  const handleStartGame = async () => {
    if (!selectedQuizId || playerNames.some((name) => !name.trim())) {
      alert('Please select a quiz and enter all player names');
      return;
    }

    const permission = await requestPermission();
    if (!permission) {
      alert('Microphone access is required to play');
      return;
    }

    try {
      const response = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizFileId: selectedQuizId,
          playerNames: playerNames.filter((name) => name.trim()),
        }),
      });

      if (response.ok) {
        const data = await response.json();

        const players = playerNames
          .filter((name) => name.trim())
          .map((name, idx) => ({
            id: idx + 1,
            name: name.trim(),
            score: 0,
            bonusAttempts: 0,
          }));

        const initialState = gameEngine.initializeGame(
          data.session.quizFileId,
          data.session.league,
          data.session.topic,
          players,
          data.questions
        );

        gameState.setGameState({
          sessionId: data.session.id,
          ...initialState,
          status: 'ready', // Changed to 'ready' - waiting for Start Quiz button
        });
      }
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('Failed to start game');
    }
  };

  const handleStartQuiz = () => {
    if (!gameState.questions || gameState.currentQuestionIndex === undefined) {
      return;
    }
    
    // Start the quiz - change status to in_progress
    gameState.setGameState({ status: 'in_progress' });
    
    // Read the first question
    const firstQuestion = gameState.questions[gameState.currentQuestionIndex];
    speakQuestion(firstQuestion.question);
  };

  const speakQuestion = (questionText: string) => {
    // Disable mic and reset timer while reading
    gameState.setGameState({
      micState: 'disabled',
      timerSeconds: 0,
    });
    stopListening();
    
    // Use Google Cloud TTS with onEnd callback
    speak(questionText, {
      onEnd: () => {
        // After question reading completes, start 30-second timer for first player
        gameState.setGameState({
          micState: 'listening',
          timerSeconds: 30, // 30 seconds AFTER reading completes
        });
        // Small delay to ensure state is updated before starting mic
        setTimeout(() => {
          console.log('Starting microphone after question read...', {
            micState: gameState.micState,
            isListening,
            isSupported: typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
          });
          try {
            startListening();
            console.log('Microphone start() called');
            // Verify it's actually listening after a moment
            setTimeout(() => {
              console.log('Checking microphone status:', { isListening });
              if (!isListening) {
                console.warn('Microphone not listening, retrying...');
                startListening();
              } else {
                console.log('✓ Microphone is listening');
              }
            }, 500);
          } catch (error: any) {
            console.error('Failed to start listening:', error);
            // Retry once after a short delay
            setTimeout(() => {
              console.log('Retrying microphone start...');
              try {
                startListening();
              } catch (retryError) {
                console.error('Retry also failed:', retryError);
              }
            }, 500);
          }
        }, 200);
      },
    });
  };

  const handleAnswer = async (spokenAnswer: string) => {
    if (!gameState.questions || !gameState.sessionId) return;

    // Clear any repeat window timeouts
    if (repeatWindowTimeoutRef.current) {
      clearTimeout(repeatWindowTimeoutRef.current);
      repeatWindowTimeoutRef.current = null;
    }
    if (repeatAnswerTimeoutRef.current) {
      clearTimeout(repeatAnswerTimeoutRef.current);
      repeatAnswerTimeoutRef.current = null;
    }
    isInRepeatWindowRef.current = false;

    stopListening();
    gameState.setMicState('disabled');

    const currentQuestion = gameState.questions[gameState.currentQuestionIndex!];
    const currentPlayer = gameState.players![gameState.currentPlayerIndex!];
    const isAddressed =
      gameState.currentPlayerIndex === gameState.addressedPlayerIndex;

    // Check if player said "pass"
    const normalizedSpoken = spokenAnswer.toLowerCase().trim();
    const isPass = normalizedSpoken === 'pass' || normalizedSpoken === 'i pass' || normalizedSpoken === 'passing';

    const result = isPass ? 'incorrect' : checkAnswer(spokenAnswer, currentQuestion.answer);

    const pointsAwarded = gameEngine.calculateScore(result, isAddressed);

    // Calculate game state updates BEFORE API call so we can use them later
    const updates = gameEngine.processAnswer(
      gameState as any,
      spokenAnswer,
      result
    );

    // Submit answer to API and capture response
    try {
      // Use the host's user ID (logged-in user) for playerId since only host can submit
      // The playerName field identifies which player actually answered
      const hostUserId = session?.user?.id ? parseInt(session.user.id as string) : null;
      if (!hostUserId) {
        console.error('No user session found');
        speak('Failed to save answer. Please log in.');
        return;
      }

      const response = await fetch(`/api/games/${gameState.sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          playerId: hostUserId, // Use host's user ID instead of player index
          playerName: currentPlayer.name,
          spokenAnswer,
          result,
          isAddressed,
          timeTaken: MIMIR_RULES.ADDRESSED_TIMER_SECONDS - (gameState.timerSeconds || 0),
          attemptOrder: gameState.attemptCount || 0,
          pointsAwarded,
        }),
      });

      if (!response.ok) {
        console.error('Failed to save answer:', await response.text());
        speak('Failed to save answer. Please check your connection.');
        return;
      }

      const data = await response.json();

      // Update game state with the processAnswer results
      gameState.setGameState({
        ...updates,
        lastAnswerId: data.answer.id,
        lastAnswerResult: result,
        lastAnswerPlayerIndex: gameState.currentPlayerIndex,
      });
    } catch (error) {
      console.error('Failed to submit answer:', error);
      speak('Failed to save answer. Please check your connection.');
      return;
    }

    // Use the updates from processAnswer - it contains the correct activeMicPlayerIndex

    if (isPass) {
      // Player said "pass" - move to next player with ding
      console.log('Pass detected, updates:', updates);
      speak('Pass', {
        onEnd: () => {
          playDingSound();
          console.log('Pass audio ended, activeMicPlayerIndex:', updates.activeMicPlayerIndex);
          if (updates.activeMicPlayerIndex !== null) {
            console.log('Activating microphone for next player:', updates.activeMicPlayerIndex);
            setTimeout(() => {
              startListening();
            }, 100);
          } else {
            console.warn('activeMicPlayerIndex is null, mic will not activate');
          }
        },
      });
    } else if (result === 'correct') {
      // Correct answer - say "correct" and reveal the answer
      // Cancel any previous audio first
      speak('Correct', {
        onEnd: () => {
          // Wait longer to ensure previous audio is fully stopped and cleaned up
          setTimeout(() => {
            speak(`The answer is: ${currentQuestion.answer}`, {
              onEnd: () => {
                setTimeout(() => {
                  moveToNextQuestion();
                }, MIMIR_RULES.POST_CORRECT_PAUSE_SECONDS * 1000);
              },
            });
          }, 300); // Increased delay to prevent overlap
        },
      });
    } else {
      // Incorrect answer - say "incorrect" and wait 5 seconds for "repeat"
      // Store current question and player for potential repeat
      currentQuestionForRepeatRef.current = currentQuestion;
      currentPlayerForRepeatRef.current = currentPlayer;
      
      speak('Incorrect', {
        onEnd: () => {
          // Wait longer to ensure previous audio is fully stopped and cleaned up
          setTimeout(() => {
            // Start listening for "repeat" for 5 seconds
            isInRepeatWindowRef.current = true;
            startListening();
            
            // Set timeout to move on if no repeat is detected
            repeatWindowTimeoutRef.current = setTimeout(() => {
              console.log('Repeat window expired, moving on');
              isInRepeatWindowRef.current = false;
              
              if (updates.showAnswer) {
                // Speak the answer and wait for TTS to complete before activating mic
                speak(`The answer is: ${currentQuestion.answer}`, {
                  onEnd: () => {
                    // Play ding sound when moving to next player after wrong answer
                    playDingSound();
                    // Microphone activates only after answer reading completes
                    if (updates.activeMicPlayerIndex !== null) {
                      startListening();
                    }
                  },
                });
              } else if (updates.activeMicPlayerIndex !== null) {
                // For incorrect answers moving to next player, activate mic immediately
                // Play ding sound when moving to next player
                playDingSound();
                console.log('Moving to next player after incorrect answer, activeMicPlayerIndex:', updates.activeMicPlayerIndex);
                setTimeout(() => {
                  console.log('Activating microphone for player:', updates.activeMicPlayerIndex);
                  startListening();
                }, 100);
              } else {
                console.warn('No activeMicPlayerIndex set, mic will not activate. Updates:', updates);
              }
              }, 5000); // 5 seconds to say "repeat"
          }, 300); // Increased delay to prevent overlap
        },
      });
    }
  };
  
  // Update ref whenever handleAnswer changes
  useEffect(() => {
    handleAnswerRef.current = handleAnswer;
  });

  // Helper function to normalize text for phonetic comparison
  const normalizeForPhonetic = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      // Remove common articles and prepositions
      .replace(/\b(the|a|an|of|in|on|at|to|for|with|by|is|are|was|were)\b/g, '')
      // Remove punctuation
      .replace(/[.,!?;:'"()\[\]{}]/g, '')
      // Remove extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Normalize for accent variations (handles Indian, British, American, etc.)
  const normalizeForAccents = (word: string): string => {
    return word
      .toLowerCase()
      // Common accent variations
      .replace(/th/g, 't') // Indian/Bengali: "th" often pronounced as "t"
      .replace(/v/g, 'b') // Bengali: "v" often pronounced as "b"
      .replace(/w/g, 'v') // Some accents: "w" as "v"
      .replace(/z/g, 's') // Some accents: "z" as "s"
      .replace(/r/g, '') // Some accents drop "r" or pronounce differently
      .replace(/h/g, '') // Some accents drop "h"
      // Vowel variations
      .replace(/[aeiou]/g, 'a') // Normalize all vowels (accent differences)
      // Common consonant variations
      .replace(/ph/g, 'f')
      .replace(/gh/g, 'g')
      .replace(/ch/g, 'c')
      .replace(/sh/g, 's')
      .replace(/ck/g, 'k')
      .replace(/qu/g, 'k');
  };

  // Enhanced phonetic matching using Soundex-like algorithm with accent awareness
  const getPhoneticCode = (word: string): string => {
    if (!word || word.length === 0) return '';
    
    // First normalize for accent variations
    const normalized = normalizeForAccents(word);
    
    let code = normalized[0].toUpperCase();
    const rest = normalized.slice(1);
    
    // Map similar-sounding consonants to the same digit (accent-aware)
    const mapping: { [key: string]: string } = {
      'b': '1', 'f': '1', 'p': '1', 'v': '1', // b, f, p, v sound similar across accents
      'c': '2', 'g': '2', 'j': '2', 'k': '2', 'q': '2', 's': '2', 'x': '2', 'z': '2', // c, g, j, k, q, s, x, z
      'd': '3', 't': '3', // d, t (th often becomes t in some accents)
      'l': '4',
      'm': '5', 'n': '5',
      'r': '6'
    };
    
    let lastDigit = '';
    for (let i = 0; i < rest.length && code.length < 4; i++) {
      const char = rest[i];
      // Skip vowels (already normalized) and h, w, y
      if ('ahwy'.includes(char)) continue;
      
      const digit = mapping[char] || '';
      // Don't add consecutive same digits
      if (digit && digit !== lastDigit) {
        code += digit;
        lastDigit = digit;
      }
    }
    
    // Pad to 4 characters
    return code.padEnd(4, '0');
  };

  // Check if two words sound phonetically similar (accent-aware)
  const soundsPhoneticallySimilar = (word1: string, word2: string): boolean => {
    // Direct comparison after accent normalization
    const norm1 = normalizeForAccents(word1);
    const norm2 = normalizeForAccents(word2);
    
    // If normalized versions are very similar, accept
    if (norm1 === norm2) return true;
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
    
    // Get phonetic codes
    const code1 = getPhoneticCode(word1);
    const code2 = getPhoneticCode(word2);
    
    // Exact phonetic match
    if (code1 === code2) return true;
    
    // Check if first 3 characters match (very close)
    if (code1.substring(0, 3) === code2.substring(0, 3)) return true;
    
    // Check if first character matches and at least 1 digit matches (more lenient for accents)
    if (code1[0] === code2[0] || code1[0].toLowerCase() === code2[0].toLowerCase()) {
      const digits1 = code1.substring(1).split('').filter(d => d !== '0');
      const digits2 = code2.substring(1).split('').filter(d => d !== '0');
      const matchingDigits = digits1.filter(d => digits2.includes(d)).length;
      // More lenient: accept if at least 1 digit matches (accent variations)
      if (matchingDigits >= 1 && (digits1.length > 0 || digits2.length > 0)) return true;
    }
    
    // For short words (3-4 chars), be even more lenient
    if (word1.length <= 4 && word2.length <= 4) {
      if (code1[0] === code2[0] || Math.abs(code1.length - code2.length) <= 1) {
        return true;
      }
    }
    
    return false;
  };

  const checkAnswer = (spoken: string, correct: string): 'correct' | 'incorrect' | 'timeout' => {
    // Handle timeout case (empty answer)
    if (!spoken || !spoken.trim()) {
      return 'timeout';
    }

    const normalizedSpoken = normalizeForPhonetic(spoken);
    const normalizedCorrect = normalizeForPhonetic(correct);

    // If normalized strings are empty after cleaning, fall back to original
    if (!normalizedSpoken || !normalizedCorrect) {
      const spokenLower = spoken.toLowerCase().trim();
      const correctLower = correct.toLowerCase().trim();
      return spokenLower.includes(correctLower) || correctLower.includes(spokenLower) ? 'correct' : 'incorrect';
    }

    // Split into words (focus on meaningful words, ignore very short ones)
    const correctWords = normalizedCorrect.split(' ').filter(w => w.length >= 2);
    const spokenWords = normalizedSpoken.split(' ').filter(w => w.length >= 2);

    if (correctWords.length === 0) {
      // Single word answer - check phonetic similarity
      return soundsPhoneticallySimilar(spoken.trim(), correct.trim()) ? 'correct' : 'incorrect';
    }

    // Multi-word answer - check if most words match phonetically
    let phoneticMatches = 0;
    for (const correctWord of correctWords) {
      // Check if any spoken word sounds similar
      for (const spokenWord of spokenWords) {
        if (soundsPhoneticallySimilar(correctWord, spokenWord)) {
          phoneticMatches++;
          break;
        }
      }
    }

    // More lenient threshold for accent variations: accept if 60% or more words match phonetically
    const phoneticSimilarity = phoneticMatches / correctWords.length;
    if (phoneticSimilarity >= 0.6) {
      return 'correct';
    }
    
    // For single-word answers or very short phrases, be even more lenient
    if (correctWords.length === 1 && phoneticMatches === 0) {
      // Try direct phonetic comparison of the full strings
      const fullSpoken = normalizedSpoken.replace(/\s+/g, '');
      const fullCorrect = normalizedCorrect.replace(/\s+/g, '');
      if (soundsPhoneticallySimilar(fullSpoken, fullCorrect)) {
        return 'correct';
      }
    }

    // Also check if the full strings sound similar (for single-word or very short answers)
    if (correctWords.length <= 2 && spokenWords.length <= 2) {
      const fullSpoken = normalizedSpoken.replace(/\s+/g, '');
      const fullCorrect = normalizedCorrect.replace(/\s+/g, '');
      if (soundsPhoneticallySimilar(fullSpoken, fullCorrect)) {
        return 'correct';
      }
    }

    return 'incorrect';
  };

  const handleOverruleDetected = () => {
    stopListening();
    // Disable mic while speaking
    gameState.setGameState({
      micState: 'disabled',
    });
    
    // Speak and wait for TTS to complete before activating mic
    speak('Overrule detected. Say "I was correct" or "I was wrong"', {
      onEnd: () => {
        // Microphone activates only after TTS completes
        startListening();
        gameState.setGameState({
          overruleInProgress: true,
          micState: 'listening',
        });
      },
    });
  };

  const handleOverruleClaim = async (claimType: 'correct' | 'incorrect') => {
    stopListening();
    gameState.setGameState({ micState: 'disabled' });

    if (!gameState.sessionId || !gameState.questions || !gameState.lastAnswerId) {
      console.error('Missing required data for overrule');
      speak('Cannot process overrule. Missing answer data.');
      return;
    }

    const currentQuestion = gameState.questions[gameState.currentQuestionIndex!];
    const challengerPlayerIndex = gameState.currentPlayerIndex!;
    const originalResult = gameState.lastAnswerResult || 'incorrect';
    const lastPlayerIndex = gameState.lastAnswerPlayerIndex ?? gameState.currentPlayerIndex!;

    // Determine new result based on claim
    const newResult: AnswerResult = claimType === 'correct' ? 'correct' : 'incorrect';

    // Calculate points adjustment
    const wasAddressed = lastPlayerIndex === gameState.addressedPlayerIndex;
    const originalPoints = gameEngine.calculateScore(originalResult, wasAddressed);
    const newPoints = gameEngine.calculateScore(newResult, wasAddressed);
    const pointsAdjustment = newPoints - originalPoints;

    try {
      // Record overrule event in database
      const response = await fetch(`/api/games/${gameState.sessionId}/overrule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          originalAnswerId: gameState.lastAnswerId,
          challengerId: gameState.players![challengerPlayerIndex].id,
          challengerName: gameState.players![challengerPlayerIndex].name,
          claimType,
          originalResult,
          newResult,
          pointsAdjustment,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to record overrule:', error);
        speak('Failed to process overrule. Please try again.');
        return;
      }

      // Update game state with overrule result
      const updates = gameEngine.handleOverrule(
        gameState as any,
        lastPlayerIndex,
        claimType
      );

      gameState.setGameState(updates);

      // Announce result and move to next question
      const message = claimType === 'correct'
        ? 'Overrule accepted. Points awarded.'
        : 'Overrule accepted. Penalty applied.';

      speak(message);

      setTimeout(() => {
        moveToNextQuestion();
      }, 2000);
    } catch (error) {
      console.error('Failed to process overrule:', error);
      speak('Failed to process overrule. Moving to next question.');
      setTimeout(() => {
        moveToNextQuestion();
      }, 2000);
    }
  };

  const moveToNextQuestion = () => {
    // Play ding sound when moving to next player/question
    playDingSound();
    
    const updates = gameEngine.moveToNextQuestion(gameState as any);

    if (updates) {
      gameState.setGameState(updates);

      if (updates.status === 'completed') {
        speak('Game completed! Final scores...');
      } else if (gameState.questions && updates.currentQuestionIndex !== undefined) {
        const nextQuestion = gameState.questions[updates.currentQuestionIndex];
        speakQuestion(nextQuestion.question);
      }
    }
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">MIMIR Quiz Game</h1>

        {gameState.status === 'setup' ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6">Setup New Game</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Select Quiz</label>
              {isLoadingQuizzes ? (
                <p>Loading quizzes...</p>
              ) : (
                <select
                  value={selectedQuizId || ''}
                  onChange={(e) => setSelectedQuizId(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md p-2"
                >
                  <option value="">Choose a quiz...</option>
                  {quizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.fileName} - {quiz.topic} ({quiz.league})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">AI Voice & Accent</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Language/Accent</label>
                  <select
                    value={languageCode}
                    onChange={(e) => {
                      setLanguageCode(e.target.value);
                      setVoiceName(''); // Reset voice when language changes
                      setVoiceError(''); // Clear error when changing language
                    }}
                    className="w-full border border-gray-300 rounded-md p-2"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-GB">English (UK)</option>
                    <option value="en-AU">English (Australia)</option>
                    <option value="en-IN">English (India)</option>
                    <option value="es-ES">Spanish (Spain)</option>
                    <option value="es-MX">Spanish (Mexico)</option>
                    <option value="fr-FR">French (France)</option>
                    <option value="de-DE">German</option>
                    <option value="it-IT">Italian</option>
                    <option value="pt-BR">Portuguese (Brazil)</option>
                    <option value="ja-JP">Japanese</option>
                    <option value="ko-KR">Korean</option>
                    <option value="zh-CN">Chinese (Mandarin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Voice</label>
                  {isLoadingVoices ? (
                    <select disabled className="w-full border border-gray-300 rounded-md p-2 bg-gray-100">
                      <option>Loading voices...</option>
                    </select>
                  ) : (
                    <select
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                      className="w-full border border-gray-300 rounded-md p-2"
                    >
                      {availableVoices.length === 0 ? (
                        <option value="">No voices available</option>
                      ) : (
                        availableVoices.map((voice: any) => (
                          <option key={voice.name} value={voice.name}>
                            {voice.name.replace(`${languageCode}-`, '').replace(/-/g, ' ')} 
                            {voice.ssmlGender && ` (${voice.ssmlGender})`}
                          </option>
                        ))
                      )}
                    </select>
                  )}
                  {voiceError && (
                    <p className="text-xs text-yellow-600 mt-1">{voiceError}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select your preferred language/accent and voice for reading questions
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Player Names</label>
              {playerNames.map((name, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const updated = [...playerNames];
                    updated[idx] = e.target.value;
                    setPlayerNames(updated);
                  }}
                  placeholder={`Player ${idx + 1}`}
                  className="w-full border border-gray-300 rounded-md p-2 mb-2"
                />
              ))}
              <button
                onClick={() => setPlayerNames([...playerNames, ''])}
                className="text-primary-600 hover:text-primary-700"
              >
                + Add Player
              </button>
            </div>

            <button
              onClick={handleStartGame}
              className="w-full bg-primary-600 text-white py-3 rounded-md hover:bg-primary-700"
            >
              Create Game
            </button>
          </div>
        ) : gameState.status === 'ready' ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">Game Ready!</h2>
            <div className="mb-6">
              <p className="text-center text-gray-600 mb-4">
                Quiz: {gameState.topic} ({gameState.league})
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gameState.players?.map((player, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 rounded-lg text-center">
                    <div className="font-semibold">{player.name}</div>
                    <div className="text-sm text-gray-600">Player {idx + 1}</div>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={handleStartQuiz}
              className="w-full bg-green-600 text-white py-4 rounded-md hover:bg-green-700 text-xl font-bold"
            >
              🎮 Start Quiz
            </button>
            <p className="text-center text-sm text-gray-500 mt-4">
              Anyone can click Start Quiz to begin
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Scoreboard</h2>
                <div className="text-sm text-gray-600">
                  Question {(gameState.currentQuestionIndex || 0) + 1} of{' '}
                  {gameState.questions?.length || 0}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {gameState.players?.map((player, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg ${
                      idx === gameState.activeMicPlayerIndex
                        ? 'bg-green-100 border-2 border-green-500'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="font-semibold">{player.name}</div>
                    <div className="text-2xl font-bold text-primary-600">
                      {player.score}
                    </div>
                    {idx === gameState.activeMicPlayerIndex && (
                      <div className="text-xs text-green-600 mt-1">
                        {isListening ? '🎤 LISTENING' : '🎤 ACTIVE'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {gameState.questions && gameState.currentQuestionIndex !== undefined && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-4">
                  <span className="text-sm text-gray-600">
                    Round {gameState.questions[gameState.currentQuestionIndex].roundNumber}
                  </span>
                </div>

                <h3 className="text-2xl font-semibold mb-4">
                  {gameState.questions[gameState.currentQuestionIndex].question}
                </h3>

                {gameState.showAnswer && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="font-semibold">Answer:</p>
                    <p className="text-lg">
                      {gameState.questions[gameState.currentQuestionIndex].answer}
                    </p>
                  </div>
                )}

                {transcript && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Last heard:</p>
                    <p>{transcript}</p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Microphone Status</p>
                  <p className="text-lg font-semibold">
                    {gameState.micState === 'listening' && 'Listening...'}
                    {gameState.micState === 'active' && 'Ready'}
                    {gameState.micState === 'overrule_window' &&
                      'Overrule Window (5s)'}
                    {gameState.micState === 'disabled' && 'Disabled'}
                  </p>
                </div>

                <div className="text-3xl font-bold text-primary-600">
                  {gameState.timerSeconds}s
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
