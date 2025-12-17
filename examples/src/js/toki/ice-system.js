// Ice System - handles ice cube creation, materials, spawning, animation, and collisions

import * as THREE from '../../../../build/three.module.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { iceConfig, LIQUID_BASE_Y, LIQUID_SURFACE_Y, LIQUID_RADIUS } from './constants.js';

// Ice system state
let iceObjects = [];
let iceCubeGLBModel = null;
let iceCubeMaterial = null;

// Create ice material
function createIceMaterial() {
	const material = new THREE.MeshPhysicalMaterial({
		color: 0xd8e4f0,
		metalness: 0.0,
		roughness: 0.1,
		transmission: 0.7,
		opacity: 0.85,
		transparent: true,
		thickness: 0.3,
		ior: 1.31,
		clearcoat: 0.8,
		clearcoatRoughness: 0.2,
		envMapIntensity: 1.2,
		side: THREE.FrontSide,
		depthWrite: true,
		emissive: 0x000000,
		emissiveIntensity: 0,
	});
	
	if (!iceCubeMaterial) {
		iceCubeMaterial = material;
	}
	
	return material;
}

// Create procedural ice mesh
function createIceMesh(size) {
	const geometry = new THREE.BoxGeometry(size * 1.8, size * 2.2, size * 1.8);
	const material = createIceMaterial();
	const mesh = new THREE.Mesh(geometry, material);
	mesh.renderOrder = 3;
	mesh.userData.baseSize = size;
	mesh.userData.isProcedural = true;

	// Add inner frosted core for realism
	const innerGeometry = new THREE.BoxGeometry(size * 1.4, size * 1.8, size * 1.4);
	const innerMaterial = new THREE.MeshPhysicalMaterial({
		color: 0xffffff,
		metalness: 0.0,
		roughness: 0.9,
		transmission: 0.4,
		opacity: 0.5,
		transparent: true,
		thickness: 0.2,
		ior: 1.31,
		side: THREE.FrontSide,
		depthWrite: true,
	});
	const innerMesh = new THREE.Mesh(innerGeometry, innerMaterial);
	innerMesh.renderOrder = 2;
	mesh.add(innerMesh);

	return mesh;
}

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
					roughness: child.material.roughness !== undefined ? child.material.roughness : 0.1,
					transmission: 0.7,
					opacity: 0.85,
					transparent: true,
					thickness: 0.3,
					ior: 1.31,
					clearcoat: 0.8,
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
				child.material.depthWrite = true;
			}
			
			if (!iceCubeMaterial) {
				iceCubeMaterial = child.material;
			}
		}
	}
}

// Spawn an ice cube
export function spawnIce(scene, gui, createIceCubeGUI) {
	if (iceObjects.length >= iceConfig.maxQuantity) return;

	const size = getCurrentIceSize();
	const iceIndex = iceObjects.length;
	const position = findNonOverlappingPosition(size, iceIndex);
	const isFirstIce = iceIndex === 0;
	
	let mesh;
	if (iceCubeGLBModel) {
		mesh = iceCubeGLBModel.clone();
		
		const box = new THREE.Box3().setFromObject(mesh);
		const glbSize = box.getSize(new THREE.Vector3());
		const targetWidth = size * 1.8;
		const targetHeight = size * 2.2;
		const scaleX = targetWidth / Math.max(glbSize.x, 0.001);
		const scaleY = targetHeight / Math.max(glbSize.y, 0.001);
		const scaleZ = targetWidth / Math.max(glbSize.z, 0.001);
		const avgScale = (scaleX + scaleY + scaleZ) / 3;
		mesh.scale.set(avgScale, avgScale, avgScale);
		
		mesh.traverse((child) => applyIceMaterialToMesh(child, size));
		
		mesh.renderOrder = 3;
		mesh.userData.baseSize = size;
		mesh.userData.isProcedural = false;
	} else {
		mesh = createIceMesh(size);
	}

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
	};

	mesh.position.set(iceData.baseX, iceData.baseY, iceData.baseZ);
	mesh.rotation.set(
		Math.random() * 0.3,
		Math.random() * Math.PI * 2,
		Math.random() * 0.3
	);

	scene.add(mesh);
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

		const topTargetY = LIQUID_SURFACE_Y - iceHeight * 0.35;
		topIce.baseY += (topTargetY - topIce.baseY) * 0.1;

		const bottomTargetY = topIce.baseY - iceHeight - 0.02;
		const clampedBottomY = Math.max(bottomTargetY, minY);
		bottomIce.baseY += (clampedBottomY - bottomIce.baseY) * 0.1;

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

		const maxY = ice.isFloater 
			? LIQUID_SURFACE_Y - iceHeight * 0.25 
			: LIQUID_SURFACE_Y - iceHeight * 0.6;
		
		if (ice.baseY > maxY) ice.baseY = maxY;
		if (ice.baseY < minY) ice.baseY = minY;
	}
}

export function updateIceAnimation(time) {
	const size = getCurrentIceSize();
	const boundsRadius = LIQUID_RADIUS - size * 1.0;

	resolveIceCollisions();

	for (const ice of iceObjects) {
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
			
			if (iceObjects.length > 0) {
				const size = getCurrentIceSize();
				
				iceObjects.forEach((ice) => {
					if (ice.mesh.userData.isProcedural) {
						const oldPosition = ice.mesh.position.clone();
						const oldRotation = ice.mesh.rotation.clone();
						
						scene.remove(ice.mesh);
						ice.mesh.geometry.dispose();
						ice.mesh.material.dispose();
						
						const mesh = iceCubeGLBModel.clone();
						
						const box = new THREE.Box3().setFromObject(mesh);
						const glbSize = box.getSize(new THREE.Vector3());
						const targetWidth = size * 1.8;
						const targetHeight = size * 2.2;
						const scaleX = targetWidth / Math.max(glbSize.x, 0.001);
						const scaleY = targetHeight / Math.max(glbSize.y, 0.001);
						const scaleZ = targetWidth / Math.max(glbSize.z, 0.001);
						const avgScale = (scaleX + scaleY + scaleZ) / 3;
						mesh.scale.set(avgScale, avgScale, avgScale);
						
						mesh.traverse((child) => applyIceMaterialToMesh(child, size));
						
						mesh.renderOrder = 3;
						mesh.userData.baseSize = size;
						mesh.userData.isProcedural = false;
						
						mesh.position.copy(oldPosition);
						mesh.rotation.copy(oldRotation);
						
						scene.add(mesh);
						ice.mesh = mesh;
					}
				});
				
				if (gui && iceObjects.length > 0) {
					const existingFolder = gui.children.find(child => child._title === 'Ice Cube Material');
					if (!existingFolder) {
						createIceCubeGUI(gui);
					}
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

// Get ice cube material for GUI
export function getIceCubeMaterial() {
	return iceCubeMaterial;
}

// Set ice cube material (for GUI updates)
export function setIceCubeMaterial(material) {
	iceCubeMaterial = material;
}

