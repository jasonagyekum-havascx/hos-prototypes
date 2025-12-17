// Hotspots - handles hotspot creation, updates, hover, click interactions, and panel visibility

import * as THREE from '../../../../build/three.module.js';

// Hotspot system state
let hotspots = [];
let activePanel = null;
let scene, camera, renderer, raycaster, mouse;
let hotspotLabel, hotspotOverlay;

// Create a hotspot
function createHotspot(position, label, panelId, color = 0x7ec8e8) {
	const group = new THREE.Group();
	group.position.copy(position);

	// Inner pulsing dot
	const dotGeometry = new THREE.SphereGeometry(0.06, 16, 16);
	const dotMaterial = new THREE.MeshBasicMaterial({
		color: color,
		transparent: true,
		opacity: 0.9,
	});
	const dot = new THREE.Mesh(dotGeometry, dotMaterial);
	group.add(dot);

	// Outer ring
	const ringGeometry = new THREE.RingGeometry(0.1, 0.14, 32);
	const ringMaterial = new THREE.MeshBasicMaterial({
		color: color,
		transparent: true,
		opacity: 0.6,
		side: THREE.DoubleSide,
	});
	const ring = new THREE.Mesh(ringGeometry, ringMaterial);
	ring.lookAt(camera.position);
	group.add(ring);

	// Pulse ring (animated)
	const pulseGeometry = new THREE.RingGeometry(0.08, 0.1, 32);
	const pulseMaterial = new THREE.MeshBasicMaterial({
		color: color,
		transparent: true,
		opacity: 0.5,
		side: THREE.DoubleSide,
	});
	const pulseRing = new THREE.Mesh(pulseGeometry, pulseMaterial);
	pulseRing.lookAt(camera.position);
	group.add(pulseRing);

	group.userData = {
		label: label,
		panelId: panelId,
		dot: dot,
		ring: ring,
		pulseRing: pulseRing,
		baseScale: 1,
		hovered: false,
	};

	scene.add(group);
	hotspots.push(group);
}

// Initialize hotspots
export function initHotspots(sceneRef, cameraRef, rendererRef, raycasterRef, mouseRef) {
	scene = sceneRef;
	camera = cameraRef;
	renderer = rendererRef;
	raycaster = raycasterRef;
	mouse = mouseRef;
	
	hotspotLabel = document.getElementById('hotspotLabel');
	hotspotOverlay = document.getElementById('hotspotOverlay');

	// Whisky hotspot - at the liquid level
	createHotspot(
		new THREE.Vector3(0.9, 1.5, 0.4),
		'About Toki Whisky',
		'panelWhisky',
		0xdbb85c
	);

	// Ice hotspot - near the ice cubes
	createHotspot(
		new THREE.Vector3(-0.5, 2.2, 0.7),
		'The Perfect Ice',
		'panelIce',
		0xaaddff
	);

	// Glass hotspot - on the glass rim
	createHotspot(
		new THREE.Vector3(0.6, 2.8, -0.5),
		'Highball Glass',
		'panelGlass',
		0x7ec8e8
	);

	// Video hotspot - near the base
	createHotspot(
		new THREE.Vector3(-0.8, 0.6, -0.6),
		'Watch the Ritual',
		'panelVideo',
		0xff9f43
	);
}

// Update hotspots animation
export function updateHotspots(time) {
	for (const hotspot of hotspots) {
		const { ring, pulseRing, hovered } = hotspot.userData;

		// Make rings face camera
		ring.lookAt(camera.position);
		pulseRing.lookAt(camera.position);

		// Pulse animation
		const pulse = 1 + Math.sin(time * 3) * 0.15;
		pulseRing.scale.set(pulse, pulse, pulse);
		pulseRing.material.opacity = 0.5 * (1 - (pulse - 1) / 0.15 * 0.5);

		// Hover effect
		const targetScale = hovered ? 1.3 : 1;
		hotspot.userData.baseScale += (targetScale - hotspot.userData.baseScale) * 0.1;
		hotspot.scale.setScalar(hotspot.userData.baseScale);
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
	if (activePanel) {
		activePanel.classList.remove('active');
		activePanel = null;
	}

	hotspotOverlay.classList.remove('active');
}

// Export for use in controls.js
export function getActivePanel() {
	return activePanel;
}

export function getHotspotOverlay() {
	return hotspotOverlay;
}

