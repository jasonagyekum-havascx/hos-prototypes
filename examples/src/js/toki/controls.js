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

// Setup UI controls (fizz slider, orange slice toggle)
export function setupControls(fizzIntensityRef, liquidUniforms, orangeSliceVisibleRef, toggleOrangeSlice) {
	const fizzSlider = document.getElementById('fizzSlider');
	const fizzValue = document.getElementById('fizzValue');
	const sliceToggle = document.getElementById('sliceToggle');

	const handleFizzChange = () => {
		fizzIntensityRef.value = parseFloat(fizzSlider.value) / 100;
		fizzValue.textContent = fizzSlider.value + '%';
		liquidUniforms.uFizz.value = fizzIntensityRef.value;
	};

	const handleSliceToggle = () => {
		orangeSliceVisibleRef.value = !orangeSliceVisibleRef.value;
		toggleOrangeSlice(orangeSliceVisibleRef.value);
		sliceToggle.textContent = orangeSliceVisibleRef.value ? 'Visible' : 'Hidden';
		sliceToggle.classList.toggle('active', orangeSliceVisibleRef.value);
		sliceToggle.setAttribute('aria-pressed', orangeSliceVisibleRef.value);
	};

	fizzSlider.addEventListener('input', handleFizzChange);
	sliceToggle.addEventListener('click', handleSliceToggle);

	// Keyboard support
	sliceToggle.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') handleSliceToggle();
	});
}

