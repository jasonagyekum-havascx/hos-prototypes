// Bubble System - handles bubble creation, spawning, and animation

import * as THREE from '../../../../build/three.module.js';
import { MAX_BUBBLES, LIQUID_BASE_Y, LIQUID_SURFACE_Y, LIQUID_RADIUS } from './constants.js';

// Bubble system state
let bubbleGeometry, bubbleMaterial;
let bubbleInstances = [];
let bubbleMesh;

// Initialize bubble system
export function initBubbleSystem(scene) {
	bubbleGeometry = new THREE.SphereGeometry(0.012, 8, 8);
	bubbleMaterial = new THREE.MeshStandardMaterial({
		color: 0xffffff,
		metalness: 0.0,
		roughness: 0.2,
		transparent: true,
		opacity: 0.6,
		emissive: 0xffeedd,
		emissiveIntensity: 0.1,
	});

	bubbleMesh = new THREE.InstancedMesh(bubbleGeometry, bubbleMaterial, MAX_BUBBLES);
	bubbleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
	bubbleMesh.renderOrder = 4;
	scene.add(bubbleMesh);

	for (let i = 0; i < MAX_BUBBLES; i++) {
		bubbleInstances.push({
			active: false,
			position: new THREE.Vector3(),
			velocity: new THREE.Vector3(),
			size: 1,
			life: 0,
			maxLife: 0,
		});
	}

	const matrix = new THREE.Matrix4();
	matrix.makeScale(0, 0, 0);
	for (let i = 0; i < MAX_BUBBLES; i++) {
		bubbleMesh.setMatrixAt(i, matrix);
	}
	bubbleMesh.instanceMatrix.needsUpdate = true;
}

// Spawn a bubble
export function spawnBubble() {
	for (let i = 0; i < MAX_BUBBLES; i++) {
		if (!bubbleInstances[i].active) {
			const bubble = bubbleInstances[i];
			
			// Random position at bottom of liquid
			const angle = Math.random() * Math.PI * 2;
			const radius = Math.random() * LIQUID_RADIUS * 0.7;
			bubble.position.set(
				Math.cos(angle) * radius,
				LIQUID_BASE_Y + 0.1,
				Math.sin(angle) * radius
			);
			
			// Random upward velocity with slight horizontal drift
			bubble.velocity.set(
				(Math.random() - 0.5) * 0.02,
				0.08 + Math.random() * 0.04,
				(Math.random() - 0.5) * 0.02
			);
			
			bubble.size = 0.8 + Math.random() * 0.4;
			bubble.life = 0;
			bubble.maxLife = 2 + Math.random() * 1;
			bubble.active = true;
			return;
		}
	}
}

// Update bubbles
export function updateBubbles(deltaTime) {
	if (!bubbleMesh) return;

	const matrix = new THREE.Matrix4();
	const quaternion = new THREE.Quaternion();
	const scale = new THREE.Vector3();

	for (let i = 0; i < MAX_BUBBLES; i++) {
		const bubble = bubbleInstances[i];

		if (!bubble.active) {
			scale.set(0, 0, 0);
			matrix.compose(bubble.position, quaternion, scale);
			bubbleMesh.setMatrixAt(i, matrix);
			continue;
		}

		// Update position
		bubble.position.add(bubble.velocity.clone().multiplyScalar(deltaTime));
		bubble.life += deltaTime;

		// Deactivate if reached surface or max life
		if (bubble.position.y > LIQUID_SURFACE_Y || bubble.life > bubble.maxLife) {
			bubble.active = false;
			scale.set(0, 0, 0);
			matrix.compose(bubble.position, quaternion, scale);
			bubbleMesh.setMatrixAt(i, matrix);
			continue;
		}

		// Size animation (grow as it rises)
		const lifeRatio = bubble.life / bubble.maxLife;
		let sizeMultiplier = 1;
		
		if (lifeRatio < 0.1) {
			sizeMultiplier = lifeRatio / 0.1;
		} else if (lifeRatio > 0.9) {
			sizeMultiplier = (1 - lifeRatio) / 0.1;
		}

		const finalSize = bubble.size * sizeMultiplier;
		scale.set(finalSize, finalSize, finalSize);
		matrix.compose(bubble.position, quaternion, scale);
		bubbleMesh.setMatrixAt(i, matrix);
	}

	bubbleMesh.instanceMatrix.needsUpdate = true;
}

