// GUI - handles all GUI creation functions

import * as THREE from '../../../../build/three.module.js';
import { getIceObjects, getIceCubeMaterial } from './ice-system.js';
import { getLiquidMeshes } from './liquid-system.js';
import { getGlassModelMaterial } from './models.js';

function createFloorGUI(gui) {
			if (!floor || !floor.material) return;

			const floorFolder = gui.addFolder('Floor');
			
			const floorSettings = {
				color: '#' + floor.material.color.getHexString(),
				roughness: floor.material.roughness,
				metalness: floor.material.metalness,
				envMapIntensity: floor.material.envMapIntensity,
				visible: floor.visible,
			};

			// Color control
			floorFolder.addColor(floorSettings, 'color').name('Color').onChange((value) => {
				floor.material.color.set(value);
			});

			// Roughness control
			floorFolder.add(floorSettings, 'roughness', 0, 1, 0.01).name('Roughness').onChange((value) => {
				floor.material.roughness = value;
			});

			// Metalness control
			floorFolder.add(floorSettings, 'metalness', 0, 1, 0.01).name('Metalness').onChange((value) => {
				floor.material.metalness = value;
			});

			// Environment map intensity
			floorFolder.add(floorSettings, 'envMapIntensity', 0, 3, 0.1).name('Reflection Intensity').onChange((value) => {
				floor.material.envMapIntensity = value;
			});

			// Visibility toggle
			floorFolder.add(floorSettings, 'visible').name('Visible').onChange((value) => {
				floor.visible = value;
			});

			// Keep folder collapsed by default
			floorFolder.close();
		}

		// Create glass material GUI controls

function createGlassGUI(gui) {
			if (!glassModelMaterial) return;

			const glassFolder = gui.addFolder('Glass Material');
			
			const glassSettings = {
				color: '#' + glassModelMaterial.color.getHexString(),
				roughness: glassModelMaterial.roughness,
				metalness: glassModelMaterial.metalness,
				transmission: glassModelMaterial.transmission,
				opacity: glassModelMaterial.opacity,
				ior: glassModelMaterial.ior,
				thickness: glassModelMaterial.thickness,
				clearcoat: glassModelMaterial.clearcoat,
				clearcoatRoughness: glassModelMaterial.clearcoatRoughness,
				envMapIntensity: glassModelMaterial.envMapIntensity,
				side: glassModelMaterial.side === THREE.DoubleSide ? 'Double' : 'Front',
				depthWrite: glassModelMaterial.depthWrite,
			};

			// Basic Properties
			const basicFolder = glassFolder.addFolder('Basic');
			basicFolder.addColor(glassSettings, 'color').name('Color').onChange((value) => {
				glassModelMaterial.color.set(value);
			});
			basicFolder.add(glassSettings, 'roughness', 0, 1, 0.01).name('Roughness').onChange((value) => {
				glassModelMaterial.roughness = value;
			});
			basicFolder.add(glassSettings, 'metalness', 0, 1, 0.01).name('Metalness').onChange((value) => {
				glassModelMaterial.metalness = value;
			});
			basicFolder.add(glassSettings, 'opacity', 0, 1, 0.01).name('Opacity').onChange((value) => {
				glassModelMaterial.opacity = value;
			});
			basicFolder.close();

			// Transmission & Refraction
			const transmissionFolder = glassFolder.addFolder('Transmission & Refraction');
			transmissionFolder.add(glassSettings, 'transmission', 0, 1, 0.01).name('Transmission').onChange((value) => {
				glassModelMaterial.transmission = value;
			});
			transmissionFolder.add(glassSettings, 'ior', 1, 2.5, 0.01).name('IOR').onChange((value) => {
				glassModelMaterial.ior = value;
			});
			transmissionFolder.add(glassSettings, 'thickness', 0, 2, 0.1).name('Thickness').onChange((value) => {
				glassModelMaterial.thickness = value;
			});
			transmissionFolder.close();

			// Clearcoat
			const clearcoatFolder = glassFolder.addFolder('Clearcoat');
			clearcoatFolder.add(glassSettings, 'clearcoat', 0, 1, 0.01).name('Clearcoat').onChange((value) => {
				glassModelMaterial.clearcoat = value;
			});
			clearcoatFolder.add(glassSettings, 'clearcoatRoughness', 0, 1, 0.01).name('Clearcoat Roughness').onChange((value) => {
				glassModelMaterial.clearcoatRoughness = value;
			});
			clearcoatFolder.close();

			// Environment & Rendering
			const envFolder = glassFolder.addFolder('Environment & Rendering');
			envFolder.add(glassSettings, 'envMapIntensity', 0, 3, 0.1).name('Reflection Intensity').onChange((value) => {
				glassModelMaterial.envMapIntensity = value;
			});
			envFolder.add(glassSettings, 'side', ['Front', 'Double']).name('Side').onChange((value) => {
				glassModelMaterial.side = value === 'Double' ? THREE.DoubleSide : THREE.FrontSide;
				glassModelMaterial.needsUpdate = true;
			});
			envFolder.add(glassSettings, 'depthWrite').name('Depth Write').onChange((value) => {
				glassModelMaterial.depthWrite = value;
			});
			envFolder.close();

			// Keep folder collapsed by default
			glassFolder.close();
		}

		// Create ice cube material GUI controls

