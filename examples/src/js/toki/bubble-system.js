// Bubble System - handles bubble creation, spawning, and animation

import * as THREE from '../../../../build/three.module.js';
import { MAX_BUBBLES, LIQUID_BASE_Y, LIQUID_SURFACE_Y, LIQUID_RADIUS, LIQUID_HEIGHT } from './constants.js';

// Bubble system state
let bubbleGeometry, bubbleMaterial;
let bubbleInstances = [];
let bubbleMesh;

// Dynamic surface height for bubbles (starts at default LIQUID_SURFACE_Y)
let currentBubbleSurfaceY = LIQUID_SURFACE_Y;

// Animation state for bubble surface height
let bubbleHeightAnimation = {
	isAnimating: false,
	startSurfaceY: LIQUID_SURFACE_Y,
	targetSurfaceY: LIQUID_SURFACE_Y,
	startTime: 0,
	duration: 1.0, // 1 second animation
};

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
	const bubble = bubbleInstances.find(b => !b.active);
	if (!bubble) return;

	const angle = Math.random() * Math.PI * 2;
	const radius = Math.random() * (LIQUID_RADIUS - 0.1);

	bubble.position.set(
		Math.cos(angle) * radius,
		LIQUID_BASE_Y + 0.05,
		Math.sin(angle) * radius
	);

	bubble.velocity.set(
		(Math.random() - 0.5) * 0.02,
		0.3 + Math.random() * 0.4,
		(Math.random() - 0.5) * 0.02
	);

	bubble.size = 0.5 + Math.random() * 1.0;
	bubble.life = 0;
	bubble.maxLife = 2 + Math.random() * 3;
	bubble.active = true;
}

// Update bubbles
export function updateBubbles(deltaTime, fizzIntensity = 3.0) {
	if (!bubbleMesh) return;

	// Update bubble surface height animation if active
	if (bubbleHeightAnimation.isAnimating) {
		const elapsed = (Date.now() - bubbleHeightAnimation.startTime) / 1000;
		const progress = Math.min(elapsed / bubbleHeightAnimation.duration, 1.0);
		
		// Easing function (ease-out cubic)
		const eased = 1 - Math.pow(1 - progress, 3);
		
		// Interpolate surface Y
		currentBubbleSurfaceY = bubbleHeightAnimation.startSurfaceY + 
			(bubbleHeightAnimation.targetSurfaceY - bubbleHeightAnimation.startSurfaceY) * eased;
		
		if (progress >= 1.0) {
			bubbleHeightAnimation.isAnimating = false;
		}
	}

	// Spawn bubbles based on fizz intensity
	const spawnRate = fizzIntensity * 30;
	const spawnChance = spawnRate * deltaTime;

	if (Math.random() < spawnChance) {
		spawnBubble();
	}

	const matrix = new THREE.Matrix4();
	const position = new THREE.Vector3();
	const quaternion = new THREE.Quaternion();
	const scale = new THREE.Vector3();

	for (let i = 0; i < bubbleInstances.length; i++) {
		const bubble = bubbleInstances[i];

		if (!bubble.active) {
			scale.set(0, 0, 0);
			matrix.compose(bubble.position, quaternion, scale);
			bubbleMesh.setMatrixAt(i, matrix);
			continue;
		}

		bubble.life += deltaTime;

		// Use dynamic surface Y instead of static LIQUID_SURFACE_Y
		if (bubble.life > bubble.maxLife || bubble.position.y > currentBubbleSurfaceY) {
			bubble.active = false;
			scale.set(0, 0, 0);
			matrix.compose(bubble.position, quaternion, scale);
			bubbleMesh.setMatrixAt(i, matrix);
			continue;
		}

		// Add slight wobble
		bubble.velocity.x += (Math.random() - 0.5) * 0.05;
		bubble.velocity.z += (Math.random() - 0.5) * 0.05;

		bubble.position.x += bubble.velocity.x * deltaTime;
		bubble.position.y += bubble.velocity.y * deltaTime;
		bubble.position.z += bubble.velocity.z * deltaTime;

		const dist = Math.sqrt(
			bubble.position.x * bubble.position.x +
			bubble.position.z * bubble.position.z
		);

		if (dist > LIQUID_RADIUS - 0.05) {
			bubble.position.x *= (LIQUID_RADIUS - 0.05) / dist;
			bubble.position.z *= (LIQUID_RADIUS - 0.05) / dist;
		}

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

// Animate bubble surface height to match the liquid level
export function animateBubbleSurfaceHeight(targetScale) {
	// Calculate the target surface Y based on the liquid scale
	// Height reduction = LIQUID_HEIGHT * (1.0 - targetScale)
	const heightReduction = LIQUID_HEIGHT * (1.0 - targetScale);
	const targetSurfaceY = LIQUID_SURFACE_Y - heightReduction;
	
	// Start animation from current position
	bubbleHeightAnimation.startSurfaceY = currentBubbleSurfaceY;
	bubbleHeightAnimation.targetSurfaceY = targetSurfaceY;
	bubbleHeightAnimation.startTime = Date.now();
	bubbleHeightAnimation.isAnimating = true;
	
	console.log('Bubble surface animation - Current Y:', currentBubbleSurfaceY.toFixed(3), 'Target Y:', targetSurfaceY.toFixed(3));
}

