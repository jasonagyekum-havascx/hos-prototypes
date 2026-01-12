// ==================== 
// STATE MANAGEMENT
// ====================
export const state = {
  currentScreen: 'landing',
  selectedDestination: 'listening-bar',
  selectedCocktail: null,
  chatHistory: [],
  isTyping: false,
  waitingForUserInput: false,
  flowStep: 0,
  bartenderAnimationInterval: null,
  isBartenderShaking: false,
  chatFlowStarted: false,
  videoIntroPlayed: false
};

// ==================== 
// UTILITIES
// ====================
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Expose to window for testing/debugging
if (typeof window !== 'undefined') {
  window.state = state;
}

// ==================== 
// PLATFORM DETECTION
// ====================
export const isWebXRSupported = () => {
  return 'xr' in navigator;
};

export const isARSupported = async () => {
  if (!isWebXRSupported()) return false;
  try {
    return await navigator.xr.isSessionSupported('immersive-ar');
  } catch (error) {
    console.warn('Error checking AR support:', error);
    return false;
  }
};

export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

export const isAndroid = () => {
  return /Android/.test(navigator.userAgent);
};

