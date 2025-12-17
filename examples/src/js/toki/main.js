import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { setupLights, updateLightHelpers, toggleHelpers, createLightGUI } from './lights-config.js';
import { liquidConfig, applyLiquidConfig } from './liquid-config.js';
import { initScene, setupCameraControls, setupResizeHandler } from './scene-setup.js';
import { setupPanelControls, setupControls } from './controls.js';
import { initHotspots, updateHotspots, checkHotspotHover, checkHotspotClick, closePanel, getActivePanel, getHotspotOverlay } from './hotspots.js';
import { buildLiquid, updateLiquidAnimation, triggerRipple, getLiquidMeshes, getLiquidUniforms } from './liquid-system.js';
import { createLiquidGUI } from './gui.js';

		let renderer, scene, camera, controls;
		let lights; // Store lights reference for helpers
		let gui; // GUI panel
		let transformControls; // Gizmos for dragging lights
		let floor = null; // Floor mesh reference
		let glassModelMaterial = null; // Glass model material reference
		let iceCubeMaterial = null; // Ice cube material reference (for GUI controls)
			let raycaster;
			let glassOuter, glassInner, glassBottom;
			const mouse = new THREE.Vector2();

			// Bubble system
			let bubbleGeometry, bubbleMaterial;
			let bubbleInstances = [];
			const MAX_BUBBLES = 500;
			let bubbleMesh;

		// Orange slice
		let orangeSlice;
		let orangeSliceVisible = false;

		// Cube model
		let cubeModel;
		
		// Floor model
		let floorModel;

		// Ice cube GLB model (for first ice cube)
		let iceCubeGLBModel = null;

			// Ice cubes (simple floating objects)
			const iceObjects = [];
			const iceConfig = {
				quantity: 2,
				maxQuantity: 4,
				baseSize: 0.12,
				sizeMultiplier: 3.75,
			};

			// Fizz configuration
			let fizzIntensity = 3.0;

			// Time tracking
			let elapsedTime = 0;

			// Highball glass dimensions (taller and slender)
			const GLASS_RADIUS = 0.85;
			const GLASS_HEIGHT = 2.8;
			const GLASS_THICKNESS = 0.04;

			// Liquid configuration
			const LIQUID_RADIUS = GLASS_RADIUS - GLASS_THICKNESS - 0.02;
			const LIQUID_HEIGHT = 2.2;
			const LIQUID_BASE_Y = 0.1;
			const LIQUID_SURFACE_Y = LIQUID_BASE_Y + LIQUID_HEIGHT;

			// Toki Highball golden amber color (20% darker)
			const LIQUID_COLOR = 0xaf934a;
			const LIQUID_DEEP_COLOR = 0xa18033;

			init();

			function createIceMaterial() {

				// Use MeshPhysicalMaterial for realistic ice with transmission/refraction like glass
				const material = new THREE.MeshPhysicalMaterial({
					color: 0xd8e4f0,
					metalness: 0.0,
					roughness: 0.1,
					transmission: 0.7,      // Moderate transmission - visible but transparent
					opacity: 0.85,         // Slightly transparent for visibility
					transparent: true,
					thickness: 0.3,         // Ice thickness for refraction calculation
					ior: 1.31,              // Index of refraction for ice (slightly less than glass)
					clearcoat: 0.8,         // Glossy clear coat layer
					clearcoatRoughness: 0.2,
					envMapIntensity: 1.2,
					side: THREE.FrontSide,
					depthWrite: true,       // Enable depth write for better visibility
					emissive: 0x000000,
					emissiveIntensity: 0,
				});
				
				// Store reference for GUI controls
				if (!iceCubeMaterial) {
					iceCubeMaterial = material;
				}
				
				return material;

			}

			function createIceMesh(size) {

				// Rectangular ice cube typical for highballs
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

			// Load ice-cube.glb model
			function loadIceCubeGLB() {
				const dracoLoader = new DRACOLoader();
				dracoLoader.setDecoderPath('jsm/libs/draco/gltf/');

				const gltfLoader = new GLTFLoader();
				gltfLoader.setDRACOLoader(dracoLoader);

				gltfLoader.load(
					'models/glb/ice-cube.glb',
					(gltf) => {
						iceCubeGLBModel = gltf.scene;
						// Store the original model for cloning
						// console.log('Ice cube GLB model loaded successfully');
						
						// Extract material reference from GLB model
						iceCubeGLBModel.traverse((child) => {
							if (child.isMesh && child.material && !iceCubeMaterial) {
								iceCubeMaterial = child.material;
							}
						});
						
						// If ice cubes haven't been spawned yet, they'll use GLB when spawned
						// Otherwise, replace all procedural ice cubes with GLB models
						if (iceObjects.length > 0) {
							// Replace all procedural ice cubes with GLB models
							const size = getCurrentIceSize();
							
							iceObjects.forEach((ice, index) => {
								if (ice.mesh.userData.isProcedural) {
									const oldPosition = ice.mesh.position.clone();
									const oldRotation = ice.mesh.rotation.clone();
									
									scene.remove(ice.mesh);
									ice.mesh.geometry.dispose();
									ice.mesh.material.dispose();
									
									// Create new GLB ice cube with same size
									const mesh = iceCubeGLBModel.clone();
									
									// Calculate scale to match procedural ice cube size
									const box = new THREE.Box3().setFromObject(mesh);
									const glbSize = box.getSize(new THREE.Vector3());
									const targetWidth = size * 1.8;
									const targetHeight = size * 2.2;
									const scaleX = targetWidth / Math.max(glbSize.x, 0.001);
									const scaleY = targetHeight / Math.max(glbSize.y, 0.001);
									const scaleZ = targetWidth / Math.max(glbSize.z, 0.001);
									const avgScale = (scaleX + scaleY + scaleZ) / 3;
									mesh.scale.set(avgScale, avgScale, avgScale);
									
									mesh.traverse((child) => {
										if (child.isMesh) {
											child.castShadow = true;
											child.receiveShadow = true;
											child.renderOrder = 3;
											
											// Apply ice material with transmission properties
											if (child.material) {
												// Convert to MeshPhysicalMaterial if not already
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
													// Update existing MeshPhysicalMaterial with ice defaults
													if (child.material.transmission === undefined) child.material.transmission = 0.7;
													if (child.material.ior === undefined) child.material.ior = 1.31;
													if (child.material.thickness === undefined) child.material.thickness = 0.3;
													if (child.material.clearcoat === undefined) child.material.clearcoat = 0.8;
													if (child.material.clearcoatRoughness === undefined) child.material.clearcoatRoughness = 0.2;
													if (child.material.opacity === undefined || child.material.opacity === 1) child.material.opacity = 0.85;
													child.material.depthWrite = true;
												}
												
												// Store material reference for GUI controls (use first mesh material)
												if (!iceCubeMaterial) {
													iceCubeMaterial = child.material;
												}
											}
										}
									});
									
									mesh.renderOrder = 3;
									mesh.userData.baseSize = size;
									mesh.userData.isProcedural = false;
									
									// Preserve position and rotation from old ice cube
									mesh.position.copy(oldPosition);
									mesh.rotation.copy(oldRotation);
									
									scene.add(mesh);
									ice.mesh = mesh;
									// console.log(`Replaced procedural ice cube ${index} with GLB model`);
								}
							});
							
							// Create ice cube GUI if not already created
							if (gui && iceObjects.length > 0) {
								// Check if GUI already has ice cube folder
								const existingFolder = gui.children.find(child => child._title === 'Ice Cube Material');
								if (!existingFolder) {
									createIceCubeGUI(gui);
								}
							}
						}
					},
					(progress) => {
						// console.log('Loading ice cube:', (progress.loaded / progress.total * 100) + '%');
					},
					(error) => {
						console.error('Error loading ice cube model:', error);
					}
				);
			}

			function updateAllIceSizes() {

				const newSize = getCurrentIceSize();

				for (const ice of iceObjects) {

					const scale = newSize / ice.mesh.userData.baseSize;
					ice.mesh.scale.set(scale, scale, scale);

				}

			}

			function getIceHeight(ice) {

				const size = getCurrentIceSize();
				const scale = ice.mesh.scale.x;
				// Ice height is 2.2 * size * scale
				return size * 2.2 * scale * 0.5;

			}

			function findNonOverlappingPosition(size, iceIndex) {

				const iceHeight = size * 2.2;
				
				// For 2 stacked ice cubes - deterministic positioning
				if (iceIndex === 0) {

					// First (top) ice cube - breaks the surface
					// Positioned at center, 30% submerged
					return { 
						x: 0, 
						z: 0, 
						y: LIQUID_SURFACE_Y - iceHeight * 0.35
					};

				} else {

					// Second (bottom) ice cube - stacked below the first
					// Positioned directly under the first cube
					const topIce = iceObjects[0];
					const stackY = topIce.baseY - iceHeight - 0.02; // Stack below with small gap
					
					return { 
						x: topIce.baseX + (Math.random() - 0.5) * 0.05, // Tiny offset for realism
						z: topIce.baseZ + (Math.random() - 0.5) * 0.05, 
						y: Math.max(stackY, LIQUID_BASE_Y + iceHeight * 0.5 + 0.1) // Don't go below glass bottom
					};

				}

			}

			function spawnIce() {

				if (iceObjects.length >= iceConfig.maxQuantity) return;

				const size = getCurrentIceSize();
				const iceIndex = iceObjects.length;
				const position = findNonOverlappingPosition(size, iceIndex);

				// First ice cube is the "surface" ice
				const isFirstIce = iceIndex === 0;
				
				// Use GLB model for all ice cubes if available, otherwise use procedural mesh
				let mesh;
				if (iceCubeGLBModel) {
					// Clone the GLB model for this ice cube
					mesh = iceCubeGLBModel.clone();
					
					// Calculate scale to match procedural ice cube size
					// Procedural ice cube dimensions: size * 1.8 (width/depth), size * 2.2 (height)
					// We need to get the bounding box of the GLB model and scale accordingly
					const box = new THREE.Box3().setFromObject(mesh);
					const glbSize = box.getSize(new THREE.Vector3());
					
					// Target size for ice cube
					const targetWidth = size * 1.8;
					const targetHeight = size * 2.2;
					
					// Scale to match target dimensions (use the larger dimension to maintain aspect ratio)
					const scaleX = targetWidth / Math.max(glbSize.x, 0.001);
					const scaleY = targetHeight / Math.max(glbSize.y, 0.001);
					const scaleZ = targetWidth / Math.max(glbSize.z, 0.001);
					
					// Use average scale to maintain proportions, or use the dominant dimension
					const avgScale = (scaleX + scaleY + scaleZ) / 3;
					mesh.scale.set(avgScale, avgScale, avgScale);
					
					// Ensure all meshes in the GLB have proper settings and apply ice material
					mesh.traverse((child) => {
						if (child.isMesh) {
							child.castShadow = true;
							child.receiveShadow = true;
							child.renderOrder = 3;
							
							// Apply ice material with transmission properties
							if (child.material) {
								// Convert to MeshPhysicalMaterial if not already
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
									// Update existing MeshPhysicalMaterial with ice defaults
									if (child.material.transmission === undefined) child.material.transmission = 0.9;
									if (child.material.ior === undefined) child.material.ior = 1.31;
									if (child.material.thickness === undefined) child.material.thickness = 0.5;
									if (child.material.clearcoat === undefined) child.material.clearcoat = 1.0;
									if (child.material.clearcoatRoughness === undefined) child.material.clearcoatRoughness = 0.1;
									child.material.depthWrite = false;
								}
								
								// Store material reference for GUI controls (use first mesh material)
								if (!iceCubeMaterial) {
									iceCubeMaterial = child.material;
								}
							}
						}
					});
					
					mesh.renderOrder = 3;
					mesh.userData.baseSize = size;
					mesh.userData.isProcedural = false;
				} else {
					// Use procedural mesh if GLB not loaded yet
					mesh = createIceMesh(size);
				}

				// Each ice cube gets unique animation parameters
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

				mesh.position.set(
					iceData.baseX,
					iceData.baseY,
					iceData.baseZ
				);

				mesh.rotation.set(
					Math.random() * 0.3,
					Math.random() * Math.PI * 2,
					Math.random() * 0.3
				);

				scene.add(mesh);
				iceObjects.push(iceData);

			}

			function removeIce() {

				if (iceObjects.length === 0) return;

				const ice = iceObjects.pop();
				scene.remove(ice.mesh);
				ice.mesh.geometry.dispose();
				ice.mesh.material.dispose();

			}


			function getIceCollisionRadius(ice) {

				const size = getCurrentIceSize();
				const scale = ice.mesh.scale.x;
				// Use the larger dimension (1.8 * size * scale) as collision radius
				return size * 1.8 * scale * 0.5;

			}

			function resolveIceCollisions() {

				const size = getCurrentIceSize();
				const iceHeight = size * 2.2;
				const minY = LIQUID_BASE_Y + iceHeight * 0.5 + 0.05;
				const boundsRadius = LIQUID_RADIUS - size * 0.8;

				// For 2 stacked cubes - maintain vertical alignment
				if (iceObjects.length === 2) {

					const topIce = iceObjects[0];  // First ice (floater at top)
					const bottomIce = iceObjects[1];  // Second ice (below)

					// Keep top ice at surface level
					const topTargetY = LIQUID_SURFACE_Y - iceHeight * 0.35;
					topIce.baseY += (topTargetY - topIce.baseY) * 0.1;

					// Keep bottom ice stacked below top ice
					const bottomTargetY = topIce.baseY - iceHeight - 0.02;
					const clampedBottomY = Math.max(bottomTargetY, minY);
					bottomIce.baseY += (clampedBottomY - bottomIce.baseY) * 0.1;

					// Keep bottom ice horizontally aligned with top (slight offset for realism)
					bottomIce.baseX += (topIce.baseX - bottomIce.baseX) * 0.05;
					bottomIce.baseZ += (topIce.baseZ - bottomIce.baseZ) * 0.05;

				}

				// Apply bounds constraints for all ice
				for (const ice of iceObjects) {

					// Keep within glass bounds horizontally
					const currentDist = Math.sqrt(ice.baseX * ice.baseX + ice.baseZ * ice.baseZ);
					if (currentDist > boundsRadius) {

						const scale = boundsRadius / currentDist;
						ice.baseX *= scale;
						ice.baseZ *= scale;

					}

					// Clamp Y range
					const maxY = ice.isFloater 
						? LIQUID_SURFACE_Y - iceHeight * 0.25 
						: LIQUID_SURFACE_Y - iceHeight * 0.6;
					
					if (ice.baseY > maxY) ice.baseY = maxY;
					if (ice.baseY < minY) ice.baseY = minY;

				}

			}

			function updateIceAnimation(time) {

				const size = getCurrentIceSize();
				const boundsRadius = LIQUID_RADIUS - size * 1.0;

				// Resolve collisions (iterations are inside the function)
				resolveIceCollisions();

				for (const ice of iceObjects) {

					// Gentle bobbing motion - stronger for floater
					const bobY = Math.sin(time * ice.bobSpeed + ice.phaseY) * ice.bobAmount;

					// Slight drift in X and Z
					const driftX = Math.sin(time * 0.3 + ice.phaseX) * ice.driftAmount;
					const driftZ = Math.cos(time * 0.25 + ice.phaseZ) * ice.driftAmount;

					// Apply position from base + drift
					let newX = ice.baseX + driftX;
					let newZ = ice.baseZ + driftZ;

					// Final boundary check
					const dist = Math.sqrt(newX * newX + newZ * newZ);

					if (dist > boundsRadius) {

						const boundsScale = boundsRadius / dist;
						newX *= boundsScale;
						newZ *= boundsScale;

					}

					ice.mesh.position.x = newX;
					ice.mesh.position.y = ice.baseY + bobY;
					ice.mesh.position.z = newZ;

					// Gentle rotation
					ice.mesh.rotation.y += ice.rotationSpeed * 0.016;
					ice.mesh.rotation.x = Math.sin(time * 0.5 + ice.phaseX) * 0.06;
					ice.mesh.rotation.z = Math.cos(time * 0.4 + ice.phaseZ) * 0.06;

				}

			}

			// Orange peel creation (single strip peel)
			function createOrangeSlice() {

				const group = new THREE.Group();

				// Peel dimensions - shorter strip (half length)
				const peelLength = 1.2;
				const peelWidth = 0.18;
				const peelThickness = 0.035;
				const curveSegments = 16;

				// Create a curved path for the peel - gentle S-curve
				const curve = new THREE.CatmullRomCurve3([
					new THREE.Vector3(0, 0, 0),
					new THREE.Vector3(0.06, peelLength * 0.3, 0.03),
					new THREE.Vector3(-0.04, peelLength * 0.6, 0.05),
					new THREE.Vector3(0.02, peelLength, 0),
				]);

				// Create custom peel geometry by extruding along curve
				const peelShape = new THREE.Shape();
				peelShape.moveTo(-peelWidth / 2, 0);
				peelShape.lineTo(peelWidth / 2, 0);
				peelShape.lineTo(peelWidth / 2, peelThickness);
				peelShape.lineTo(-peelWidth / 2, peelThickness);
				peelShape.lineTo(-peelWidth / 2, 0);

				const extrudeSettings = {
					steps: curveSegments,
					bevelEnabled: false,
					extrudePath: curve,
				};

				const peelGeometry = new THREE.ExtrudeGeometry(peelShape, extrudeSettings);

				// Orange rind (outer surface) - vibrant orange
				const rindMaterial = new THREE.MeshStandardMaterial({
					color: 0xf57c00,
					metalness: 0.05,
					roughness: 0.55,
					side: THREE.FrontSide,
				});

				const peel = new THREE.Mesh(peelGeometry, rindMaterial);
				group.add(peel);

				// Inner pith layer (whitish-orange)
				const pithGeometry = peelGeometry.clone();
				const pithMaterial = new THREE.MeshStandardMaterial({
					color: 0xffe4b5,
					metalness: 0.0,
					roughness: 0.85,
					side: THREE.BackSide,
				});

				const pith = new THREE.Mesh(pithGeometry, pithMaterial);
				group.add(pith);

				// Add subtle texture detail with slight bumps along the peel
				const detailCount = 6;
				const detailMaterial = new THREE.MeshStandardMaterial({
					color: 0xd46a00,
					metalness: 0.0,
					roughness: 0.7,
				});

				for (let i = 0; i < detailCount; i++) {

					const t = (i + 0.5) / detailCount;
					const point = curve.getPoint(t);

					// Small bumps for orange peel texture
					const bumpGeo = new THREE.SphereGeometry(0.012, 6, 6);
					const bump = new THREE.Mesh(bumpGeo, detailMaterial);

					// Offset slightly from center
					const offsetX = (Math.random() - 0.5) * peelWidth * 0.5;
					const offsetZ = peelThickness * 0.5;

					bump.position.set(
						point.x + offsetX,
						point.y,
						point.z + offsetZ
					);

					group.add(bump);

				}

				return group;

			}

			function spawnOrangeSlice() {

				orangeSlice = createOrangeSlice();
				
				// Position inside glass at top, vertical orientation
				// Leaning slightly against the inner glass wall
				const peelX = 0.45;  // Near the inner edge of glass
				const peelZ = 0.3;
				const peelY = LIQUID_SURFACE_Y - 0.5;  // Bottom in liquid, top sticks out
				
				orangeSlice.position.set(peelX, peelY, peelZ);
				
				// Rotate to be vertical with slight lean toward glass edge
				orangeSlice.rotation.x = 0;  // Upright
				orangeSlice.rotation.y = -Math.PI * 0.3;  // Angled view
				orangeSlice.rotation.z = Math.PI * 0.12;  // Slight lean against glass
				
				orangeSlice.renderOrder = 6;
				orangeSlice.visible = orangeSliceVisible;
				scene.add(orangeSlice);

			}

			function updateOrangeSliceAnimation(time) {

				if (!orangeSlice || !orangeSliceVisible) return;

				// Very subtle movement - peel is resting against inner glass wall
				const gentleSway = Math.sin(time * 0.4) * 0.005;
				const subtleBob = Math.sin(time * 0.6) * 0.008;

				// Base position with subtle animation
				const peelX = 0.45;
				const peelZ = 0.3;
				const peelY = LIQUID_SURFACE_Y - 0.5;
				
				orangeSlice.position.x = peelX + gentleSway;
				orangeSlice.position.y = peelY + subtleBob;
				orangeSlice.position.z = peelZ + gentleSway * 0.3;

				// Very subtle rotation sway
				orangeSlice.rotation.z = Math.PI * 0.12 + Math.sin(time * 0.3) * 0.015;

			}

		function toggleOrangeSlice(visible) {

			orangeSliceVisible = visible;

			if (orangeSlice) {

				orangeSlice.visible = visible;

			}

		}

		// Load cube.glb model
		function loadCubeModel() {

			const dracoLoader = new DRACOLoader();
			dracoLoader.setDecoderPath('jsm/libs/draco/gltf/');

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

			// Create glass material GUI controls now that material is available
			if (gui && glassModelMaterial) {
				createGlassGUI(gui);
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

		// Load floor-01.glb model
		function loadFloorModel() {

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


			// Bubble system
			function initBubbleSystem() {

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

			function spawnBubble() {

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

			function updateBubbles(deltaTime) {

				const spawnRate = (window.fizzIntensityRef ? window.fizzIntensityRef.value : fizzIntensity) * 30;
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

					if (bubble.life > bubble.maxLife || bubble.position.y > LIQUID_SURFACE_Y) {

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

		// Create floor GUI controls
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

		function init() {
			// Initialize scene, renderer, camera
			const sceneSetup = initScene();
			renderer = sceneSetup.renderer;
			scene = sceneSetup.scene;
			camera = sceneSetup.camera;

			// Setup lights from config file
			lights = setupLights(scene);
			// console.log('Lights configured from lights-config.js');

			// Default floor removed - using floor-01.glb model instead

				buildLiquid(scene, fizzIntensity);
				initBubbleSystem();

				// Spawn initial ice
				for (let i = 0; i < iceConfig.quantity; i++) {

					spawnIce();

				}

			// Spawn orange slice
			spawnOrangeSlice();
			
			// Create ice cube material GUI controls after ice cubes are spawned
			if (gui && iceObjects.length > 0) {
				createIceCubeGUI(gui);
			}

			// Load cube model
			loadCubeModel();

			// Load floor model
			loadFloorModel();

			// Load ice cube GLB model
			loadIceCubeGLB();

			// Setup camera controls
			controls = setupCameraControls(camera, renderer);

			// Create raycaster before initializing hotspots
			raycaster = new THREE.Raycaster();
			
			// Initialize hotspots
			initHotspots(scene, camera, renderer, raycaster, mouse);

			renderer.domElement.addEventListener('pointermove', onPointerMove);
			renderer.domElement.addEventListener('pointerdown', onPointerDown);

				// Setup window resize handler
				setupResizeHandler(camera, renderer);

			// Setup TransformControls for dragging lights
			transformControls = new TransformControls(camera, renderer.domElement);
			transformControls.addEventListener('dragging-changed', (event) => {
				controls.enabled = !event.value; // Disable orbit controls while dragging
			});
			scene.add(transformControls);

			// Setup controls (after transformControls is created)
			// Wrap fizzIntensity and orangeSliceVisible in objects for pass-by-reference
			const fizzIntensityRef = { value: fizzIntensity };
			const orangeSliceVisibleRef = { value: orangeSliceVisible };
			
			setupControls(fizzIntensityRef, getLiquidUniforms(), orangeSliceVisibleRef, toggleOrangeSlice);
			setupPanelControls(transformControls, lights);
			
			// Store refs for use in other functions
			window.fizzIntensityRef = fizzIntensityRef;
			window.orangeSliceVisibleRef = orangeSliceVisibleRef;

			// Setup GUI for light controls
			gui = new GUI({ width: 320 });
			gui.close(); // Start collapsed
			
			// Add floor controls
			createFloorGUI(gui);
			
			// Glass material controls will be added after model loads
			// (createGlassGUI is called in loadCubeModel callback)
			
			// Add liquid material controls (liquid is already built)
			const liquidMeshes = getLiquidMeshes();
			if (liquidMeshes && liquidMeshes.surface && liquidMeshes.body) {
				createLiquidGUI(gui);
			}
			
			// Add light controls
			createLightGUI(gui, lights, scene, transformControls);

			renderer.setAnimationLoop(animate);

			}

		// Toggle light helpers visibility (call from console: toggleLightHelpers())
		window.toggleLightHelpers = function() {
			if (lights && lights.helpers && lights.helpers.length > 0) {
				const currentVisibility = lights.helpers[0].visible;
				toggleHelpers(lights, !currentVisibility);
			} else {
				// console.log('No light helpers available');
			}
		};



			function onPointerMove(event) {

				setMouseFromEvent(event);
				checkHotspotHover();

			}

			function onPointerDown(event) {

				setMouseFromEvent(event);

				// Check hotspot click first
				if (checkHotspotClick()) return;

				// Trigger ripple on liquid surface
				triggerRipple(raycaster, mouse, camera);

			}

			function setMouseFromEvent(event) {

				const rect = renderer.domElement.getBoundingClientRect();
				mouse.set(
					((event.clientX - rect.left) / rect.width) * 2 - 1,
					-((event.clientY - rect.top) / rect.height) * 2 + 1
				);

			}


			function animate() {

				const deltaTime = 1 / 60;
				elapsedTime += deltaTime;

				// Update liquid animation
				updateLiquidAnimation(deltaTime);

			// Update animations
			updateBubbles(deltaTime);
			updateIceAnimation(elapsedTime);
			updateOrangeSliceAnimation(elapsedTime);
			updateHotspots(elapsedTime);

			// Update light helpers
			if (lights) {
				updateLightHelpers(lights);
			}

			controls.update();
			renderer.render(scene, camera);

			}

			function onWindowResize() {

				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize(window.innerWidth, window.innerHeight);

			}
