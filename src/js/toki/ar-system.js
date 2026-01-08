// AR System - handles WebXR AR session, hit testing, and placement

import * as THREE from 'three';

let renderer, scene, camera, drinkGroup, controls;
let arSession = null;
let hitTestSource = null;
let reticle = null;
let isPlaced = false;
let referenceSpace = null;

// Initialize AR system
export function initARSystem(rendererRef, sceneRef, cameraRef, drinkGroupRef, controlsRef) {
	renderer = rendererRef;
	scene = sceneRef;
	camera = cameraRef;
	drinkGroup = drinkGroupRef;
	controls = controlsRef;

	// Enable XR on renderer
	renderer.xr.enabled = true;

	// Create reticle for placement indicator
	createReticle();
}

// Create reticle mesh for placement indicator
function createReticle() {
	const geometry = new THREE.RingGeometry(0.15, 0.2, 32);
	const material = new THREE.MeshBasicMaterial({
		color: 0x7ec8e8,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.8
	});
	reticle = new THREE.Mesh(geometry, material);
	reticle.rotation.x = -Math.PI / 2;
	reticle.matrixAutoUpdate = false;
	reticle.visible = false;
	scene.add(reticle);
}

// Start AR session
export async function startARSession() {
	if (!renderer || !renderer.xr) {
		console.error('XR not enabled on renderer');
		return false;
	}

	try {
		// Request AR session with hit-test feature
		const sessionInit = {
			requiredFeatures: ['local'],
			optionalFeatures: ['hit-test', 'dom-overlay']
		};

		arSession = await navigator.xr.requestSession('immersive-ar', sessionInit);
		
		// Set reference space
		referenceSpace = await arSession.requestReferenceSpace('local');
		renderer.xr.setReferenceSpace(referenceSpace);

		// Request hit test source for viewer space
		const viewerSpace = await arSession.requestReferenceSpace('viewer');
		hitTestSource = await arSession.requestHitTestSource({ space: viewerSpace });
		
		// Also request hit test source for local space (for better surface detection)
		try {
			const localHitTestSource = await arSession.requestHitTestSource({ space: referenceSpace });
			// Use local space hit test if available (more accurate)
			if (localHitTestSource) {
				hitTestSource = localHitTestSource;
			}
		} catch (e) {
			// Fallback to viewer space if local space hit test not supported
			console.log('Using viewer space for hit testing');
		}

		// Set up session end handler
		arSession.addEventListener('end', onSessionEnd);

		// Disable orbit controls in AR
		if (controls) {
			controls.enabled = false;
		}

		// Hide background in AR mode
		if (scene.background) {
			scene.userData.originalBackground = scene.background;
			scene.background = null;
		}

		// Set renderer alpha for camera passthrough
		renderer.setClearColor(0x000000, 0);

		// Start XR session
		await renderer.xr.setSession(arSession);

		// Add select event listener for tap-to-place
		arSession.addEventListener('select', onSelectEvent);
		arSession.addEventListener('selectstart', onSelectStart);

		// Start hit testing loop
		arSession.requestAnimationFrame(onXRFrame);

		return true;
	} catch (error) {
		console.error('Error starting AR session:', error);
		return false;
	}
}

// Handle XR frame updates
function onXRFrame(time, frame) {
	if (!arSession || !frame) return;

	// Request next frame
	arSession.requestAnimationFrame(onXRFrame);

	// Get hit test results
	if (hitTestSource && !isPlaced) {
		const hitTestResults = frame.getHitTestResults(hitTestSource);
		
		if (hitTestResults.length > 0) {
			const hit = hitTestResults[0];
			const pose = hit.getPose(referenceSpace);
			
			if (pose) {
				// Update reticle position
				reticle.visible = true;
				reticle.matrix.fromArray(pose.transform.matrix);
				reticle.matrixAutoUpdate = false;
				reticle.updateMatrixWorld(true);
			}
		} else {
			reticle.visible = false;
		}
	}

	// Handle select events for placement (from controllers or touch)
	const inputSources = arSession.inputSources;
	for (let i = 0; i < inputSources.length; i++) {
		const inputSource = inputSources[i];
		const selectEvent = frame.getPose(inputSource.targetRaySpace, referenceSpace);
		
		// Check for select action (button press or touch)
		if (inputSource.gamepad) {
			const gamepad = inputSource.gamepad;
			if (gamepad.buttons && gamepad.buttons.length > 0) {
				const selectButton = gamepad.buttons[0];
				if (selectButton.pressed && selectButton.value > 0.5 && !isPlaced && reticle.visible) {
					placeDrink();
					break;
				}
			}
		}
	}
}

// Place drink at reticle position
function placeDrink() {
	if (!drinkGroup || !reticle || isPlaced) return;

	// Get reticle position and rotation
	const position = new THREE.Vector3();
	const quaternion = new THREE.Quaternion();
	const scale = new THREE.Vector3();
	reticle.matrix.decompose(position, quaternion, scale);

	// Position drink group at reticle
	drinkGroup.position.copy(position);
	drinkGroup.rotation.setFromQuaternion(quaternion);
	drinkGroup.rotation.x = 0; // Keep drink upright
	drinkGroup.rotation.z = 0;

	isPlaced = true;
	reticle.visible = false;
}

// Handle select event (tap/click in AR)
function onSelectEvent(event) {
	if (!isPlaced && reticle && reticle.visible) {
		placeDrink();
	}
}

// Handle select start (optional - for visual feedback)
function onSelectStart(event) {
	// Could add visual feedback here
}

// Handle tap to place (called from external event)
export function handleARPlacement() {
	if (!isPlaced && reticle && reticle.visible) {
		placeDrink();
	}
}

// End AR session
export function endARSession() {
	if (arSession) {
		arSession.end();
	}
}

// Handle session end
function onSessionEnd() {
	// Remove event listeners
	if (arSession) {
		arSession.removeEventListener('select', onSelectEvent);
		arSession.removeEventListener('selectstart', onSelectStart);
	}
	
	// Clean up
	hitTestSource = null;
	arSession = null;
	referenceSpace = null;
	isPlaced = false;

	// Re-enable orbit controls
	if (controls) {
		controls.enabled = true;
	}

	// Restore background
	if (scene.userData.originalBackground !== undefined) {
		scene.background = scene.userData.originalBackground;
		delete scene.userData.originalBackground;
	}

	// Hide reticle
	if (reticle) {
		reticle.visible = false;
	}

	// Reset drink position to origin
	if (drinkGroup) {
		drinkGroup.position.set(0, 0, 0);
		drinkGroup.rotation.set(0, 0, 0);
	}
}

// Check if AR session is active
export function isARSessionActive() {
	return arSession !== null;
}

// Get reticle visibility
export function isReticleVisible() {
	return reticle ? reticle.visible : false;
}

