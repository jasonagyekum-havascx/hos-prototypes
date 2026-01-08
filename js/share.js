import { navigateToRepeatability } from './chat.js';
import { loadHTMLFragment } from './common.js';

let recipeModal, recipeModalClose, recipeShareBtn, recipeSaveBtn;
let isInitialized = false;

// ==================== 
// RECIPE CARD MODAL HANDLERS
// ====================
export const handleOpenRecipeModal = () => {
  // Auto-initialize if modal exists in DOM but wasn't initialized
  if (!isInitialized) {
    initRecipeModalElements();
  }
  
  if (recipeModal) {
    recipeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

const handleCloseRecipeModal = () => {
  if (recipeModal) {
    recipeModal.classList.remove('active');
    document.body.style.overflow = '';
  }
};

const handleRecipeShare = async () => {
  // Navigate to repeatability screen
  navigateToRepeatability();
};

const handleRecipeSave = () => {
  // Navigate to repeatability screen
  navigateToRepeatability();
};

const handleRecipeModalKeyDown = (e) => {
  if (e.key === 'Escape') {
    handleCloseRecipeModal();
  }
};

// Initialize modal elements and event handlers (for standalone pages or SPA)
const initRecipeModalElements = () => {
  if (isInitialized) return;
  
  recipeModal = document.getElementById('recipeModal');
  recipeModalClose = document.getElementById('recipeModalClose');
  recipeShareBtn = document.getElementById('recipeShareBtn');
  recipeSaveBtn = document.getElementById('recipeSaveBtn');

  if (!recipeModal) return;
  
  isInitialized = true;

  // Recipe modal close events
  if (recipeModalClose) {
    recipeModalClose.addEventListener('click', handleCloseRecipeModal);
    recipeModalClose.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCloseRecipeModal();
      }
    });
  }

  // Recipe modal backdrop click
  recipeModal.addEventListener('click', (e) => {
    if (e.target === recipeModal || e.target.classList.contains('recipe-modal__background')) {
      handleCloseRecipeModal();
    }
  });

  // Recipe share and save button events
  if (recipeShareBtn) {
    recipeShareBtn.addEventListener('click', handleRecipeShare);
    recipeShareBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleRecipeShare();
      }
    });
  }

  if (recipeSaveBtn) {
    recipeSaveBtn.addEventListener('click', handleRecipeSave);
    recipeSaveBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleRecipeSave();
      }
    });
  }

  // Close recipe modal on Escape key
  document.addEventListener('keydown', handleRecipeModalKeyDown);
};

export const initShareScreen = async () => {
  // Check if modal already exists in DOM (standalone page)
  if (document.getElementById('recipeModal')) {
    initRecipeModalElements();
    return;
  }
  
  // SPA mode - load fragment
  const app = document.querySelector('.app');
  if (!app) return;

  // Load HTML fragment
  const fragment = await loadHTMLFragment('./screens/share.html');
  if (!fragment) return;

  app.appendChild(fragment);
  
  // Initialize the modal elements and event handlers
  initRecipeModalElements();
};

