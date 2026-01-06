import { state, navigateTo, registerScreen, loadHTMLFragment } from '../js/common.js';

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

  const destinationBtns = landingScreen.querySelectorAll('.destination-btn');

  const handleDestinationClick = (e) => {
    const btn = e.currentTarget;
    const destination = btn.dataset.destination;

    // Update button states
    destinationBtns.forEach(b => {
      b.classList.remove('destination-btn--active');
      b.classList.add('destination-btn--default');
    });
    btn.classList.remove('destination-btn--default');
    btn.classList.add('destination-btn--active');

    state.selectedDestination = destination;

    // Navigate to chat after short delay
    setTimeout(() => {
      navigateTo('chat');
    }, 300);
  };

  // Destination button events
  destinationBtns.forEach(btn => {
    btn.addEventListener('click', handleDestinationClick);
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleDestinationClick(e);
      }
    });
  });
};

