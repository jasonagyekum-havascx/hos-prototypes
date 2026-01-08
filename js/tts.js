// ==================== 
// ELEVEN LABS TTS SERVICE
// ====================

// Audio queue for sequential playback
let audioQueue = [];
let isCurrentlyPlaying = false;
let currentAudio = null;

// Event callbacks
let onPlaybackStart = null;
let onPlaybackEnd = null;

/**
 * Get Eleven Labs configuration from window.APP_CONFIG
 * Randomly selects from available voice IDs if multiple are configured
 */
const getConfig = () => {
  if (!window.APP_CONFIG) {
    console.warn('APP_CONFIG not found. Make sure config.js is loaded.');
    return null;
  }
  
  const { ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, ELEVENLABS_VOICE_IDS } = window.APP_CONFIG;
  
  if (!ELEVENLABS_API_KEY) {
    console.warn('ELEVENLABS_API_KEY not configured');
    return null;
  }
  
  let voiceId;
  
  // Check if multiple voice IDs are available
  if (ELEVENLABS_VOICE_IDS && Array.isArray(ELEVENLABS_VOICE_IDS) && ELEVENLABS_VOICE_IDS.length > 0) {
    // Randomly select one of the available voice IDs
    const randomIndex = Math.floor(Math.random() * ELEVENLABS_VOICE_IDS.length);
    voiceId = ELEVENLABS_VOICE_IDS[randomIndex];
    console.log(`Using voice ${randomIndex + 1} of ${ELEVENLABS_VOICE_IDS.length}: ${voiceId}`);
  } else {
    // Fallback to single voice ID for backwards compatibility
    voiceId = ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default voice (Rachel)
  }
  
  return {
    apiKey: ELEVENLABS_API_KEY,
    voiceId: voiceId
  };
};

/**
 * Simulate audio playback (mock mode)
 * @param {string} text - Text to simulate
 * @returns {Promise<Blob|null>} - Returns null (no actual audio)
 */
const simulateAudio = async (text) => {
  // Calculate realistic duration based on text length
  // Average speaking rate: ~150 words per minute = 2.5 words per second
  const wordCount = text.split(/\s+/).length;
  const durationMs = Math.max(2000, (wordCount / 2.5) * 1000);
  
  // Wait to simulate audio playback
  await new Promise(resolve => setTimeout(resolve, durationMs));
  
  return null; // No actual audio blob
};

/**
 * Fetch audio from Eleven Labs API
 * @param {string} text - Text to convert to speech
 * @returns {Promise<Blob|null>} - Audio blob or null on error
 */
const fetchAudio = async (text) => {
  // Check if simulate mode is enabled
  if (window.state && window.state.simulateMode) {
    console.log('🧪 Simulate mode: Mocking audio for:', text.substring(0, 50) + '...');
    return await simulateAudio(text);
  }
  
  const config = getConfig();
  if (!config) return null;
  
  const { apiKey, voiceId } = config;
  
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Eleven Labs API error:', response.status, errorText);
      return null;
    }
    
    return await response.blob();
  } catch (error) {
    console.error('Error fetching audio from Eleven Labs:', error);
    return null;
  }
};

/**
 * Play audio blob
 * @param {Blob} audioBlob - Audio blob to play
 * @returns {Promise<void>}
 */
const playAudioBlob = (audioBlob) => {
  return new Promise((resolve, reject) => {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;
    
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      resolve();
    });
    
    audio.addEventListener('error', (error) => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      reject(error);
    });
    
    audio.play().catch(reject);
  });
};

/**
 * Process the audio queue
 */
const processQueue = async () => {
  if (isCurrentlyPlaying || audioQueue.length === 0) return;
  
  isCurrentlyPlaying = true;
  
  while (audioQueue.length > 0) {
    const { text, messageId, onStart, onEnd } = audioQueue.shift();
    
    // Notify playback start
    if (onStart) onStart(messageId);
    if (onPlaybackStart) onPlaybackStart(messageId);
    
    // Fetch and play audio (or simulate)
    const audioBlob = await fetchAudio(text);
    
    // In simulate mode or if we have a real audio blob, play it
    if (audioBlob) {
      try {
        await playAudioBlob(audioBlob);
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
    // If audioBlob is null in simulate mode, fetchAudio already waited
    // So we can proceed to notify end
    
    // Notify playback end
    if (onEnd) onEnd(messageId);
    if (onPlaybackEnd) onPlaybackEnd(messageId);
  }
  
  isCurrentlyPlaying = false;
};

/**
 * Speak text using Eleven Labs TTS
 * @param {string} text - Text to speak
 * @param {string} messageId - Optional message ID for tracking
 * @param {Function} onStart - Callback when playback starts
 * @param {Function} onEnd - Callback when playback ends
 */
export const speakText = (text, messageId = null, onStart = null, onEnd = null) => {
  if (!text || text.trim().length === 0) {
    if (onEnd) onEnd(messageId);
    return;
  }
  
  audioQueue.push({ text, messageId, onStart, onEnd });
  processQueue();
};

/**
 * Stop current playback and clear queue
 */
export const stopSpeaking = () => {
  audioQueue = [];
  
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  
  isCurrentlyPlaying = false;
};

/**
 * Check if audio is currently playing
 * @returns {boolean}
 */
export const isPlaying = () => {
  return isCurrentlyPlaying;
};

/**
 * Set global playback callbacks
 * @param {Function} onStart - Called when any playback starts
 * @param {Function} onEnd - Called when any playback ends
 */
export const setPlaybackCallbacks = (onStart, onEnd) => {
  onPlaybackStart = onStart;
  onPlaybackEnd = onEnd;
};

/**
 * Get queue length
 * @returns {number}
 */
export const getQueueLength = () => {
  return audioQueue.length;
};

