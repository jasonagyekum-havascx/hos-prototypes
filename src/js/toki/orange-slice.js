// Orange Slice System - handles orange slice creation and animation

import * as THREE from 'three';
import { LIQUID_SURFACE_Y } from './constants.js';

// Orange slice state
let orangeSlice;
let orangeSliceVisible = false;

// Create orange slice
function createOrangeSlice() {
	const group = new THREE.Group();

	const peelLength = 1.2;
	const peelWidth = 0.18;
	const peelThickness = 0.035;
	const curveSegments = 16;

	const curve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(0, 0, 0),
		new THREE.Vector3(0.06, peelLength * 0.3, 0.03),
		new THREE.Vector3(-0.04, peelLength * 0.6, 0.05),
		new THREE.Vector3(0.02, peelLength, 0),
	]);

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

	const rindMaterial = new THREE.MeshStandardMaterial({
		color: 0xf57c00,
		metalness: 0.05,
		roughness: 0.55,
		side: THREE.FrontSide,
	});

	const peel = new THREE.Mesh(peelGeometry, rindMaterial);
	group.add(peel);

	const pithGeometry = peelGeometry.clone();
	const pithMaterial = new THREE.MeshStandardMaterial({
		color: 0xffe4b5,
		metalness: 0.0,
		roughness: 0.85,
		side: THREE.BackSide,
	});

	const pith = new THREE.Mesh(pithGeometry, pithMaterial);
	group.add(pith);

	const detailCount = 6;
	const detailMaterial = new THREE.MeshStandardMaterial({
		color: 0xd46a00,
		metalness: 0.0,
		roughness: 0.7,
	});

	for (let i = 0; i < detailCount; i++) {
		const t = (i + 0.5) / detailCount;
		const point = curve.getPoint(t);

		const bumpGeo = new THREE.SphereGeometry(0.012, 6, 6);
		const bump = new THREE.Mesh(bumpGeo, detailMaterial);

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
}

// Spawn orange slice
export function spawnOrangeSlice(scene) {
	orangeSlice = createOrangeSlice();
	
	const peelX = 0.45;
	const peelZ = 0.3;
	const peelY = LIQUID_SURFACE_Y - 0.5;
	
	orangeSlice.position.set(peelX, peelY, peelZ);
	orangeSlice.rotation.x = 0;
	orangeSlice.rotation.y = -Math.PI * 0.3;
	orangeSlice.rotation.z = Math.PI * 0.12;
	
	orangeSlice.renderOrder = 6;
	orangeSlice.visible = orangeSliceVisible;
	scene.add(orangeSlice);
}

// Update orange slice animation
export function updateOrangeSliceAnimation(time) {
	if (!orangeSlice || !orangeSliceVisible) return;

	const gentleSway = Math.sin(time * 0.4) * 0.005;
	const subtleBob = Math.sin(time * 0.6) * 0.008;

	const peelX = 0.45;
	const peelZ = 0.3;
	const peelY = LIQUID_SURFACE_Y - 0.5;
	
	orangeSlice.position.x = peelX + gentleSway;
	orangeSlice.position.y = peelY + subtleBob;
	orangeSlice.position.z = peelZ + gentleSway * 0.3;

	orangeSlice.rotation.z = Math.PI * 0.12 + Math.sin(time * 0.3) * 0.015;
}

// Toggle orange slice visibility
export function toggleOrangeSlice(visible) {
	orangeSliceVisible = visible;

	if (orangeSlice) {
		orangeSlice.visible = visible;
	}
}

