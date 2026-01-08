import { registerScreen, loadHTMLFragment } from './common.js';
import { navigateToRepeatability } from './chat.js';
import { handleOpenRecipeModal } from './share.js';

let videoModal, videoModalClose, videoHotspot, perfectServeVideo, videoShareBtn, videoMixBtn;

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
};

