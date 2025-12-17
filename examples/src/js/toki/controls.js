// Controls - handles keyboard shortcuts and panel controls

import { toggleHelpers } from './lights-config.js';
import { closePanel, getActivePanel, getHotspotOverlay } from './hotspots.js';

// Setup panel controls (hotspot panels, keyboard shortcuts)
export function setupPanelControls(transformControls, lights) {
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

		// 'H' key to toggle light helpers
		if (e.key === 'h' || e.key === 'H') {
			if (lights && lights.helpers && lights.helpers.length > 0) {
				const currentVisibility = lights.helpers[0].visible;
				toggleHelpers(lights, !currentVisibility);
			}
		}

		// 'T' key to set gizmo to translate mode
		if (e.key === 't' || e.key === 'T') {
			if (transformControls) {
				transformControls.setMode('translate');
				// console.log('Gizmo mode: translate');
			}
		}

		// 'R' key to set gizmo to rotate mode
		if (e.key === 'r' || e.key === 'R') {
			if (transformControls) {
				transformControls.setMode('rotate');
				// console.log('Gizmo mode: rotate');
			}
		}

		// 'S' key to set gizmo to scale mode
		if (e.key === 's' || e.key === 'S') {
			if (transformControls) {
				transformControls.setMode('scale');
				// console.log('Gizmo mode: scale');
			}
		}

		// 'D' key to detach gizmo
		if (e.key === 'd' || e.key === 'D') {
			if (transformControls) {
				transformControls.detach();
				// console.log('Gizmo detached');
			}
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

