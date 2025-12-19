// Controls - handles keyboard shortcuts and panel controls

import { closePanel, getActivePanel, getHotspotOverlay } from './hotspots.js';

// Setup panel controls (hotspot panels, keyboard shortcuts)
export function setupPanelControls() {
	const hotspotOverlay = getHotspotOverlay();
	// Close buttons
	document.querySelectorAll('.hotspot-panel-close').forEach(btn => {
		btn.addEventListener('click', closePanel);
		btn.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				closePanel();
			}
		});
	});

	// Overlay click to close
	hotspotOverlay.addEventListener('click', closePanel);

	// Escape key to close
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && getActivePanel()) {
			closePanel();
		}
	});
}
