// Models - handles GLB model loading (glass, floor)

import * as THREE from '../../../../build/three.module.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Model state
let cubeModel = null;
let floorModel = null;
let glassModelMaterial = null;

// Load glass model
export function loadCubeModel(scene, onMaterialReady) {
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath('jsm/libs/draco/gltf/');

	const gltfLoader = new GLTFLoader();
	gltfLoader.setDRACOLoader(dracoLoader);

	gltfLoader.load(
		'models/glb/glass-01.glb',
		(gltf) => {
			cubeModel = gltf.scene;
			cubeModel.scale.set(1, 1, 1);

			cubeModel.traverse((child) => {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
					
					if (child.material) {
						if (!(child.material instanceof THREE.MeshPhysicalMaterial)) {
							const glassMat = new THREE.MeshPhysicalMaterial({
								color: child.material.color || 0xffffff,
								metalness: child.material.metalness !== undefined ? child.material.metalness : 0.0,
								roughness: child.material.roughness !== undefined ? child.material.roughness : 0.1,
								transmission: 1.0,
								opacity: 0.1,
								transparent: true,
								thickness: 0.5,
								ior: 1.5,
								clearcoat: 1.0,
								clearcoatRoughness: 0.0,
								envMapIntensity: 1.3,
								side: THREE.FrontSide,
								depthWrite: true,
							});
							child.material = glassMat;
						} else {
							child.material.transmission = 1.0;
							child.material.opacity = 0.1;
							child.material.ior = 1.5;
							child.material.clearcoat = 1.0;
							child.material.clearcoatRoughness = 0.0;
							child.material.envMapIntensity = 1.3;
							child.material.side = THREE.FrontSide;
							child.material.depthWrite = true;
						}
						
						if (!glassModelMaterial) {
							glassModelMaterial = child.material;
						}
					}
				}
			});

			const container = new THREE.Group();
			container.add(cubeModel);
			scene.add(container);

			if (onMaterialReady) {
				onMaterialReady(glassModelMaterial);
			}
		},
		undefined,
		(error) => {
			console.error('Error loading cube model:', error);
		}
	);
}

// Load floor model
export function loadFloorModel(scene) {
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath('jsm/libs/draco/gltf/');

	const gltfLoader = new GLTFLoader();
	gltfLoader.setDRACOLoader(dracoLoader);

	gltfLoader.load(
		'models/glb/floor-01.glb',
		(gltf) => {
			floorModel = gltf.scene;
			floorModel.scale.set(1, 1, 1);
			
			floorModel.traverse((child) => {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
				}
			});

			const container = new THREE.Group();
			container.add(floorModel);
			scene.add(container);
		},
		undefined,
		(error) => {
			console.error('Error loading floor model:', error);
		}
	);
}

// Get glass model material
export function getGlassModelMaterial() {
	return glassModelMaterial;
}

// Get models
export function getCubeModel() {
	return cubeModel;
}

export function getFloorModel() {
	return floorModel;
}