function createIceCubeGUI(gui) {
			// Get material from first ice cube if available
			if (iceObjects.length > 0 && iceObjects[0].mesh) {
				// Try to get material from GLB model or procedural mesh
				let material = null;
				iceObjects[0].mesh.traverse((child) => {
					if (child.isMesh && child.material && !material) {
						material = child.material;
					}
				});
				
				// Fallback to stored material reference
				if (!material) {
					material = iceCubeMaterial;
				}
				
				if (!material) return;
				
				const iceFolder = gui.addFolder('Ice Cube Material');
				
				const iceSettings = {
					color: '#' + material.color.getHexString(),
					roughness: material.roughness,
					metalness: material.metalness,
					opacity: material.opacity,
					transmission: material.transmission !== undefined ? material.transmission : 0,
					ior: material.ior !== undefined ? material.ior : 1.5,
					thickness: material.thickness !== undefined ? material.thickness : 0,
					clearcoat: material.clearcoat !== undefined ? material.clearcoat : 0,
					clearcoatRoughness: material.clearcoatRoughness !== undefined ? material.clearcoatRoughness : 0,
					envMapIntensity: material.envMapIntensity || 1.0,
					emissive: '#' + (material.emissive ? material.emissive.getHexString() : '000000'),
					emissiveIntensity: material.emissiveIntensity || 0,
					side: material.side === THREE.DoubleSide ? 'Double' : (material.side === THREE.BackSide ? 'Back' : 'Front'),
					depthWrite: material.depthWrite,
					transparent: material.transparent,
				};

				// Basic Properties
				const basicFolder = iceFolder.addFolder('Basic');
				basicFolder.addColor(iceSettings, 'color').name('Color').onChange((value) => {
					// Update all ice cube materials
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => mat.color.set(value));
								} else {
									child.material.color.set(value);
								}
							}
						});
					});
				});
				basicFolder.add(iceSettings, 'roughness', 0, 1, 0.01).name('Roughness').onChange((value) => {
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => mat.roughness = value);
								} else {
									child.material.roughness = value;
								}
							}
						});
					});
				});
				basicFolder.add(iceSettings, 'metalness', 0, 1, 0.01).name('Metalness').onChange((value) => {
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => mat.metalness = value);
								} else {
									child.material.metalness = value;
								}
							}
						});
					});
				});
				basicFolder.add(iceSettings, 'opacity', 0, 1, 0.01).name('Opacity').onChange((value) => {
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => mat.opacity = value);
								} else {
									child.material.opacity = value;
								}
							}
						});
					});
				});
				basicFolder.close();

				// Transmission & Refraction
				const transmissionFolder = iceFolder.addFolder('Transmission & Refraction');
				transmissionFolder.add(iceSettings, 'transmission', 0, 1, 0.01).name('Transmission').onChange((value) => {
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => {
										if (mat.transmission !== undefined) mat.transmission = value;
									});
								} else {
									if (child.material.transmission !== undefined) child.material.transmission = value;
								}
							}
						});
					});
				});
				transmissionFolder.add(iceSettings, 'ior', 1, 2.5, 0.01).name('IOR').onChange((value) => {
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => {
										if (mat.ior !== undefined) mat.ior = value;
									});
								} else {
									if (child.material.ior !== undefined) child.material.ior = value;
								}
							}
						});
					});
				});
				transmissionFolder.add(iceSettings, 'thickness', 0, 2, 0.1).name('Thickness').onChange((value) => {
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => {
										if (mat.thickness !== undefined) mat.thickness = value;
									});
								} else {
									if (child.material.thickness !== undefined) child.material.thickness = value;
								}
							}
						});
					});
				});
				transmissionFolder.close();

				// Clearcoat
				const clearcoatFolder = iceFolder.addFolder('Clearcoat');
				clearcoatFolder.add(iceSettings, 'clearcoat', 0, 1, 0.01).name('Clearcoat').onChange((value) => {
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => {
										if (mat.clearcoat !== undefined) mat.clearcoat = value;
									});
								} else {
									if (child.material.clearcoat !== undefined) child.material.clearcoat = value;
								}
							}
						});
					});
				});
				clearcoatFolder.add(iceSettings, 'clearcoatRoughness', 0, 1, 0.01).name('Clearcoat Roughness').onChange((value) => {
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => {
										if (mat.clearcoatRoughness !== undefined) mat.clearcoatRoughness = value;
									});
								} else {
									if (child.material.clearcoatRoughness !== undefined) child.material.clearcoatRoughness = value;
								}
							}
						});
					});
				});
				clearcoatFolder.close();

				// Emissive Properties
				const emissiveFolder = iceFolder.addFolder('Emissive');
				emissiveFolder.addColor(iceSettings, 'emissive').name('Emissive Color').onChange((value) => {
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => {
										if (mat.emissive) mat.emissive.set(value);
									});
								} else {
									if (child.material.emissive) child.material.emissive.set(value);
								}
							}
						});
					});
				});
				emissiveFolder.add(iceSettings, 'emissiveIntensity', 0, 2, 0.01).name('Emissive Intensity').onChange((value) => {
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => {
										if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = value;
									});
								} else {
									if (child.material.emissiveIntensity !== undefined) child.material.emissiveIntensity = value;
								}
							}
						});
					});
				});
				emissiveFolder.close();

				// Environment & Rendering
				const envFolder = iceFolder.addFolder('Environment & Rendering');
				envFolder.add(iceSettings, 'envMapIntensity', 0, 3, 0.1).name('Reflection Intensity').onChange((value) => {
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => {
										if (mat.envMapIntensity !== undefined) mat.envMapIntensity = value;
									});
								} else {
									if (child.material.envMapIntensity !== undefined) child.material.envMapIntensity = value;
								}
							}
						});
					});
				});
				envFolder.add(iceSettings, 'side', ['Front', 'Back', 'Double']).name('Side').onChange((value) => {
					const sideMap = {
						'Front': THREE.FrontSide,
						'Back': THREE.BackSide,
						'Double': THREE.DoubleSide
					};
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => {
										mat.side = sideMap[value];
										mat.needsUpdate = true;
									});
								} else {
									child.material.side = sideMap[value];
									child.material.needsUpdate = true;
								}
							}
						});
					});
				});
				envFolder.add(iceSettings, 'depthWrite').name('Depth Write').onChange((value) => {
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => mat.depthWrite = value);
								} else {
									child.material.depthWrite = value;
								}
							}
						});
					});
				});
				envFolder.add(iceSettings, 'transparent').name('Transparent').onChange((value) => {
					iceObjects.forEach((ice) => {
						ice.mesh.traverse((child) => {
							if (child.isMesh && child.material) {
								if (Array.isArray(child.material)) {
									child.material.forEach(mat => mat.transparent = value);
								} else {
									child.material.transparent = value;
								}
							}
						});
					});
				});
				envFolder.close();

				// Keep folder collapsed by default
				iceFolder.close();
			}
		}

		// Create liquid material GUI controls

