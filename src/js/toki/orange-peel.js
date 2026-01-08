// Orange Peel System - handles orange peel creation, positioning, and animation

import * as THREE from 'three';
import { LIQUID_SURFACE_Y } from './constants.js';

// Orange peel state
let orangeSlice = null;
let orangeSliceVisible = true;  // Visible by default

// Orange peel position and rotation config (exposed for GUI)
export const orangePeelConfig = {
	positionX: 0.45,
	positionZ: 0.3,
	rotationY: -Math.PI * 0.3,
	rotationZ: Math.PI * 0.12,
};

// Get the base Y position
const getBaseY = () => LIQUID_SURFACE_Y - 0.5;

// Create orange peel geometry
const createOrangePeel = () => {
	const group = new THREE.Group();

	// Peel dimensions - shorter strip (half length)
	const peelLength = 1.2;
	const peelWidth = 0.18;
	const peelThickness = 0.035;
	const curveSegments = 16;

	// Create a curved path for the peel - gentle S-curve
	const curve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(0, 0, 0),
		new THREE.Vector3(0.06, peelLength * 0.3, 0.03),
		new THREE.Vector3(-0.04, peelLength * 0.6, 0.05),
		new THREE.Vector3(0.02, peelLength, 0),
	]);

	// Create custom peel geometry by extruding along curve
	const peelShape = new THREE.Shape();
	peelShape.moveTo(-peelWidth / 2, 0);
	peelShape.lineTo(peelWidth / 2, 0);
	peelShape.lineTo(peelWidth / 2, peelThickness);
	peelShape.lineTo(-peelWidth / 2, peelThickness);
	peelShape.lineTo(-peelWidth / 2, 0);

	const extrudeSettings = {
		steps: curveSegments,
		bevelEnabled: false,
		extrudePath: curve,
	};

	const peelGeometry = new THREE.ExtrudeGeometry(peelShape, extrudeSettings);

	// Orange rind (outer surface) - vibrant orange
	const rindMaterial = new THREE.MeshStandardMaterial({
		color: 0xf57c00,
		metalness: 0.05,
		roughness: 0.55,
		side: THREE.FrontSide,
	});

	const peel = new THREE.Mesh(peelGeometry, rindMaterial);
	group.add(peel);

	// Inner pith layer (whitish-orange)
	const pithGeometry = peelGeometry.clone();
	const pithMaterial = new THREE.MeshStandardMaterial({
		color: 0xffe4b5,
		metalness: 0.0,
		roughness: 0.85,
		side: THREE.BackSide,
	});

	const pith = new THREE.Mesh(pithGeometry, pithMaterial);
	group.add(pith);

	// Add subtle texture detail with slight bumps along the peel
	const detailCount = 6;
	const detailMaterial = new THREE.MeshStandardMaterial({
		color: 0xd46a00,
		metalness: 0.0,
		roughness: 0.7,
	});

	for (let i = 0; i < detailCount; i++) {
		const t = (i + 0.5) / detailCount;
		const point = curve.getPoint(t);

		// Small bumps for orange peel texture
		const bumpGeo = new THREE.SphereGeometry(0.012, 6, 6);
		const bump = new THREE.Mesh(bumpGeo, detailMaterial);

		// Offset slightly from center
		const offsetX = (Math.random() - 0.5) * peelWidth * 0.5;
		const offsetZ = peelThickness * 0.5;

		bump.position.set(
			point.x + offsetX,
			point.y,
			point.z + offsetZ
		);

		group.add(bump);
	}

	return group;
};

// Spawn orange peel into scene
export const spawnOrangePeel = (scene) => {
	orangeSlice = createOrangePeel();
	
	// Set initial position and rotation from config
	orangeSlice.position.set(orangePeelConfig.positionX, getBaseY(), orangePeelConfig.positionZ);
	orangeSlice.rotation.x = 0;
	orangeSlice.rotation.y = orangePeelConfig.rotationY;
	orangeSlice.rotation.z = orangePeelConfig.rotationZ;
	
	orangeSlice.renderOrder = 6;
	orangeSlice.visible = orangeSliceVisible;
	scene.add(orangeSlice);
};

// Update orange peel animation
export const updateOrangePeelAnimation = (time) => {
	if (!orangeSlice || !orangeSliceVisible) return;

	// Very subtle movement - peel is resting against inner glass wall
	const gentleSway = Math.sin(time * 0.4) * 0.005;
	const subtleBob = Math.sin(time * 0.6) * 0.008;

	// Use config positions with subtle animation
	orangeSlice.position.x = orangePeelConfig.positionX + gentleSway;
	orangeSlice.position.y = getBaseY() + subtleBob;
	orangeSlice.position.z = orangePeelConfig.positionZ + gentleSway * 0.3;

	// Use config rotation with subtle sway
	orangeSlice.rotation.z = orangePeelConfig.rotationZ + Math.sin(time * 0.3) * 0.015;
};

// Toggle orange peel visibility
export const toggleOrangePeel = (visible) => {
	orangeSliceVisible = visible;
	if (orangeSlice) {
		orangeSlice.visible = visible;
	}
};

// Set orange peel position X
export const setOrangePeelPositionX = (x) => {
	orangePeelConfig.positionX = x;
	if (orangeSlice) {
		orangeSlice.position.x = x;
	}
};

// Set orange peel position Z
export const setOrangePeelPositionZ = (z) => {
	orangePeelConfig.positionZ = z;
	if (orangeSlice) {
		orangeSlice.position.z = z;
	}
};

// Set orange peel rotation Y
export const setOrangePeelRotationY = (y) => {
	orangePeelConfig.rotationY = y;
	if (orangeSlice) {
		orangeSlice.rotation.y = y;
	}
};

// Set orange peel rotation Z (lean)
export const setOrangePeelRotationZ = (z) => {
	orangePeelConfig.rotationZ = z;
	if (orangeSlice) {
		orangeSlice.rotation.z = z;
	}
};

// Get orange peel visibility state
export const isOrangePeelVisible = () => orangeSliceVisible;

// Get orange peel reference
export const getOrangePeel = () => orangeSlice;

