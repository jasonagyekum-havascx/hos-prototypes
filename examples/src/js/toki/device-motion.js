// Device Motion System - handles device orientation for liquid tilt effect on mobile
// Note: Permission should already be granted from the swirl intro screen

// Motion system state
let isMotionEnabled = false;
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

// Enable motion tracking (permission should already be granted from swirl screen)
function enableMotionTracking() {
	if (isMotionEnabled) return;

	isMotionEnabled = true;
	window.addEventListener('deviceorientation', handleDeviceOrientation);
	console.log('Device motion tracking enabled');
}

// Initialize device motion system - auto-enables on mobile
export function initDeviceMotion(onTiltUpdate) {
	onTiltUpdateCallback = onTiltUpdate;

	// Only enable on mobile devices with orientation support
	if (!isMobileDevice() || !isOrientationSupported()) {
		console.log('Device motion not available on this device');
		return;
	}

	// Auto-enable motion tracking
	// Permission should already be granted from the swirl intro screen
	enableMotionTracking();
}

// Cleanup function
export function disposeDeviceMotion() {
	if (isMotionEnabled) {
		window.removeEventListener('deviceorientation', handleDeviceOrientation);
		isMotionEnabled = false;
	}

	currentTiltX = 0;
	currentTiltZ = 0;
	onTiltUpdateCallback = null;
}

// Get current motion state
export function isMotionActive() {
	return isMotionEnabled;
}
