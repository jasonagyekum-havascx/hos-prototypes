import { state, navigateTo, registerScreen, loadHTMLFragment, screens } from './common.js';

export const initLandingScreen = async () => {
  const app = document.querySelector('.app');
  if (!app) return;

  // Load HTML fragment
  const fragment = await loadHTMLFragment('./screens/landing.html');
  if (!fragment) return;

  app.appendChild(fragment);
  const landingScreen = document.getElementById('landingScreen');
  if (!landingScreen) return;

  registerScreen('landing', landingScreen);

  // Activate landing screen if it's the initial screen
  if (state.currentScreen === 'landing') {
    landingScreen.classList.add('active');
  }

  // Initialize voice toggle
  const voiceToggle = document.getElementById('voiceToggle');
  if (voiceToggle) {
    // Set initial state (default: ON)
    voiceToggle.checked = state.voiceEnabled;
    
    const handleVoiceToggle = () => {
      state.voiceEnabled = voiceToggle.checked;
    };
    
    voiceToggle.addEventListener('change', handleVoiceToggle);
    
    // Handle keyboard interaction on the label
    const voiceToggleLabel = voiceToggle.closest('.voice-toggle');
    if (voiceToggleLabel) {
      voiceToggleLabel.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          voiceToggle.checked = !voiceToggle.checked;
          handleVoiceToggle();
        }
      });
    }
  }

  // Initialize simulate mode toggle
  const simulateToggle = document.getElementById('simulateToggle');
  if (simulateToggle) {
    // Set initial state (default: OFF)
    simulateToggle.checked = state.simulateMode;
    
    const handleSimulateToggle = () => {
      state.simulateMode = simulateToggle.checked;
    };
    
    simulateToggle.addEventListener('change', handleSimulateToggle);
    
    // Handle keyboard interaction on the label
    const simulateToggleLabel = simulateToggle.closest('.simulate-toggle');
    if (simulateToggleLabel) {
      simulateToggleLabel.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          simulateToggle.checked = !simulateToggle.checked;
          handleSimulateToggle();
        }
      });
    }
  }

  const handleDestinationClick = async (btn) => {
    const destination = btn.dataset.destination;

    if (!destination) {
      console.warn('Button clicked but no destination found');
      return;
    }

    // Get all buttons fresh each time
    const destinationBtns = landingScreen.querySelectorAll('.destination-btn');
    
    // Update button states
    destinationBtns.forEach(b => {
      b.classList.remove('destination-btn--active');
      b.classList.add('destination-btn--default');
    });
    btn.classList.remove('destination-btn--default');
    btn.classList.add('destination-btn--active');

    state.selectedDestination = destination;

    // Reset chat state before navigating
    state.chatHistory = [];
    state.chatFlowStarted = false;
    state.waitingForUserInput = false;
    state.flowStep = 0;

    // Save state to localStorage for page navigation
    try {
      localStorage.setItem('appState', JSON.stringify({
        selectedDestination: state.selectedDestination,
        chatHistory: state.chatHistory,
        chatFlowStarted: state.chatFlowStarted,
        waitingForUserInput: state.waitingForUserInput,
        flowStep: state.flowStep,
        voiceEnabled: state.voiceEnabled,
        simulateMode: state.simulateMode
      }));
    } catch (e) {
      console.warn('Could not save state to localStorage:', e);
    }

    // Navigate to chat page using hard page load
    window.location.href = './chat.html';
  };

  // Use event delegation on the screen itself to handle clicks
  landingScreen.addEventListener('click', (e) => {
    const btn = e.target.closest('.destination-btn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      handleDestinationClick(btn);
    }
  });

  landingScreen.addEventListener('keydown', (e) => {
    const btn = e.target.closest('.destination-btn');
    if (btn && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.stopPropagation();
      handleDestinationClick(btn);
    }
  });
};

