import { navigateToRepeatability } from './chat.js';
import { loadHTMLFragment } from '../js/common.js';

let recipeModal, recipeModalClose, recipeShareBtn, recipeSaveBtn;

// ==================== 
// RECIPE CARD MODAL HANDLERS
// ====================
export const handleOpenRecipeModal = () => {
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

export const initShareScreen = async () => {
  const app = document.querySelector('.app');
  if (!app) return;

  // Load HTML fragment
  const fragment = await loadHTMLFragment('./screens/share.html');
  if (!fragment) return;

  app.appendChild(fragment);
  recipeModal = document.getElementById('recipeModal');
  recipeModalClose = document.getElementById('recipeModalClose');
  recipeShareBtn = document.getElementById('recipeShareBtn');
  recipeSaveBtn = document.getElementById('recipeSaveBtn');

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
  if (recipeModal) {
    recipeModal.addEventListener('click', (e) => {
      if (e.target === recipeModal || e.target.classList.contains('recipe-modal__background')) {
        handleCloseRecipeModal();
      }
    });
  }

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

