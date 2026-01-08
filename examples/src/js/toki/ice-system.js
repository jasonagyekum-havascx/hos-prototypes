// Ice System - handles ice cube creation, materials, spawning, animation, and collisions

import * as THREE from '../../../../build/three.module.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { iceConfig, LIQUID_BASE_Y, LIQUID_SURFACE_Y, LIQUID_RADIUS } from './constants.js';

// Ice system state
let iceObjects = [];
let iceCubeGLBModel = null;
let iceCubeMaterial = null;


function getCurrentIceSize() {
	return iceConfig.baseSize * iceConfig.sizeMultiplier;
}

function getIceHeight(ice) {
	const size = getCurrentIceSize();
	const scale = ice.mesh.scale.x;
	return size * 2.2 * scale * 0.5;
}

function findNonOverlappingPosition(size, iceIndex) {
	const iceHeight = size * 2.2;
	
	if (iceIndex === 0) {
		return { 
			x: 0, 
			z: 0, 
			y: LIQUID_SURFACE_Y - iceHeight * 0.35
		};
	} else {
		const topIce = iceObjects[0];
		const stackY = topIce.baseY - iceHeight - 0.02;
		
		return { 
			x: topIce.baseX + (Math.random() - 0.5) * 0.05,
			z: topIce.baseZ + (Math.random() - 0.5) * 0.05, 
			y: Math.max(stackY, LIQUID_BASE_Y + iceHeight * 0.5 + 0.1)
		};
	}
}

// Apply ice material properties to GLB mesh
function applyIceMaterialToMesh(child, size) {
	if (child.isMesh) {
		child.castShadow = true;
		child.receiveShadow = true;
		child.renderOrder = 3;
		
		if (child.material) {
			if (!(child.material instanceof THREE.MeshPhysicalMaterial)) {
				const iceMat = new THREE.MeshPhysicalMaterial({
					color: child.material.color || 0xd8e4f0,
					metalness: child.material.metalness !== undefined ? child.material.metalness : 0.0,
					roughness: 0,
					transmission: 0.78,
					opacity: 0.76,
					transparent: true,
					thickness: 0.3,
					ior: 1.31,
					clearcoat: 1,
					clearcoatRoughness: 0.2,
					envMapIntensity: child.material.envMapIntensity || 1.2,
					side: child.material.side || THREE.FrontSide,
					depthWrite: true,
				});
				child.material = iceMat;
			} else {
				if (child.material.transmission === undefined) child.material.transmission = 0.7;
				if (child.material.ior === undefined) child.material.ior = 1.31;
				if (child.material.thickness === undefined) child.material.thickness = 0.3;
				if (child.material.clearcoat === undefined) child.material.clearcoat = 0.8;
				if (child.material.clearcoatRoughness === undefined) child.material.clearcoatRoughness = 0.2;
				if (child.material.opacity === undefined || child.material.opacity === 1) child.material.opacity = 0.85;
				child.material.roughness = 0; // Set roughness to 0
				child.material.depthWrite = true;
			}
			
			if (!iceCubeMaterial) {
				iceCubeMaterial = child.material;
			}
		}
	}
}

// Spawn an ice cube (only uses GLB model)
// Store parent group for ice cubes (for AR grouping)
let iceParentGroup = null;

export function setIceParentGroup(parentGroup) {
	iceParentGroup = parentGroup;
}

