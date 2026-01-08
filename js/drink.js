import { registerScreen, loadHTMLFragment } from './common.js';
import { navigateToRepeatability } from './chat.js';
import { handleOpenRecipeModal } from './share.js';
import { createKanjiSketch } from './kanji.js';

let videoModal, videoModalClose, videoHotspot, perfectServeVideo, videoShareBtn, videoMixBtn;
let kanjiModal, kanjiModalClose, kanjiHotspot, kanjiSketch, kanjiModalProgressFill, kanjiModalProgressText;

// ==================== 
// VIDEO MODAL HANDLERS
// ====================
const handleOpenVideoModal = () => {
  videoModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  // Don't auto-play, let user control
};

const handleCloseVideoModal = () => {
  videoModal.classList.remove('active');
  document.body.style.overflow = '';
  if (perfectServeVideo) {
    perfectServeVideo.pause();
    perfectServeVideo.currentTime = 0;
  }
};

const handleVideoModalKeyDown = (e) => {
  if (e.key === 'Escape') {
    handleCloseVideoModal();
  }
};

const handleVideoShare = () => {
  handleCloseVideoModal();
  handleOpenRecipeModal();
};

const handleVideoMixAnother = () => {
  handleCloseVideoModal();
  navigateToRepeatability();
};

// ==================== 
// KANJI MODAL HANDLERS
// ====================
const loadP5Library = () => {
  return new Promise((resolve, reject) => {
    if (typeof p5 !== 'undefined') {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load p5.js'));
    document.head.appendChild(script);
  });
};

const handleOpenKanjiModal = async () => {
  kanjiModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Load p5.js if not already loaded
  try {
    await loadP5Library();
    
    // Initialize kanji sketch with completion callback
    if (!kanjiSketch) {
      const onComplete = () => {
        setTimeout(() => {
          handleCloseKanjiModal();
        }, 500);
      };
      
      kanjiSketch = new p5(createKanjiSketch(onComplete));
      
      // Update progress UI references for the modal
      kanjiModalProgressFill = document.getElementById('kanjiModalProgressFill');
      kanjiModalProgressText = document.getElementById('kanjiModalProgressText');
      
      // Expose progress elements globally for kanji sketch to access
      window.kanjiModalProgressFill = kanjiModalProgressFill;
      window.kanjiModalProgressText = kanjiModalProgressText;
    }
  } catch (error) {
    console.error('Error initializing kanji modal:', error);
  }
};

const handleCloseKanjiModal = () => {
  kanjiModal.classList.remove('active');
  document.body.style.overflow = '';
  
  // Clean up the sketch
  if (kanjiSketch) {
    kanjiSketch.remove();
    kanjiSketch = null;
  }
  
  // Clean up global references
  if (window.kanjiModalProgressFill) {
    delete window.kanjiModalProgressFill;
  }
  if (window.kanjiModalProgressText) {
    delete window.kanjiModalProgressText;
  }
};

const handleKanjiModalKeyDown = (e) => {
  if (e.key === 'Escape') {
    handleCloseKanjiModal();
  }
};

export const initDrinkScreen = async () => {
  const app = document.querySelector('.app');
  if (!app) return;

  // Load HTML fragment (contains both immersive screen and video modal)
  const fragment = await loadHTMLFragment('./screens/drink.html');
  if (!fragment) return;

  // Append all elements from fragment
  if (fragment.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    // Multiple elements - append each one
    while (fragment.firstChild) {
      app.appendChild(fragment.firstChild);
    }
  } else {
    // Single element
    app.appendChild(fragment);
  }

  const immersiveScreen = document.getElementById('immersiveScreen');
  if (!immersiveScreen) return;

  registerScreen('immersive', immersiveScreen);

  videoModal = document.getElementById('videoModal');
  videoModalClose = document.getElementById('videoModalClose');
  videoHotspot = document.getElementById('videoHotspot');
  perfectServeVideo = document.getElementById('perfectServeVideo');
  videoShareBtn = document.getElementById('videoShareBtn');
  videoMixBtn = document.getElementById('videoMixBtn');
  
  kanjiModal = document.getElementById('kanjiModal');
  kanjiModalClose = document.getElementById('kanjiModalClose');
  kanjiHotspot = document.getElementById('kanjiHotspot');

  // Immersive drink click - navigate to 3D experience
  const drinkContainer = document.getElementById('drinkContainer');
  if (drinkContainer) {
    drinkContainer.addEventListener('click', () => {
      window.location.href = '../proto-toki.html';
    });
    drinkContainer.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.location.href = '../proto-toki.html';
      }
    });
  }

  // Video hotspot events
  if (videoHotspot) {
    videoHotspot.addEventListener('click', handleOpenVideoModal);
    videoHotspot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpenVideoModal();
      }
    });
  }

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

  // Close modal on Escape key
  document.addEventListener('keydown', handleVideoModalKeyDown);

  // Video modal share and mix buttons
  if (videoShareBtn) {
    videoShareBtn.addEventListener('click', handleVideoShare);
    videoShareBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleVideoShare();
      }
    });
  }

  if (videoMixBtn) {
    videoMixBtn.addEventListener('click', handleVideoMixAnother);
    videoMixBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleVideoMixAnother();
      }
    });
  }

  // Close video modal on panel outside click
  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal) {
        handleCloseVideoModal();
      }
    });
  }

  // Kanji hotspot events
  if (kanjiHotspot) {
    kanjiHotspot.addEventListener('click', handleOpenKanjiModal);
    kanjiHotspot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpenKanjiModal();
      }
    });
  }

  // Kanji modal close events
  if (kanjiModalClose) {
    kanjiModalClose.addEventListener('click', handleCloseKanjiModal);
    kanjiModalClose.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCloseKanjiModal();
      }
    });
  }

  // Close kanji modal on Escape key
  document.addEventListener('keydown', handleKanjiModalKeyDown);

  // Close kanji modal on panel outside click
  if (kanjiModal) {
    kanjiModal.addEventListener('click', (e) => {
      if (e.target === kanjiModal) {
        handleCloseKanjiModal();
      }
    });
  }
};

