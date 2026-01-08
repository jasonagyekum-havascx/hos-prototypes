import { state, navigateTo, registerScreen, wait, loadHTMLFragment } from './common.js';
import { speakText, stopSpeaking, isPlaying } from './tts.js';

// Chat conversation flow
const chatFlow = {
  greeting: {
    messages: [
      {
        type: 'ai',
        text: "Hi, I'm Kenji, your personal AI mixologist. Tell me what you want to drink and I'll turn it into an experience you'll never forget."
      },
      {
        type: 'ai',
        text: "What are you in the mood for?"
      }
    ],
    waitForUser: true
  },
  userMood: {
    messages: [
      {
        type: 'user',
        text: "It's been a long day, I need something refreshing."
      }
    ]
  },
  recommendation: {
    messages: [
      {
        type: 'ai',
        text: "Sorry to hear about your day. I have two great options to help you relax this evening."
      }
    ],
    showCocktails: true
  },
  story: {
    messages: [
      {
        type: 'ai',
        text: "Mixing whisky and soda is easy. Making a perfect highball? That's an art."
      },
      {
        type: 'ai',
        text: "Take ice for example. A perfect highball should stay effervescent, but rough ice causes bubbles to form and the drink to fizz out."
      },
      {
        type: 'ai',
        text: "So, I temper the ice by resting it at room temperature for a few minutes. As it begins to melt, surface imperfections are smoothed, helping the highball stay fizzy longer."
      },
      {
        type: 'ai',
        text: "Here's your highball"
      }
    ],
    showCTA: true
  },
  repeatability: {
    messages: [
      {
        type: 'ai',
        text: "I told you it would be an experience!"
      },
      {
        type: 'ai',
        text: "What are you drinking next?"
      }
    ],
    waitForUser: true
  }
};

let chatMessages, chatInput, sendBtn, bartenderContainer, bartenderImages;

// ==================== 
// BARTENDER ANIMATION
// ====================
const startBartenderShaking = () => {
  if (state.isBartenderShaking) return;
  
  state.isBartenderShaking = true;
  bartenderContainer.classList.add('shaking');
  
  let currentImage = 0;
  
  state.bartenderAnimationInterval = setInterval(() => {
    bartenderImages.forEach(img => img.classList.remove('active'));
    currentImage = currentImage === 0 ? 1 : 0;
    bartenderImages[currentImage].classList.add('active');
  }, 800);
};

const stopBartenderShaking = () => {
  if (!state.isBartenderShaking) return;
  
  state.isBartenderShaking = false;
  bartenderContainer.classList.remove('shaking');
  
  if (state.bartenderAnimationInterval) {
    clearInterval(state.bartenderAnimationInterval);
    state.bartenderAnimationInterval = null;
  }
  
  // Reset to first image
  bartenderImages.forEach(img => img.classList.remove('active'));
  bartenderImages[0].classList.add('active');
};

export const showBartenderPose = (poseNumber) => {
  // Stop any shaking animation
  stopBartenderShaking();
  
  // Hide all bartender images
  bartenderImages.forEach(img => img.classList.remove('active'));
  
  // Show the specified pose (1-indexed)
  const poseIndex = poseNumber - 1;
  if (bartenderImages[poseIndex]) {
    bartenderImages[poseIndex].classList.add('active');
  }
};

// ==================== 
// MESSAGE ID GENERATOR
// ====================
let messageIdCounter = 0;
const generateMessageId = () => `msg-${++messageIdCounter}`;

