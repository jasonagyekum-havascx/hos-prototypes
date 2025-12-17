// Floor Model - handles floor GLB model loading

import * as THREE from '../../../../build/three.module.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Floor model state
let floorModel = null;

// Load floor-01.glb model
export function loadFloorModel(scene) {
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath('jsm/libs/draco/gltf/');

	const gltfLoader = new GLTFLoader();
	gltfLoader.setDRACOLoader(dracoLoader);

	gltfLoader.load(
		'models/glb/floor-01.glb',
		(gltf) => {
			floorModel = gltf.scene;

			// Use 1:1 scale - no auto-scaling or centering
			// Model position and scale from Blender will be used directly
			floorModel.scale.set(1, 1, 1);

			// Ensure all meshes in the model have proper settings
			floorModel.traverse((child) => {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});

			// Position in the scene - centered at origin
			const container = new THREE.Group();
			container.add(floorModel);
			container.position.set(0, 0, 0); // Centered at world origin
			container.renderOrder = 0; // Render before other objects

			scene.add(container);

			// console.log('Floor model loaded successfully at 1:1 scale');
		},
		(progress) => {
			// console.log('Loading floor:', (progress.loaded / progress.total * 100) + '%');
		},
		(error) => {
			console.error('Error loading floor model:', error);
		}
	);
}

// Get floor model for external access
export function getFloorModel() {
	return floorModel;
}

