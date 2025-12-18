// Hotspots - handles hotspot creation, updates, hover, click interactions, and panel visibility

import * as THREE from '../../../../build/three.module.js';

// Hotspot system state
let hotspots = [];
let activePanel = null;
let scene, camera, renderer, raycaster, mouse;
let hotspotLabel, hotspotOverlay;
let onPanelCloseCallback = null;

// Texture loader
const textureLoader = new THREE.TextureLoader();

// Create a hotspot with icon button
function createHotspot(position, label, panelId, iconPath) {
	const group = new THREE.Group();
	group.position.copy(position);

	// Load icon texture
	const texture = textureLoader.load(iconPath);
	texture.colorSpace = THREE.SRGBColorSpace;

	// Create sprite material with the icon
	const spriteMaterial = new THREE.SpriteMaterial({
		map: texture,
		transparent: true,
		opacity: 1,
		depthTest: true,
		depthWrite: false,
	});

	// Create sprite (always faces camera)
	const sprite = new THREE.Sprite(spriteMaterial);
	sprite.scale.set(0.5, 0.5, 1); // Adjust size as needed
	group.add(sprite);

	group.userData = {
		label: label,
		panelId: panelId,
		sprite: sprite,
		baseScale: 0.5,
		hovered: false,
	};

	scene.add(group);
	hotspots.push(group);
}

// Initialize hotspots
export function initHotspots(sceneRef, cameraRef, rendererRef, raycasterRef, mouseRef, onPanelClose = null) {
	scene = sceneRef;
	camera = cameraRef;
	renderer = rendererRef;
	raycaster = raycasterRef;
	mouse = mouseRef;
	onPanelCloseCallback = onPanelClose;
	
	hotspotLabel = document.getElementById('hotspotLabel');
	hotspotOverlay = document.getElementById('hotspotOverlay');

	// Video hotspot - play button at the top (rim level)
	createHotspot(
		new THREE.Vector3(0.0, 3.0, 1.0),
		'Watch the Perfect Serve',
		'panelVideo',
		'../images/assets/play-sign.png'
	);

	// Glass hotspot - plus button upper area
	createHotspot(
		new THREE.Vector3(1.1, 2.4, -0.8),
		'Highball Glass',
		'panelGlass',
		'../images/assets/plus-sign.png'
	);

	// Ice hotspot - plus button middle (ice level)
	createHotspot(
		new THREE.Vector3(-1.0, 1.8, 0.9),
		'The Perfect Ice',
		'panelIce',
		'../images/assets/plus-sign.png'
	);

	// Whisky hotspot - plus button lower (liquid level)
	createHotspot(
		new THREE.Vector3(1.2, 1.2, 0.6),
		'About Toki Whisky',
		'panelWhisky',
		'../images/assets/plus-sign.png'
	);
}

// Update hotspots animation
export function updateHotspots(time) {
	for (const hotspot of hotspots) {
		const { sprite, hovered, baseScale } = hotspot.userData;

		// Subtle pulse animation for the sprite
		const pulse = 1 + Math.sin(time * 2) * 0.08;
		
		// Hover effect - scale up when hovered
		const targetScale = hovered ? baseScale * 1.2 : baseScale;
		const currentScale = sprite.scale.x;
		const newScale = currentScale + (targetScale * pulse - currentScale) * 0.1;
		sprite.scale.set(newScale, newScale, 1);
	}
}

// Check hotspot hover
export function checkHotspotHover() {
	if (!raycaster || !mouse || !camera) return;
	raycaster.setFromCamera(mouse, camera);

	let foundHover = false;

	for (const hotspot of hotspots) {
		const intersects = raycaster.intersectObject(hotspot, true);

		if (intersects.length > 0 && intersects[0].distance < 10) {
			hotspot.userData.hovered = true;
			foundHover = true;

			// Show label
			const screenPos = hotspot.position.clone().project(camera);
			const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
			const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

			hotspotLabel.textContent = hotspot.userData.label;
			hotspotLabel.style.left = x + 'px';
			hotspotLabel.style.top = (y - 50) + 'px';
			hotspotLabel.classList.add('visible');

			renderer.domElement.style.cursor = 'pointer';
		} else {
			hotspot.userData.hovered = false;
		}
	}

	if (!foundHover) {
		hotspotLabel.classList.remove('visible');
		renderer.domElement.style.cursor = 'grab';
	}
}

// Check hotspot click
export function checkHotspotClick() {
	if (!raycaster || !mouse || !camera) return false;
	raycaster.setFromCamera(mouse, camera);

	for (const hotspot of hotspots) {
		const intersects = raycaster.intersectObject(hotspot, true);

		if (intersects.length > 0 && intersects[0].distance < 10) {
			openPanel(hotspot.userData.panelId);
			return true;
		}
	}

	return false;
}

// Open panel
function openPanel(panelId) {
	// Close any open panel first
	closePanel();

	const panel = document.getElementById(panelId);
	if (panel) {
		activePanel = panel;
		panel.classList.add('active');
		hotspotOverlay.classList.add('active');
		hotspotLabel.classList.remove('visible');

		// Focus trap for accessibility
		const closeBtn = panel.querySelector('.hotspot-panel-close');
		if (closeBtn) closeBtn.focus();
	}
}

// Close panel
export function closePanel() {
	const wasOpen = activePanel !== null;
	
	if (activePanel) {
		// Pause video if it exists in the panel
		const video = activePanel.querySelector('video');
		if (video) {
			video.pause();
			video.currentTime = 0;
		}
		
		activePanel.classList.remove('active');
		activePanel = null;
	}

	hotspotOverlay.classList.remove('active');
	
	// Trigger callback if panel was actually open
	if (wasOpen && onPanelCloseCallback) {
		onPanelCloseCallback();
	}
}

// Export for use in controls.js
export function getActivePanel() {
	return activePanel;
}

export function getHotspotOverlay() {
	return hotspotOverlay;
}

