// ==================== 
// AUDIO MANAGER
// ====================

let audioElement = null;
let isInitialized = false;

// Initialize audio element
export const initAudio = () => {
  if (isInitialized && audioElement) {
    return audioElement;
  }

  audioElement = new Audio('./images/japa-jazz.mp3');
  audioElement.loop = true;
  audioElement.volume = 1.0; // Volume controlled by device

  // Handle errors
  audioElement.addEventListener('error', (e) => {
    console.error('Audio error:', e);
  });

  isInitialized = true;
  return audioElement;
};

// Play audio
export const playAudio = () => {
  if (!audioElement) {
    initAudio();
  }

  // Check if muted in localStorage
  const isMuted = getMuteState();
  if (isMuted) {
    return; // Don't play if muted
  }

  audioElement.play().catch(err => {
    console.warn('Audio play failed:', err);
  });
};

// Pause audio
export const pauseAudio = () => {
  if (audioElement) {
    audioElement.pause();
  }
};

// Toggle mute state
export const toggleMute = () => {
  if (!audioElement) {
    initAudio();
  }

  const currentMuted = getMuteState();
  const newMuted = !currentMuted;
  
  setMuteState(newMuted);

  if (newMuted) {
    pauseAudio();
  } else {
    playAudio();
  }

  return newMuted;
};

// Check if audio is muted
export const isMuted = () => {
  return getMuteState();
};

// Get mute state from localStorage
const getMuteState = () => {
  try {
    const stored = localStorage.getItem('audioMuted');
    return stored === 'true';
  } catch (e) {
    console.warn('Could not read mute state from localStorage:', e);
    return false;
  }
};

// Set mute state in localStorage
const setMuteState = (muted) => {
  try {
    localStorage.setItem('audioMuted', muted.toString());
  } catch (e) {
    console.warn('Could not save mute state to localStorage:', e);
  }
};

// Get audio element (for external access if needed)
export const getAudioElement = () => {
  if (!audioElement) {
    initAudio();
  }
  return audioElement;
};

