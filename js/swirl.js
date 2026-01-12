import { state, navigateTo, registerScreen, loadHTMLFragment, isWebXRSupported, isARSupported, isIOS, isAndroid } from './common.js';
import { navigateToRepeatability } from './chat.js';
import { handleOpenRecipeModal } from './share.js';

// ==================== 
// SWIRL DETECTION SYSTEM
// ====================
const swirlState = {
  isActive: false,
  progress: 0,
  lastBeta: null,
  lastGamma: null,
  cumulativeMotion: 0,
  motionThreshold: 100, // Total motion needed to complete reveal
  permissionGranted: false
};

let experienceOverlay, swirlContent, shareBtnContainer, shareBtn, mixAnotherBtn;
let arBtn, iosArBtn, experienceIframe, arModelViewer;
let videoModal, videoModalClose, perfectServeVideo, videoShareBtn, videoMixBtn;
let arSupported = false;

// Check if device supports motion
const supportsDeviceMotion = () => {
  return 'DeviceOrientationEvent' in window;
};

// Request permission for iOS 13+
const requestSwirlPermission = async () => {
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Motion permission error:', error);
      return false;
    }
  }
  return true; // No permission needed (Android, etc.)
};

// Handle device orientation for swirl detection
const handleSwirlOrientation = (event) => {
  if (!swirlState.isActive || swirlState.progress >= 100) return;

  const beta = event.beta || 0;  // Front-back tilt
  const gamma = event.gamma || 0; // Left-right tilt

  if (swirlState.lastBeta !== null && swirlState.lastGamma !== null) {
    // Calculate delta movement
    const deltaBeta = Math.abs(beta - swirlState.lastBeta);
    const deltaGamma = Math.abs(gamma - swirlState.lastGamma);
    
    // Combine movements (swirl detection)
    const movement = deltaBeta + deltaGamma;
    
    // Only count significant movements (filter out noise)
    if (movement > 2) {
      swirlState.cumulativeMotion += movement * 0.5;
      
      // Calculate progress percentage
      swirlState.progress = Math.min(100, (swirlState.cumulativeMotion / swirlState.motionThreshold) * 100);
      
      // Update UI
      updateSwirlProgress();
    }
  }

  swirlState.lastBeta = beta;
  swirlState.lastGamma = gamma;
};

// Update swirl progress UI
const updateSwirlProgress = () => {
  // Start fading in the experience overlay at 50%
  if (swirlState.progress >= 50 && experienceOverlay) {
    const fadeProgress = (swirlState.progress - 50) / 50; // 0 to 1
    experienceOverlay.style.opacity = fadeProgress;
  }

  // Complete the reveal at 100%
  if (swirlState.progress >= 100) {
    completeSwirl();
  }
};

// Complete the swirl reveal
const completeSwirl = async () => {
  swirlState.isActive = false;
  window.removeEventListener('deviceorientation', handleSwirlOrientation);
  
  if (experienceOverlay) {
    experienceOverlay.classList.add('active');
    // Add class to swirl screen to trigger header color change
    const swirlScreen = document.getElementById('swirlScreen');
    if (swirlScreen) {
      swirlScreen.classList.add('experience-active');
    }
  }

  // Check AR support and show appropriate buttons
  await checkARSupport();

  // Show share button after a brief delay
  setTimeout(() => {
    showShareButton();
  }, 1500);
};

// Check AR support and show appropriate buttons
const checkARSupport = async () => {
  if (!experienceOverlay) return;

  const isIOSDevice = isIOS();
  const isAndroidDevice = isAndroid();
  
  // Check WebXR AR support for Android/Chrome
  if (isWebXRSupported()) {
    arSupported = await isARSupported();
    
    if (arSupported && arBtn) {
      arBtn.style.display = 'block';
    }
  }
  
  // Show iOS AR Quick Look button if on iOS
  if (isIOSDevice && iosArBtn && arModelViewer) {
    iosArBtn.style.display = 'block';
  }
};

