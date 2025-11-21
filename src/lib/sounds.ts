// Sound utility functions for game audio feedback

/**
 * Play a bell sound (for timeouts)
 */
export function playBellSound(): void {
  if (typeof window === 'undefined') return;
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Bell-like sound: multiple frequencies
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.2);
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}

/**
 * Play a ding sound (for player transitions)
 */
export function playDingSound(): void {
  if (typeof window === 'undefined') return;
  
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Pleasant ding sound
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.15);
  
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
  
  oscillator.type = 'sine';
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
}