export function spawnIce(scene, gui, createIceCubeGUI) {
	if (iceObjects.length >= iceConfig.maxQuantity) return;
	
	if (!iceCubeGLBModel) {
		console.warn('Ice cube GLB model not loaded yet. Cannot spawn ice cube.');
		return;
	}

	const iceIndex = iceObjects.length;
	const isFirstIce = iceIndex === 0;
	
	// Clone the GLB model for this ice cube
	const mesh = iceCubeGLBModel.clone();
	
	// Use the scale from Blender directly - don't override it
	// The model's scale from Blender will be preserved
	
	// Get actual size from the model's bounding box (respects Blender scale)
	const box = new THREE.Box3().setFromObject(mesh);
	const actualSize = box.getSize(new THREE.Vector3());
	const size = Math.max(actualSize.x, actualSize.y, actualSize.z) * 0.5; // Use largest dimension as size reference
	
	const position = findNonOverlappingPosition(size, iceIndex);
	
	// Apply ice material properties to all meshes in the GLB
	mesh.traverse((child) => applyIceMaterialToMesh(child, size));
	
	mesh.renderOrder = 3;
	mesh.userData.baseSize = size;

	const iceData = {
		mesh,
		baseX: position.x,
		baseY: position.y,
		baseZ: position.z,
		targetY: position.y,
		isFloater: isFirstIce,
		velocityY: 0,
		phaseX: Math.random() * Math.PI * 2,
		phaseZ: Math.random() * Math.PI * 2,
		phaseY: Math.random() * Math.PI * 2,
		rotationSpeed: (Math.random() - 0.5) * 0.3,
		bobSpeed: 0.8 + Math.random() * 0.4,
		bobAmount: isFirstIce ? 0.02 : 0.01,
		driftAmount: 0.01 + Math.random() * 0.01,
		hasBeenAnimatedDown: false, // Flag to track if ice has been manually animated down
		animationStopped: false, // Flag to stop all continuous animations
	};

	mesh.position.set(iceData.baseX, iceData.baseY, iceData.baseZ);
	mesh.rotation.set(
		Math.random() * 0.3,
		Math.random() * Math.PI * 2,
		Math.random() * 0.3
	);

	// Add to parent group if set (for AR), otherwise add to scene
	const parent = iceParentGroup || scene;
	parent.add(mesh);
	iceObjects.push(iceData);
}

export function removeIce(scene) {
	if (iceObjects.length === 0) return;

	const ice = iceObjects.pop();
	scene.remove(ice.mesh);
	ice.mesh.geometry.dispose();
	ice.mesh.material.dispose();
}

function resolveIceCollisions() {
	const size = getCurrentIceSize();
	const iceHeight = size * 2.2;
	const minY = LIQUID_BASE_Y + iceHeight * 0.5 + 0.05;
	const boundsRadius = LIQUID_RADIUS - size * 0.8;

	if (iceObjects.length === 2) {
		const topIce = iceObjects[0];
		const bottomIce = iceObjects[1];

		// Only adjust positions if ice hasn't been manually animated down
		if (!topIce.hasBeenAnimatedDown) {
			const topTargetY = LIQUID_SURFACE_Y - iceHeight * 0.35;
			topIce.baseY += (topTargetY - topIce.baseY) * 0.1;
		}

		if (!bottomIce.hasBeenAnimatedDown) {
			const bottomTargetY = topIce.baseY - iceHeight - 0.02;
			const clampedBottomY = Math.max(bottomTargetY, minY);
			bottomIce.baseY += (clampedBottomY - bottomIce.baseY) * 0.1;
		}

		bottomIce.baseX += (topIce.baseX - bottomIce.baseX) * 0.05;
		bottomIce.baseZ += (topIce.baseZ - bottomIce.baseZ) * 0.05;
	}

	for (const ice of iceObjects) {
		const currentDist = Math.sqrt(ice.baseX * ice.baseX + ice.baseZ * ice.baseZ);
		if (currentDist > boundsRadius) {
			const scale = boundsRadius / currentDist;
			ice.baseX *= scale;
			ice.baseZ *= scale;
		}

		// Only clamp Y position if ice hasn't been manually animated down
		if (!ice.hasBeenAnimatedDown) {
			const maxY = ice.isFloater 
				? LIQUID_SURFACE_Y - iceHeight * 0.25 
				: LIQUID_SURFACE_Y - iceHeight * 0.6;
			
			if (ice.baseY > maxY) ice.baseY = maxY;
		}
		
		// Always enforce minimum Y to prevent going below liquid base
		if (ice.baseY < minY) ice.baseY = minY;
	}
}