// Handle AR button click (WebXR)
const handleARClick = async () => {
  if (!experienceIframe || !arSupported) return;
  
  // Send message to iframe to start AR session
  experienceIframe.contentWindow.postMessage({ type: 'startAR' }, '*');
};

// Handle iOS AR button click (AR Quick Look)
const handleIOSARClick = () => {
  if (!arModelViewer) return;
  
  // Trigger AR Quick Look
  arModelViewer.activateAR();
};

// Start swirl detection
const startSwirlDetection = async () => {
  if (!supportsDeviceMotion()) {
    console.log('Device motion not supported');
    return;
  }

  // Request permission if needed
  if (!swirlState.permissionGranted) {
    swirlState.permissionGranted = await requestSwirlPermission();
    if (!swirlState.permissionGranted) {
      console.log('Motion permission denied');
      return;
    }
  }

  // Reset state
  swirlState.isActive = true;
  swirlState.progress = 0;
  swirlState.cumulativeMotion = 0;
  swirlState.lastBeta = null;
  swirlState.lastGamma = null;

  // Start listening
  window.addEventListener('deviceorientation', handleSwirlOrientation);
};

// Stop swirl detection
const stopSwirlDetection = () => {
  swirlState.isActive = false;
  window.removeEventListener('deviceorientation', handleSwirlOrientation);
};

// Handle tap to continue (also requests motion permission)
const handleSwirlFallback = async () => {
  // Request motion permission before transitioning
  if (!swirlState.permissionGranted) {
    swirlState.permissionGranted = await requestSwirlPermission();
  }
  
  swirlState.progress = 100;
  updateSwirlProgress();
  completeSwirl();
};

// Show share button when experience is complete
const showShareButton = () => {
  if (shareBtnContainer) {
    shareBtnContainer.classList.add('visible');
  }
};

export const initSwirlScreen = async () => {
  // Check if we're on a standalone page (swirl.html) or in SPA mode
  const swirlScreen = document.getElementById('swirlScreen');
  
  if (!swirlScreen) {
    // SPA mode - try to load fragment
    const app = document.querySelector('.app');
    if (!app) return;

    const fragment = await loadHTMLFragment('./screens/swirl.html');
    if (!fragment) return;

    app.appendChild(fragment);
    const loadedSwirlScreen = document.getElementById('swirlScreen');
    if (!loadedSwirlScreen) return;

    registerScreen('swirl', loadedSwirlScreen);
    initializeSwirlElements(loadedSwirlScreen);
    setupSwirlObservers(loadedSwirlScreen);
  } else {
    // Standalone page mode - swirl screen is already in the DOM
    state.currentScreen = 'swirl';
    // Ensure swirl screen is marked as active
    if (!swirlScreen.classList.contains('active')) {
      swirlScreen.classList.add('active');
    }
    initializeSwirlElements(swirlScreen);
    // Start swirl detection immediately on standalone page
    setTimeout(() => {
      resetSwirlState();
    }, 500);
  }
};

const initializeSwirlElements = (swirlScreen) => {
  experienceOverlay = document.getElementById('experienceOverlay');
  swirlContent = document.getElementById('swirlContent');
  shareBtnContainer = document.getElementById('shareBtnContainer');
  shareBtn = document.getElementById('shareBtn');
  mixAnotherBtn = document.getElementById('mixAnotherBtn');
  arBtn = document.getElementById('arBtn');
  iosArBtn = document.getElementById('iosArBtn');
  experienceIframe = document.getElementById('experienceIframe');
  arModelViewer = document.getElementById('arModelViewer');
  
  // Video modal elements
  videoModal = document.getElementById('videoModal');
  videoModalClose = document.getElementById('videoModalClose');
  perfectServeVideo = document.getElementById('perfectServeVideo');
  videoShareBtn = document.getElementById('videoShareBtn');
  videoMixBtn = document.getElementById('videoMixBtn');

  setupSwirlEventHandlers();
};