// ==================== 
// CHAT FUNCTIONS
// ====================
const addMessage = (type, text, delay = 0) => {
  return new Promise(resolve => {
    setTimeout(() => {
      const messageId = generateMessageId();
      const messageEl = document.createElement('div');
      messageEl.className = `message message--${type}`;
      messageEl.id = messageId;
      messageEl.setAttribute('role', type === 'ai' ? 'status' : 'log');
      
      // Check if voice mode is enabled for AI messages
      if (type === 'ai' && state.voiceEnabled) {
        // Create audio indicator with transcript toggle
        messageEl.classList.add('message--voice-mode');
        messageEl.innerHTML = `
          <div class="message__audio-indicator" aria-label="Playing audio">
            <div class="audio-bars">
              <span class="audio-bar"></span>
              <span class="audio-bar"></span>
              <span class="audio-bar"></span>
              <span class="audio-bar"></span>
              <span class="audio-bar"></span>
            </div>
            <span class="audio-status">Speaking...</span>
          </div>
          <div class="message__transcript" hidden>
            <p class="message__text">${text}</p>
          </div>
          <button class="message__transcript-toggle" aria-expanded="false" aria-label="View transcript" tabindex="0">
            View transcript
          </button>
        `;
        
        // Set up transcript toggle
        const toggleBtn = messageEl.querySelector('.message__transcript-toggle');
        const transcript = messageEl.querySelector('.message__transcript');
        const audioIndicator = messageEl.querySelector('.message__audio-indicator');
        
        const handleToggleTranscript = () => {
          const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
          toggleBtn.setAttribute('aria-expanded', !isExpanded);
          transcript.hidden = isExpanded;
          toggleBtn.textContent = isExpanded ? 'View transcript' : 'Hide transcript';
        };
        
        toggleBtn.addEventListener('click', handleToggleTranscript);
        toggleBtn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleTranscript();
          }
        });
        
        chatMessages.appendChild(messageEl);
        state.chatHistory.push({ type, text, messageId });
        scrollToBottom();
        
        // Speak the text
        speakText(
          text,
          messageId,
          // onStart callback
          (id) => {
            const el = document.getElementById(id);
            if (el) {
              el.classList.add('message--speaking');
            }
          },
          // onEnd callback
          (id) => {
            const el = document.getElementById(id);
            if (el) {
              el.classList.remove('message--speaking');
              el.classList.add('message--spoken');
              const indicator = el.querySelector('.message__audio-indicator');
              if (indicator) {
                const statusEl = indicator.querySelector('.audio-status');
                if (statusEl) {
                  statusEl.textContent = 'Finished';
                }
              }
            }
          }
        );
      } else {
        // Standard text-only mode
        messageEl.textContent = text;
        chatMessages.appendChild(messageEl);
        state.chatHistory.push({ type, text, messageId });
        scrollToBottom();
      }
      
      resolve();
    }, delay);
  });
};

const addTypingIndicator = () => {
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.id = 'typingIndicator';
  typing.innerHTML = '<span></span><span></span><span></span>';
  chatMessages.appendChild(typing);
  scrollToBottom();
};

const removeTypingIndicator = () => {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
};

