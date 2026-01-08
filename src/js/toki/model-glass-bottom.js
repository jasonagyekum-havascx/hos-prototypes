// Glass Bottom Model - handles glass bottom GLB model loading

import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Glass bottom model state
let glassBottomModel = null;
let glassBottomModelMaterial = null;

// Load glass bottom model
export function loadGlassBottomModel(scene, onMaterialReady) {
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath('lib/jsm/libs/draco/gltf/');

	const gltfLoader = new GLTFLoader();
	gltfLoader.setDRACOLoader(dracoLoader);

	gltfLoader.load(
		'models/glb/glass-bottom-01.glb',
		(gltf) => {
			glassBottomModel = gltf.scene;

			// Use 1:1 scale - no auto-scaling or centering
			// Model position and scale from Blender will be used directly
			glassBottomModel.scale.set(1, 1, 1);

			// Apply realistic glass material using transmission (not just opacity)
			glassBottomModel.traverse((child) => {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
					
					// Use MeshPhysicalMaterial for realistic glass with refraction
					// Different material values for glass bottom
					glassBottomModelMaterial = new THREE.MeshPhysicalMaterial({
						color: 0xffffff,
						metalness: 0,          // Lower metalness for glass bottom
						roughness: 0.65,          // Slightly rougher surface
						transmission: 0.85,      // Lower transmission for glass bottom
						opacity: 1,              // Keep at 1 when using transmission
						transparent: true,
						thickness: 1.1,          // Slight thickness for glass bottom
						clearcoat: 0.9,          // Slightly less clearcoat
						clearcoatRoughness: 0.1, // Slightly rougher clear coat
						ior: 1.45,               // Slightly different IOR
						envMapIntensity: 1.1,    // Lower environment reflections
						side: THREE.DoubleSide,   // Render front side only
						depthWrite: false,       // Important for transparency sorting
					});
					
					child.material = glassBottomModelMaterial;
				}
			});

			// Position in the scene - centered at origin
			const container = new THREE.Group();
			container.add(glassBottomModel);
			container.position.set(0, 0, 0); // Centered at world origin
			container.renderOrder = 5;

			scene.add(container);

			// console.log('Glass bottom model loaded successfully at 1:1 scale');

			// Call callback if provided
			if (onMaterialReady) {
				onMaterialReady(glassBottomModelMaterial);
			}
		},
		(progress) => {
			// console.log('Loading glass bottom:', (progress.loaded / progress.total * 100) + '%');
		},
		(error) => {
			console.error('Error loading glass bottom model:', error);
		}
	);
}

// Get glass bottom model for external access
export function getGlassBottomModel() {
	return glassBottomModel;
}

// Get glass bottom model material for external access
export function getGlassBottomModelMaterial() {
	return glassBottomModelMaterial;
}

