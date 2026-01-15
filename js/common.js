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

// ==================== 
// FONT LOADING
// ====================
/**
 * Ensures Futura PT font is loaded, especially important for iOS devices
 * @returns {Promise<void>}
 */
export const ensureFontsLoaded = async () => {
  if (!document.fonts || !document.fonts.check) {
    // Fallback for browsers without Font Loading API
    return Promise.resolve();
  }

  try {
    // Check if Futura PT is already loaded
    if (document.fonts.check('400 1em "futura-pt"')) {
      return Promise.resolve();
    }

    // Wait for the font to load with a timeout
    const fontLoadPromise = document.fonts.ready;
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));

    await Promise.race([fontLoadPromise, timeoutPromise]);

    // Double-check the font is loaded
    if (!document.fonts.check('400 1em "futura-pt"')) {
      console.warn('Futura PT font may not be fully loaded');
    }
  } catch (error) {
    console.warn('Error checking font load status:', error);
  }
};