const resetSwirlState = () => {
  swirlState.progress = 0;
  swirlState.cumulativeMotion = 0;
  if (experienceOverlay) {
    experienceOverlay.style.opacity = '0';
    experienceOverlay.classList.remove('active');
  }
  // Remove experience-active class to reset header to black
  const swirlScreen = document.getElementById('swirlScreen');
  if (swirlScreen) {
    swirlScreen.classList.remove('experience-active');
  }
  if (shareBtnContainer) {
    shareBtnContainer.classList.remove('visible');
  }
  // Hide AR buttons
  if (arBtn) arBtn.style.display = 'none';
  if (iosArBtn) iosArBtn.style.display = 'none';
  // Start detection after a brief delay
  setTimeout(() => {
    startSwirlDetection();
  }, 500);
};

const setupSwirlObservers = (swirlScreen) => {
  // Listen for screen navigation (SPA mode only)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        if (swirlScreen.classList.contains('active') && state.currentScreen === 'swirl') {
          resetSwirlState();
        } else {
          stopSwirlDetection();
        }
      }
    });
  });

  observer.observe(swirlScreen, { attributes: true });
};

const setupSwirlEventHandlers = () => {

  // Tap to continue on swirl screen
  if (swirlContent) {
    swirlContent.addEventListener('click', handleSwirlFallback);
    swirlContent.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSwirlFallback();
      }
    });
  }

  // Share button events
  if (shareBtn) {
    shareBtn.addEventListener('click', handleOpenRecipeModal);
    shareBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpenRecipeModal();
      }
    });
  }

  // Mix another cocktail button events
  if (mixAnotherBtn) {
    mixAnotherBtn.addEventListener('click', () => {
      // Navigate to chat page with repeatability flow
      navigateToRepeatability();
    });
    mixAnotherBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToRepeatability();
      }
    });
  }

  // AR button events (WebXR)
  if (arBtn) {
    arBtn.addEventListener('click', handleARClick);
    arBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleARClick();
      }
    });
  }

  // iOS AR button events (AR Quick Look)
  if (iosArBtn) {
    iosArBtn.addEventListener('click', handleIOSARClick);
    iosArBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleIOSARClick();
      }
    });
  }

  // Listen for messages from iframe (proto-toki.html) for hotspot panel visibility
  window.addEventListener('message', (event) => {
    if (!shareBtnContainer) return;
    
    if (event.data?.type === 'hotspotPanelOpen') {
      shareBtnContainer.style.opacity = '0';
      shareBtnContainer.style.pointerEvents = 'none';
    } else if (event.data?.type === 'hotspotPanelClose') {
      shareBtnContainer.style.opacity = '';
      shareBtnContainer.style.pointerEvents = '';
    }
  });

  // Video modal close events
  if (videoModalClose) {
    videoModalClose.addEventListener('click', handleCloseVideoModal);
    videoModalClose.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCloseVideoModal();
      }
    });
  }

  // Video modal backdrop click to close
  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal || e.target.classList.contains('video-modal__panel')) {
        // Don't close if clicking on panel content
      }
    });
  }

  // Video share button
  if (videoShareBtn) {
    videoShareBtn.addEventListener('click', () => {
      handleCloseVideoModal();
      handleOpenRecipeModal();
    });
    videoShareBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCloseVideoModal();
        handleOpenRecipeModal();
      }
    });
  }

  // Video mix another button
  if (videoMixBtn) {
    videoMixBtn.addEventListener('click', () => {
      handleCloseVideoModal();
      navigateToRepeatability();
    });
    videoMixBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCloseVideoModal();
        navigateToRepeatability();
      }
    });
  }
};

// Video modal handlers
const handleOpenVideoModal = () => {
  if (videoModal) {
    videoModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (perfectServeVideo) {
      perfectServeVideo.play();
    }
  }
};

const handleCloseVideoModal = () => {
  if (videoModal) {
    videoModal.classList.remove('active');
    document.body.style.overflow = '';
    if (perfectServeVideo) {
      perfectServeVideo.pause();
      perfectServeVideo.currentTime = 0;
    }
  }
};

