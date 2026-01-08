// Glass Model - handles glass GLB model loading

import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Glass model state
let cubeModel = null;
let glassModelMaterial = null;

// Load glass model
export function loadGlassModel(scene, onMaterialReady) {
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath('lib/jsm/libs/draco/gltf/');

	const gltfLoader = new GLTFLoader();
	gltfLoader.setDRACOLoader(dracoLoader);

	gltfLoader.load(
		'models/glb/glass-01.glb',
		(gltf) => {
			cubeModel = gltf.scene;

			// Use 1:1 scale - no auto-scaling or centering
			// Model position and scale from Blender will be used directly
			cubeModel.scale.set(1, 1, 1);

			// Apply realistic glass material using transmission (not just opacity)
			cubeModel.traverse((child) => {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
					
					// Use MeshPhysicalMaterial for realistic glass with refraction
					glassModelMaterial = new THREE.MeshPhysicalMaterial({
						color: 0xffffff,
						metalness: 0.2,          // Glass is not metallic
						roughness: 0,       // Very smooth surface
						transmission: 0.95,    // HIGH transmission = see-through with refraction (NOT opacity!)
						opacity: 1,            // Keep at 1 when using transmission
						transparent: true,
						thickness: 0,        // Glass thickness for refraction calculation
						clearcoat: 1.0,        // Glossy clear coat layer
						clearcoatRoughness: 0, // Perfectly smooth clear coat
						ior: 1.5,              // Index of refraction for glass
						envMapIntensity: 1.3,  // Environment reflections
						side: THREE.FrontSide, // Render front side only
						depthWrite: false,     // Important for transparency sorting
					});
					
					child.material = glassModelMaterial;
				}
			});

			// Position in the scene - centered at origin
			const container = new THREE.Group();
			container.add(cubeModel);
			container.position.set(0, 0, 0); // Centered at world origin
			container.renderOrder = 5;

			scene.add(container);

			// console.log('Cube model loaded successfully at 1:1 scale');

			// Call callback if provided
			if (onMaterialReady) {
				onMaterialReady(glassModelMaterial);
			}
		},
		(progress) => {
			// console.log('Loading cube:', (progress.loaded / progress.total * 100) + '%');
		},
		(error) => {
			console.error('Error loading cube model:', error);
		}
	);
}

// Get glass model for external access
export function getCubeModel() {
	return cubeModel;
}

// Get glass model material for external access
export function getGlassModelMaterial() {
	return glassModelMaterial;
}

