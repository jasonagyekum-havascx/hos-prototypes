// Floor Model - handles floor GLB model loading

import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Floor model state
let floorModel = null;
let floorMaterials = []; // Array to store all floor materials with their mesh info

// Material property overrides (set per mesh name from GLB)
// Use the mesh name from your GLB file as the key
// Example: { 'FloorMesh': { roughness: 0.3, metalness: 0.0, envMapIntensity: 1.0 } }
// To find mesh names, check the console or look at the GUI dropdown after loading
const floorMaterialConfig = {
	// Add entries using mesh names from your GLB file
	'woodring': { roughness: 1, metalness: 0.0, envMapIntensity: 1.0 }, // Change roughness here
	// 'MeshName': { roughness: 0.3, metalness: 0.0, envMapIntensity: 1.0 },
};

// Load floor-01.glb model
export function loadFloorModel(scene, onModelReady) {
	const dracoLoader = new DRACOLoader();
	dracoLoader.setDecoderPath('lib/jsm/libs/draco/gltf/');

	const gltfLoader = new GLTFLoader();
	gltfLoader.setDRACOLoader(dracoLoader);

	gltfLoader.load(
		'models/glb/floor-01.glb',
		(gltf) => {
			floorModel = gltf.scene;

			// Use 1:1 scale - no auto-scaling or centering
			// Model position and scale from Blender will be used directly
			floorModel.scale.set(1, 1, 1);

			// Reset materials array
			floorMaterials = [];
			
			// Ensure all meshes in the model have proper settings
			// Get the scene's environment map to apply to materials
			const sceneEnvMap = scene.environment;
			
			floorModel.traverse((child) => {
				if (child.isMesh) {
					child.castShadow = true;
					child.receiveShadow = true;
					
					// Preserve textures from GLB, but set other material properties from code
					if (child.material) {
						// Handle both single material and array of materials
						const materials = Array.isArray(child.material) ? child.material : [child.material];
						
						materials.forEach((originalMaterial, matIndex) => {
							// Store all texture maps from the original material
							const textureMaps = {
								map: originalMaterial.map,
								normalMap: originalMaterial.normalMap,
								roughnessMap: originalMaterial.roughnessMap,
								metalnessMap: originalMaterial.metalnessMap,
								aoMap: originalMaterial.aoMap,
								emissiveMap: originalMaterial.emissiveMap,
								alphaMap: originalMaterial.alphaMap,
								displacementMap: originalMaterial.displacementMap,
							};
							
							// Store color and other properties we want to preserve
							const originalColor = originalMaterial.color ? originalMaterial.color.clone() : new THREE.Color(0xffffff);
							
							// Get mesh name early so we can use config values
							const meshName = child.name || 'Mesh';
							
							// Get material config using mesh name (fallback to defaults)
							const materialConfig = floorMaterialConfig[meshName] || { 
								roughness: 0.3, 
								metalness: 0.28, 
								envMapIntensity: 0.7 
							};
							
							// Debug logging
							console.log(`Processing mesh: "${meshName}"`);
							console.log(`Config found:`, floorMaterialConfig[meshName] ? 'YES' : 'NO');
							if (floorMaterialConfig[meshName]) {
								console.log(`Applying config to "${meshName}":`, materialConfig);
							} else {
								console.log(`No config for "${meshName}", using defaults:`, materialConfig);
							}
							
							// Ensure it's a MeshPhysicalMaterial
							let floorMat;
							if (!(originalMaterial instanceof THREE.MeshPhysicalMaterial)) {
								floorMat = new THREE.MeshPhysicalMaterial({
									color: originalColor, // Preserve color from GLB
									// Preserve all texture maps
									map: textureMaps.map,
									normalMap: textureMaps.normalMap,
									roughnessMap: textureMaps.roughnessMap,
									metalnessMap: textureMaps.metalnessMap,
									aoMap: textureMaps.aoMap,
									emissiveMap: textureMaps.emissiveMap,
									alphaMap: textureMaps.alphaMap,
									displacementMap: textureMaps.displacementMap,
									// Set properties from config
									roughness: materialConfig.roughness,
									metalness: materialConfig.metalness,
									envMapIntensity: materialConfig.envMapIntensity,
									envMap: sceneEnvMap, // Use scene's environment map
								});
							} else {
								floorMat = originalMaterial;
								// Update existing material properties (but keep textures and color)
								// Preserve textures
								if (textureMaps.map) floorMat.map = textureMaps.map;
								if (textureMaps.normalMap) floorMat.normalMap = textureMaps.normalMap;
								if (textureMaps.roughnessMap) floorMat.roughnessMap = textureMaps.roughnessMap;
								if (textureMaps.metalnessMap) floorMat.metalnessMap = textureMaps.metalnessMap;
								if (textureMaps.aoMap) floorMat.aoMap = textureMaps.aoMap;
								if (textureMaps.emissiveMap) floorMat.emissiveMap = textureMaps.emissiveMap;
								if (textureMaps.alphaMap) floorMat.alphaMap = textureMaps.alphaMap;
								if (textureMaps.displacementMap) floorMat.displacementMap = textureMaps.displacementMap;
								
								// Set properties from config
								floorMat.roughness = materialConfig.roughness;
								floorMat.metalness = materialConfig.metalness;
								floorMat.envMapIntensity = materialConfig.envMapIntensity;
								// Ensure material uses scene's environment map
								if (sceneEnvMap) floorMat.envMap = sceneEnvMap;
								
								// If there's a roughnessMap, we need to disable it or it will override roughness
								if (floorMat.roughnessMap) {
									console.log(`WARNING: "${meshName}" has a roughnessMap texture that may override roughness value`);
									// Optionally remove the roughnessMap if you want the roughness value to work
									// floorMat.roughnessMap = null;
								}
							}
							
							// Force specific roughness values for certain meshes
							const meshNameLower = meshName.toLowerCase();
							if (meshNameLower === 'woodring') {
								// Remove roughnessMap if it exists, as it overrides the roughness value
								if (floorMat.roughnessMap) {
									floorMat.roughnessMap = null;
									console.log(`Removed roughnessMap from "${meshName}" to allow roughness value to work`);
								}
								floorMat.roughness = 1;
								console.log(`Forced roughness to 1 for "${meshName}"`);
							} else if (meshNameLower === 'standtop' || meshNameLower === 'floor') {
								// Remove roughnessMap if it exists, as it overrides the roughness value
								if (floorMat.roughnessMap) {
									floorMat.roughnessMap = null;
									console.log(`Removed roughnessMap from "${meshName}" to allow roughness value to work`);
								}
								floorMat.roughness = 0.2;
								console.log(`Forced roughness to 0.2 for "${meshName}"`);
							}
							
							floorMat.needsUpdate = true; // Ensure material updates
							
							// Final debug - log the actual roughness value set
							console.log(`Final roughness for "${meshName}":`, floorMat.roughness);
							
							// Store material info for GUI
							const materialName = floorMat.name || `Material ${matIndex}`;
							
							// Log mesh name to console for easy reference
							if (!floorMaterials.find(m => m.meshName === meshName)) {
								console.log(`Floor mesh found: "${meshName}" - use this name in floorMaterialConfig`);
							}
							
							floorMaterials.push({
								mesh: child,
								material: floorMat,
								meshName: meshName,
								materialName: materialName,
								index: floorMaterials.length
							});
							
							// Update the material in the mesh
							if (Array.isArray(child.material)) {
								child.material[matIndex] = floorMat;
							} else {
								child.material = floorMat;
							}
						});
					}
				}
			});

			// Position in the scene - centered at origin
			const container = new THREE.Group();
			container.add(floorModel);
			container.position.set(0, 0, 0); // Centered at world origin
			container.renderOrder = 0; // Render before other objects

			scene.add(container);

			// console.log('Floor model loaded successfully at 1:1 scale');

			// Call callback if provided
			if (onModelReady) {
				onModelReady(floorModel);
			}
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

// Get all floor materials for external access
export function getFloorMaterials() {
	return floorMaterials;
}