const addCocktailCards = () => {
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'cocktail-cards';
  
  const cocktails = [
    { 
      id: 'toki-highball', 
      name: 'Toki Highball', 
      imageSrc: './images/toki-thumbnail.png',
      imageAlt: 'Toki Highball cocktail thumbnail'
    },
    { 
      id: 'roku-gin-fizz', 
      name: 'Roku Gin Fizz', 
      imageSrc: './images/roku-thumbnail.png',
      imageAlt: 'Roku Gin Fizz cocktail thumbnail'
    }
  ];

  cocktails.forEach(cocktail => {
    const card = document.createElement('button');
    card.className = 'cocktail-card';
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Select ${cocktail.name}`);
    card.innerHTML = `<img src="${cocktail.imageSrc}" alt="${cocktail.imageAlt}" />`;
    
    card.addEventListener('click', () => handleCocktailSelect(cocktail, card));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCocktailSelect(cocktail, card);
      }
    });
    
    cardsContainer.appendChild(card);
  });

  chatMessages.appendChild(cardsContainer);
  scrollToBottom();
};

const handleCocktailSelect = (cocktail, cardEl) => {
  // Remove previous selection
  document.querySelectorAll('.cocktail-card').forEach(c => c.classList.remove('selected'));
  cardEl.classList.add('selected');
  state.selectedCocktail = cocktail;

  // Start bartender shaking animation
  startBartenderShaking();

  // Continue to story
  setTimeout(() => {
    playChatSequence('story');
  }, 500);
};

const addExperienceCTA = () => {
  // Stop bartender shaking animation when drink is ready
  stopBartenderShaking();
  
  const ctaContainer = document.createElement('div');
  ctaContainer.style.cssText = 'display: flex; justify-content: flex-start; padding: 8px 0;';
  
  const cta = document.createElement('button');
  cta.className = 'experience-cta';
  cta.setAttribute('tabindex', '0');
  cta.setAttribute('aria-label', 'Experience your highball in immersive view');
  cta.innerHTML = `
    Experience Your Highball
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  `;
  
  cta.addEventListener('click', () => {
    // Navigate to swirl page using hard page load
    window.location.href = './swirl.html';
  });
  
  cta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      window.location.href = './swirl.html';
    }
  });

  ctaContainer.appendChild(cta);
  chatMessages.appendChild(ctaContainer);
  scrollToBottom();
};

const playChatSequence = async (flowKey) => {
  const flow = chatFlow[flowKey];
  if (!flow) return;

  for (let i = 0; i < flow.messages.length; i++) {
    const msg = flow.messages[i];
    
    if (msg.type === 'ai') {
      addTypingIndicator();
      await wait(1200 + Math.random() * 800);
      removeTypingIndicator();
    }
    
    await addMessage(msg.type, msg.text, 100);
    await wait(400);
  }

  if (flow.showCocktails) {
    await wait(500);
    addCocktailCards();
  }

  if (flow.showCTA) {
    await wait(600);
    addExperienceCTA();
  }
};

const startChatFlow = async () => {
  await wait(800);
  await playChatSequence('greeting');
  // Wait for user to send a message - flow continues in handleSendMessage
  state.waitingForUserInput = true;
};

const scrollToBottom = () => {
  chatMessages.scrollTop = chatMessages.scrollHeight;
};

// ==================== 
// EVENT HANDLERS
// ====================
const handleSendMessage = async () => {
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = '';

  // Always use the default flow regardless of what user types
  if (state.waitingForUserInput && state.flowStep === 0) {
    state.waitingForUserInput = false;
    state.flowStep = 1;
    
    // Show the default user message from the screens
    await playChatSequence('userMood');
    await wait(800);
    await playChatSequence('recommendation');
  }
};

const handleKeyDown = (e) => {
  if (e.key === 'Enter') {
    handleSendMessage();
  }
};

export const navigateToRepeatability = async () => {
  // Save state to indicate we should show repeatability flow
  try {
    localStorage.setItem('appState', JSON.stringify({
      showRepeatability: true,
      chatHistory: [],
      chatFlowStarted: false,
      waitingForUserInput: false,
      flowStep: 0
    }));
  } catch (e) {
    console.warn('Could not save state to localStorage:', e);
  }
  
  // Navigate to chat page using hard page load
  window.location.href = './chat.html';
};

// ==================== 
// INITIALIZATION
// ====================
const checkAndStartChatFlow = () => {
  const chatScreen = document.getElementById('chatScreen');
  if (!chatScreen) {
    console.warn('Chat screen not found');
    return;
  }
  
  // Check if we're on a standalone page (chat.html)
  const isStandalonePage = window.location.pathname.includes('chat.html');
  
  const isActive = chatScreen.classList.contains('active');
  const isCurrentScreen = isStandalonePage || state.currentScreen === 'chat';
  
  // Ensure chatMessages is initialized
  if (!chatMessages) {
    chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) {
      console.warn('Chat messages container not found');
      return;
    }
  }
  
  // Only start if screen is active and we haven't started yet
  if (isActive && isCurrentScreen && state.chatHistory.length === 0 && !state.chatFlowStarted) {
    // Clear any existing messages in the container
    chatMessages.innerHTML = '';
    
    state.chatFlowStarted = true;
    // Small delay to ensure screen is fully visible
    setTimeout(() => {
      startChatFlow();
    }, 100);
  }
};

export const initChatScreen = async () => {
  // Check if we're on a standalone page (chat.html) or in SPA mode
  const chatScreen = document.getElementById('chatScreen');
  if (!chatScreen) {
    // SPA mode - try to load fragment
    const app = document.querySelector('.app');
    if (!app) return;

    const fragment = await loadHTMLFragment('./screens/chat.html');
    if (!fragment) return;

    app.appendChild(fragment);
    const loadedChatScreen = document.getElementById('chatScreen');
    if (!loadedChatScreen) return;

    registerScreen('chat', loadedChatScreen);
    initializeChatElements(loadedChatScreen);
    setupChatObservers(loadedChatScreen);
  } else {
    // Standalone page mode - chat screen is already in the DOM
    // Set current screen state for standalone page
    state.currentScreen = 'chat';
    initializeChatElements(chatScreen);
    
    // Ensure chat screen is marked as active
    if (!chatScreen.classList.contains('active')) {
      chatScreen.classList.add('active');
    }
    
    // Start chat flow immediately since we're on a standalone page
    // Reset state to ensure fresh start (unless showing repeatability)
    if (!state.showRepeatability) {
      state.chatHistory = [];
      state.chatFlowStarted = false;
      state.waitingForUserInput = false;
      state.flowStep = 0;
    }
    
    // Use a small delay to ensure DOM is fully ready, then start flow
    setTimeout(() => {
      if (!state.chatFlowStarted && chatMessages) {
        chatMessages.innerHTML = '';
        state.chatFlowStarted = true;
        
        if (state.showRepeatability) {
          // Show repeatability flow
          showBartenderPose(3);
          wait(500).then(() => {
            playChatSequence('repeatability');
          });
          state.showRepeatability = false; // Clear flag
        } else {
          // Start normal chat flow
          startChatFlow();
        }
      }
    }, 200);
  }
};

const initializeChatElements = (chatScreen) => {
  chatMessages = document.getElementById('chatMessages');
  chatInput = document.getElementById('chatInput');
  sendBtn = document.getElementById('sendBtn');
  bartenderContainer = document.getElementById('bartenderContainer');
  bartenderImages = bartenderContainer ? bartenderContainer.querySelectorAll('.bartender-image') : [];

  // Chat input events
  if (sendBtn) {
    sendBtn.addEventListener('click', handleSendMessage);
  }
  if (chatInput) {
    chatInput.addEventListener('keydown', handleKeyDown);
  }
  
  // Load state from localStorage if available (for page navigation)
  try {
    const savedState = localStorage.getItem('appState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      if (parsed.selectedDestination) state.selectedDestination = parsed.selectedDestination;
      if (parsed.chatHistory) state.chatHistory = parsed.chatHistory;
      if (parsed.chatFlowStarted !== undefined) state.chatFlowStarted = parsed.chatFlowStarted;
      if (parsed.waitingForUserInput !== undefined) state.waitingForUserInput = parsed.waitingForUserInput;
      if (parsed.flowStep !== undefined) state.flowStep = parsed.flowStep;
      if (parsed.voiceEnabled !== undefined) state.voiceEnabled = parsed.voiceEnabled;
      if (parsed.showRepeatability) {
        // Store flag to show repeatability flow
        state.showRepeatability = true;
      }
      // Clear the saved state after loading
      localStorage.removeItem('appState');
    }
  } catch (e) {
    console.warn('Could not load state from localStorage:', e);
  }
};

const setupChatObservers = (chatScreen) => {
  // Listen for screen activation via both MutationObserver and custom event
  let lastActiveState = chatScreen.classList.contains('active');
  
  // Listen for custom screen activation event
  chatScreen.addEventListener('screenActivated', () => {
    requestAnimationFrame(() => {
      checkAndStartChatFlow();
    });
  });
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const isActive = chatScreen.classList.contains('active');
        const wasInactive = !lastActiveState;
        
        // Only trigger when transitioning from inactive to active
        if (isActive && wasInactive) {
          // Use requestAnimationFrame to ensure DOM is updated
          requestAnimationFrame(() => {
            checkAndStartChatFlow();
          });
        }
        
        lastActiveState = isActive;
      }
    });
  });

  observer.observe(chatScreen, { attributes: true });
  
  // Also check immediately if screen is already active (for direct navigation)
  if (chatScreen.classList.contains('active')) {
    requestAnimationFrame(() => {
      checkAndStartChatFlow();
    });
  }
};