export function createLiquidGUI(gui) {
			const liquidMeshes = getLiquidMeshes();
			if (!liquidMeshes || !liquidMeshes.surface || !liquidMeshes.body || !liquidMeshes.surface.material || !liquidMeshes.body.material) return;

			const liquidSurface = liquidMeshes.surface;
			const liquidBody = liquidMeshes.body;

			const liquidFolder = gui.addFolder('Liquid Material');
			
			// Surface Material Settings
			const surfaceFolder = liquidFolder.addFolder('Surface (Top Circle)');
			const surfaceSettings = {
				color: '#' + liquidSurface.material.color.getHexString(),
				roughness: liquidSurface.material.roughness,
				metalness: liquidSurface.material.metalness,
				opacity: liquidSurface.material.opacity,
				emissive: '#' + (liquidSurface.material.emissive ? liquidSurface.material.emissive.getHexString() : '000000'),
				emissiveIntensity: liquidSurface.material.emissiveIntensity || 0,
				envMapIntensity: liquidSurface.material.envMapIntensity || 1.0,
				side: liquidSurface.material.side === THREE.DoubleSide ? 'Double' : (liquidSurface.material.side === THREE.BackSide ? 'Back' : 'Front'),
				depthWrite: liquidSurface.material.depthWrite,
				transparent: liquidSurface.material.transparent,
			};

			surfaceFolder.addColor(surfaceSettings, 'color').name('Color').onChange((value) => {
				liquidSurface.material.color.set(value);
			});
			surfaceFolder.add(surfaceSettings, 'roughness', 0, 1, 0.01).name('Roughness').onChange((value) => {
				liquidSurface.material.roughness = value;
			});
			surfaceFolder.add(surfaceSettings, 'metalness', 0, 1, 0.01).name('Metalness').onChange((value) => {
				liquidSurface.material.metalness = value;
			});
			surfaceFolder.add(surfaceSettings, 'opacity', 0, 1, 0.01).name('Opacity').onChange((value) => {
				liquidSurface.material.opacity = value;
			});
			surfaceFolder.addColor(surfaceSettings, 'emissive').name('Emissive Color').onChange((value) => {
				if (liquidSurface.material.emissive) liquidSurface.material.emissive.set(value);
			});
			surfaceFolder.add(surfaceSettings, 'emissiveIntensity', 0, 2, 0.01).name('Emissive Intensity').onChange((value) => {
				if (liquidSurface.material.emissiveIntensity !== undefined) liquidSurface.material.emissiveIntensity = value;
			});
			surfaceFolder.add(surfaceSettings, 'envMapIntensity', 0, 3, 0.1).name('Reflection Intensity').onChange((value) => {
				if (liquidSurface.material.envMapIntensity !== undefined) liquidSurface.material.envMapIntensity = value;
			});
			surfaceFolder.add(surfaceSettings, 'side', ['Front', 'Back', 'Double']).name('Side').onChange((value) => {
				const sideMap = {
					'Front': THREE.FrontSide,
					'Back': THREE.BackSide,
					'Double': THREE.DoubleSide
				};
				liquidSurface.material.side = sideMap[value];
				liquidSurface.material.needsUpdate = true;
			});
			surfaceFolder.add(surfaceSettings, 'depthWrite').name('Depth Write').onChange((value) => {
				liquidSurface.material.depthWrite = value;
			});
			surfaceFolder.add(surfaceSettings, 'transparent').name('Transparent').onChange((value) => {
				liquidSurface.material.transparent = value;
			});
			surfaceFolder.close();

			// Body Material Settings (Cylinder)
			const bodyFolder = liquidFolder.addFolder('Body (Cylinder)');
			const bodySettings = {
				color: '#' + liquidBody.material.color.getHexString(),
				roughness: liquidBody.material.roughness,
				metalness: liquidBody.material.metalness,
				opacity: liquidBody.material.opacity,
				emissive: '#' + (liquidBody.material.emissive ? liquidBody.material.emissive.getHexString() : '000000'),
				emissiveIntensity: liquidBody.material.emissiveIntensity || 0,
				envMapIntensity: liquidBody.material.envMapIntensity || 1.0,
				side: liquidBody.material.side === THREE.DoubleSide ? 'Double' : (liquidBody.material.side === THREE.BackSide ? 'Back' : 'Front'),
				depthWrite: liquidBody.material.depthWrite,
				transparent: liquidBody.material.transparent,
			};

			bodyFolder.addColor(bodySettings, 'color').name('Color').onChange((value) => {
				liquidBody.material.color.set(value);
			});
			bodyFolder.add(bodySettings, 'roughness', 0, 1, 0.01).name('Roughness').onChange((value) => {
				liquidBody.material.roughness = value;
			});
			bodyFolder.add(bodySettings, 'metalness', 0, 1, 0.01).name('Metalness').onChange((value) => {
				liquidBody.material.metalness = value;
			});
			bodyFolder.add(bodySettings, 'opacity', 0, 1, 0.01).name('Opacity').onChange((value) => {
				liquidBody.material.opacity = value;
			});
			bodyFolder.addColor(bodySettings, 'emissive').name('Emissive Color').onChange((value) => {
				if (liquidBody.material.emissive) liquidBody.material.emissive.set(value);
			});
			bodyFolder.add(bodySettings, 'emissiveIntensity', 0, 2, 0.01).name('Emissive Intensity').onChange((value) => {
				if (liquidBody.material.emissiveIntensity !== undefined) liquidBody.material.emissiveIntensity = value;
			});
			bodyFolder.add(bodySettings, 'envMapIntensity', 0, 3, 0.1).name('Reflection Intensity').onChange((value) => {
				if (liquidBody.material.envMapIntensity !== undefined) liquidBody.material.envMapIntensity = value;
			});
			bodyFolder.add(bodySettings, 'side', ['Front', 'Back', 'Double']).name('Side').onChange((value) => {
				const sideMap = {
					'Front': THREE.FrontSide,
					'Back': THREE.BackSide,
					'Double': THREE.DoubleSide
				};
				liquidBody.material.side = sideMap[value];
				liquidBody.material.needsUpdate = true;
			});
			bodyFolder.add(bodySettings, 'depthWrite').name('Depth Write').onChange((value) => {
				liquidBody.material.depthWrite = value;
			});
			bodyFolder.add(bodySettings, 'transparent').name('Transparent').onChange((value) => {
				liquidBody.material.transparent = value;
			});
			bodyFolder.close();

			// Keep folder collapsed by default
			liquidFolder.close();
		}
