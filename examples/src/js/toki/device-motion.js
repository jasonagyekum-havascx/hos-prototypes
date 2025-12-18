// Device Motion System - handles device orientation for liquid tilt effect on mobile

// Motion system state
let isMotionEnabled = false;
let motionButton = null;
let onTiltUpdateCallback = null;

// Smoothing state for tilt values
let currentTiltX = 0;
let currentTiltZ = 0;
const SMOOTHING_FACTOR = 0.15; // Lower = smoother but slower response
const MAX_TILT_ANGLE = 30; // Maximum angle to consider (degrees)

// Check if device is mobile/tablet
export function isMobileDevice() {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
		(navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
}

// Check if DeviceOrientation is supported
function isOrientationSupported() {
	return 'DeviceOrientationEvent' in window;
}

// Check if permission API is required (iOS 13+)
function requiresPermission() {
	return typeof DeviceOrientationEvent !== 'undefined' &&
		typeof DeviceOrientationEvent.requestPermission === 'function';
}

// Handle device orientation event
function handleDeviceOrientation(event) {
	if (!isMotionEnabled || !onTiltUpdateCallback) return;

	// beta: front-to-back tilt (-180 to 180, 0 = flat)
	// gamma: left-to-right tilt (-90 to 90, 0 = flat)
	const beta = event.beta || 0;
	const gamma = event.gamma || 0;

	// Normalize to -1 to 1 range, clamped by max angle
	// gamma controls X tilt (left-right sloshing)
	// beta controls Z tilt (front-back sloshing)
	const targetTiltX = Math.max(-1, Math.min(1, gamma / MAX_TILT_ANGLE));
	const targetTiltZ = Math.max(-1, Math.min(1, (beta - 45) / MAX_TILT_ANGLE)); // Offset by 45° for natural phone holding angle

	// Apply smoothing (lerp)
	currentTiltX += (targetTiltX - currentTiltX) * SMOOTHING_FACTOR;
	currentTiltZ += (targetTiltZ - currentTiltZ) * SMOOTHING_FACTOR;

	// Call the update callback with smoothed values
	onTiltUpdateCallback(currentTiltX, currentTiltZ);
}

// Request motion permission (required for iOS 13+)
export async function requestMotionPermission() {
	if (!requiresPermission()) {
		// Permission not required (Android, older iOS)
		enableMotionTracking();
		return true;
	}

	try {
		const permission = await DeviceOrientationEvent.requestPermission();
		if (permission === 'granted') {
			enableMotionTracking();
			return true;
		} else {
			console.warn('Device motion permission denied');
			return false;
		}
	} catch (error) {
		console.error('Error requesting motion permission:', error);
		return false;
	}
}

// Enable motion tracking after permission granted
function enableMotionTracking() {
	if (isMotionEnabled) return;

	isMotionEnabled = true;
	window.addEventListener('deviceorientation', handleDeviceOrientation);

	// Update button state
	if (motionButton) {
		motionButton.textContent = 'Motion Enabled';
		motionButton.classList.add('enabled');
		motionButton.disabled = true;
		motionButton.setAttribute('aria-pressed', 'true');
	}

	console.log('Device motion tracking enabled');
}

// Handle button click
async function handleMotionButtonClick() {
	const success = await requestMotionPermission();
	if (!success && motionButton) {
		// Show error state briefly
		motionButton.textContent = 'Permission Denied';
		motionButton.classList.add('error');
		setTimeout(() => {
			motionButton.textContent = 'Enable Motion';
			motionButton.classList.remove('error');
		}, 2000);
	}
}

// Initialize device motion system
export function initDeviceMotion(onTiltUpdate) {
	onTiltUpdateCallback = onTiltUpdate;

	// Only show on mobile devices with orientation support
	if (!isMobileDevice() || !isOrientationSupported()) {
		console.log('Device motion not available on this device');
		return null;
	}

	// Get the button element (should already exist in HTML)
	motionButton = document.getElementById('motionButton');
	if (!motionButton) {
		console.warn('Motion button element not found');
		return null;
	}

	// Setup button click handler
	motionButton.addEventListener('click', handleMotionButtonClick);
	motionButton.addEventListener('keydown', (e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleMotionButtonClick();
		}
	});

	// Show the button
	motionButton.style.display = 'flex';

	return motionButton;
}

// Cleanup function
export function disposeDeviceMotion() {
	if (isMotionEnabled) {
		window.removeEventListener('deviceorientation', handleDeviceOrientation);
		isMotionEnabled = false;
	}

	if (motionButton) {
		motionButton.removeEventListener('click', handleMotionButtonClick);
	}

	currentTiltX = 0;
	currentTiltZ = 0;
	onTiltUpdateCallback = null;
}

// Get current motion state
export function isMotionActive() {
	return isMotionEnabled;
}

