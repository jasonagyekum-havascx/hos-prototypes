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
  isBartenderShaking: false
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
  Object.values(screens).forEach(screen => {
    if (screen) screen.classList.remove('active');
  });
  if (screens[screenName]) {
    screens[screenName].classList.add('active');
  }
  state.currentScreen = screenName;
};

export const registerScreen = (name, element) => {
  screens[name] = element;
};