export function updateIceAnimation(time) {
	const size = getCurrentIceSize();
	const boundsRadius = LIQUID_RADIUS - size * 1.0;

	resolveIceCollisions();

	for (const ice of iceObjects) {
		// Skip all animations if animation has been stopped
		if (ice.animationStopped) {
			ice.mesh.position.x = ice.baseX;
			ice.mesh.position.y = ice.baseY;
			ice.mesh.position.z = ice.baseZ;
			// Keep rotation as is (don't update it)
			continue;
		}

		const bobY = Math.sin(time * ice.bobSpeed + ice.phaseY) * ice.bobAmount;
		const driftX = Math.sin(time * 0.3 + ice.phaseX) * ice.driftAmount;
		const driftZ = Math.cos(time * 0.25 + ice.phaseZ) * ice.driftAmount;

		let newX = ice.baseX + driftX;
		let newZ = ice.baseZ + driftZ;

		const dist = Math.sqrt(newX * newX + newZ * newZ);
		if (dist > boundsRadius) {
			const boundsScale = boundsRadius / dist;
			newX *= boundsScale;
			newZ *= boundsScale;
		}

		ice.mesh.position.x = newX;
		ice.mesh.position.y = ice.baseY + bobY;
		ice.mesh.position.z = newZ;

		ice.mesh.rotation.y += ice.rotationSpeed * 0.016;
		ice.mesh.rotation.x = Math.sin(time * 0.5 + ice.phaseX) * 0.06;
		ice.mesh.rotation.z = Math.cos(time * 0.4 + ice.phaseZ) * 0.06;
	}
}

// Load ice cube GLB model
export function loadIceCubeGLB(scene, gui, createIceCubeGUI) {
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath('jsm/libs/draco/gltf/');

	const gltfLoader = new GLTFLoader();
	gltfLoader.setDRACOLoader(dracoLoader);

		gltfLoader.load(
			'models/glb/ice-cube.glb',
			(gltf) => {
				iceCubeGLBModel = gltf.scene;
				
				iceCubeGLBModel.traverse((child) => {
					if (child.isMesh && child.material && !iceCubeMaterial) {
						iceCubeMaterial = child.material;
					}
				});
				
				// Spawn initial ice cubes now that the model is loaded
				for (let i = 0; i < iceConfig.quantity; i++) {
					spawnIce(scene, gui, createIceCubeGUI);
				}
				
				// Create ice cube GUI after ice cubes are spawned
				if (gui && iceObjects.length > 0 && createIceCubeGUI) {
					const existingFolder = gui.children.find(child => child._title === 'Ice Cube Material');
					if (!existingFolder) {
						createIceCubeGUI(gui);
					}
				}
			},
		undefined,
		(error) => {
			console.error('Error loading ice cube model:', error);
		}
	);
}

// Get ice objects for external access
export function getIceObjects() {
	return iceObjects;
}

// Animate ice cubes down by a certain amount
export function animateIceDown(amount, duration = 1.0) {
	if (iceObjects.length === 0) return;
	
	// Store animation state
	let startTime = Date.now();
	let isAnimating = true;
	
	// Store starting positions
	const startPositions = iceObjects.map(ice => ice.baseY);
	const targetPositions = startPositions.map(y => y - amount);
	
	// Animation function
	function animate() {
		if (!isAnimating) return;
		
		const elapsed = (Date.now() - startTime) / 1000;
		const progress = Math.min(elapsed / duration, 1.0);
		
		// Easing function (ease-out cubic)
		const eased = 1 - Math.pow(1 - progress, 3);
		
		// Update each ice cube's baseY
		for (let i = 0; i < iceObjects.length; i++) {
			const ice = iceObjects[i];
			ice.baseY = startPositions[i] + (targetPositions[i] - startPositions[i]) * eased;
		}
		
		if (progress >= 1.0) {
			isAnimating = false;
			// Mark all ice cubes as having been animated down so collision resolution doesn't pull them back up
			for (const ice of iceObjects) {
				ice.hasBeenAnimatedDown = true;
			}
			
			// Stop continuous animation on all ice cubes after first animation completes
			for (const ice of iceObjects) {
				ice.bobAmount = 0; // Stop bobbing
				ice.driftAmount = 0; // Stop drifting
				ice.rotationSpeed = 0; // Stop rotation
				ice.animationStopped = true; // Stop all continuous animations
			}
		} else {
			requestAnimationFrame(animate);
		}
	}
	
	animate();
}

// Stop animation on a specific ice cube by index
export function stopIceAnimation(iceIndex) {
	if (iceIndex >= 0 && iceIndex < iceObjects.length) {
		const ice = iceObjects[iceIndex];
		ice.bobAmount = 0;
		ice.driftAmount = 0;
		ice.rotationSpeed = 0;
		ice.animationStopped = true;
	}
}

// Get ice cube material for GUI
export function getIceCubeMaterial() {
	return iceCubeMaterial;
}

// Set ice cube material (for GUI updates)
export function setIceCubeMaterial(material) {
	iceCubeMaterial = material;
}

