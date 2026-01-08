// ==================== 
// STATE MANAGEMENT
// ====================
export const state = {
  currentScreen: 'kanji',
  selectedDestination: 'listening-bar',
  selectedCocktail: null,
  chatHistory: [],
  isTyping: false,
  waitingForUserInput: false,
  flowStep: 0,
  bartenderAnimationInterval: null,
  isBartenderShaking: false,
  chatFlowStarted: false
};

// ==================== 
// UTILITIES
// ====================
export const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load HTML fragment from file
export const loadHTMLFragment = async (path) => {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load HTML fragment: ${path}`);
    }
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Return all top-level elements (for cases like drink.html with multiple elements)
    const elements = Array.from(doc.body.children);
    if (elements.length === 1) {
      return elements[0];
    }
    // If multiple elements, return a document fragment containing all
    const fragment = document.createDocumentFragment();
    elements.forEach(el => fragment.appendChild(el));
    return fragment;
  } catch (error) {
    console.error(`Error loading HTML fragment from ${path}:`, error);
    return null;
  }
};

// ==================== 
// SCREEN NAVIGATION
// ====================
export const screens = {};

export const navigateTo = (screenName) => {
  // Remove active class from all screens
  Object.values(screens).forEach(screen => {
    if (screen) {
      screen.classList.remove('active');
    }
  });
  
  // Add active class to target screen
  const targetScreen = screens[screenName];
  if (targetScreen) {
    targetScreen.classList.add('active');
    state.currentScreen = screenName;
    
    // Trigger a custom event for screen activation (useful for screens that need to initialize)
    const event = new CustomEvent('screenActivated', { 
      detail: { screenName, screen: targetScreen } 
    });
    targetScreen.dispatchEvent(event);
  } else {
    console.warn(`Screen "${screenName}" not found. Available screens:`, Object.keys(screens));
  }
};

export const registerScreen = (name, element) => {
  screens[name] = element;
};

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

