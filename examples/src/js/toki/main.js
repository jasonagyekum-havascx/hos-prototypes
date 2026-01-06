import * as THREE from 'three';
		import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
		import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
		import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { setupLights, createLightGUI } from './lights-config.js';
import { initScene, setupCameraControls, setupResizeHandler } from './scene-setup.js';
import { setupPanelControls } from './controls.js';
import { initHotspots, updateHotspots, checkHotspotHover, checkHotspotClick, closePanel, getActivePanel, getHotspotOverlay, getHotspots } from './hotspots.js';
import { buildLiquid, updateLiquidAnimation, triggerRipple, getLiquidMeshes, getLiquidUniforms, animateLiquidHeight, setLiquidTilt } from './liquid-system.js';
import { spawnIce, updateIceAnimation, loadIceCubeGLB, getIceObjects, animateIceDown, stopIceAnimation, setIceParentGroup } from './ice-system.js';
import { initBubbleSystem, updateBubbles, animateBubbleSurfaceHeight, getBubbleMesh } from './bubble-system.js';
import { createLiquidGUI, createIceCubeGUI, createGlassGUI, createGlassBottomGUI, createFloorGUI, createOrbitGUI, createDrinkSettingsGUI } from './gui.js';
import { loadFloorModel, getFloorModel } from './model-floor.js';
import { loadGlassModel, getGlassModelMaterial } from './model-glass.js';
import { loadGlassBottomModel, getGlassBottomModelMaterial } from './model-glass-bottom.js';
import { iceConfig, fizzIntensity } from './constants.js';
import { initOrbitSystem, updateOrbitAnimation, getIngredients } from './orbit-system.js';
import { spawnOrangePeel, updateOrangePeelAnimation, getOrangePeel } from './orange-peel.js';
import { initDeviceMotion } from './device-motion.js';
import { initARSystem, startARSession, endARSession, handleARPlacement, isARSessionActive } from './ar-system.js';
import { getCubeModel } from './model-glass.js';

		let renderer, scene, camera, controls;
let lights;
		let gui; // GUI panel
			let raycaster;
			const mouse = new THREE.Vector2();

			// Time tracking
			let elapsedTime = 0;

// Fizz intensity reference (shared with GUI)
let fizzIntensityRef = { value: fizzIntensity };

// Drink group for AR placement
let drinkGroup = null;

			init();

function init() {
	// Initialize scene, renderer, camera
	const sceneSetup = initScene();
	renderer = sceneSetup.renderer;
	scene = sceneSetup.scene;
	camera = sceneSetup.camera;

	// Create drink group for AR placement
	drinkGroup = new THREE.Group();
	drinkGroup.name = 'drinkGroup';
	scene.add(drinkGroup);

	// Setup lights from config file
	lights = setupLights(scene);

	// Build liquid and bubbles
	buildLiquid(scene, fizzIntensity);
	initBubbleSystem(scene);
	
	// Move liquid and bubbles to drink group
	const liquidMeshes = getLiquidMeshes();
	if (liquidMeshes) {
		if (liquidMeshes.surface && liquidMeshes.surface.parent === scene) {
			scene.remove(liquidMeshes.surface);
			drinkGroup.add(liquidMeshes.surface);
		}
		if (liquidMeshes.body && liquidMeshes.body.parent === scene) {
			scene.remove(liquidMeshes.body);
			drinkGroup.add(liquidMeshes.body);
		}
		if (liquidMeshes.bottom && liquidMeshes.bottom.parent === scene) {
			scene.remove(liquidMeshes.bottom);
			drinkGroup.add(liquidMeshes.bottom);
		}
	}
	
	// Move bubble mesh to drink group
	const bubbleMesh = getBubbleMesh();
	if (bubbleMesh && bubbleMesh.parent === scene) {
		scene.remove(bubbleMesh);
		drinkGroup.add(bubbleMesh);
	}

	// Spawn orange peel
	spawnOrangePeel(scene);
	
	// Move orange peel to drink group
	const orangePeel = getOrangePeel();
	if (orangePeel && orangePeel.parent === scene) {
		scene.remove(orangePeel);
		drinkGroup.add(orangePeel);
	}

	// Load glass model
	loadGlassModel(scene, (glassMaterial) => {
		// Move glass to drink group
		const glassModel = getCubeModel();
		if (glassModel && glassModel.parent) {
			drinkGroup.add(glassModel.parent);
		}
		
		// Create glass GUI after model loads, if gui is already created
		if (gui && glassMaterial) {
				createGlassGUI(gui);
		}
	});

	// Load glass bottom model
	loadGlassBottomModel(scene, (glassBottomMaterial) => {
		// Create glass bottom GUI after model loads, if gui is already created
		if (gui && glassBottomMaterial) {
			createGlassBottomGUI(gui);
		}
	});

	// Load floor model
	loadFloorModel(scene, (floorModel) => {
		// Create floor GUI after model loads, if gui is already created
		if (gui && floorModel) {
			createFloorGUI(gui);
		}
	});

	// Initialize orbiting ingredients system
	initOrbitSystem(scene);
	
	// Move orbit group to drink group
	const orbitGroup = scene.getObjectByName('orbitingIngredients');
	if (orbitGroup && orbitGroup.parent === scene) {
		scene.remove(orbitGroup);
		drinkGroup.add(orbitGroup);
	}

	// Setup camera controls
	controls = setupCameraControls(camera, renderer);

	// Create raycaster before initializing hotspots
	raycaster = new THREE.Raycaster();
	
	// Track hotspot interactions for liquid animation
	let hotspotInteractionCount = 0;
	const hotspotTargets = [0.75, 0.50, 0.25, 0.05];
	let hasAnimatedIceDown = false;
	
	// Callback when a panel is closed
	function onHotspotPanelClose() {
		// Wait 0.5 seconds, then trigger animation
		setTimeout(() => {
			if (hotspotInteractionCount < hotspotTargets.length) {
				const targetScale = hotspotTargets[hotspotInteractionCount];
				animateLiquidHeight(targetScale);
				
				// Animate bubbles/carbonation surface down to match liquid
				animateBubbleSurfaceHeight(targetScale);
				
				// Animate ice cubes down on the first panel close only
				if (!hasAnimatedIceDown && hotspotInteractionCount === 0) {
					animateIceDown(0.4, 1.0); // Move down by 0.4 units over 1 second
					hasAnimatedIceDown = true;
				}
				
				hotspotInteractionCount++;
			}
		}, 500);
	}
	
	// Initialize hotspots with callback
	initHotspots(scene, camera, renderer, raycaster, mouse, onHotspotPanelClose);
	
	// Move hotspots to drink group after they're created
	// Use getHotspots() to access hotspots directly instead of traversing scene
	setTimeout(() => {
		if (!scene || !drinkGroup) {
			console.warn('Scene or drinkGroup not available for hotspot grouping');
			return;
		}
		try {
			const hotspotGroups = getHotspots();
			if (hotspotGroups && hotspotGroups.length > 0) {
				hotspotGroups.forEach(hotspot => {
					if (hotspot && hotspot.parent === scene) {
						scene.remove(hotspot);
						drinkGroup.add(hotspot);
					}
				});
			}
		} catch (error) {
			console.warn('Error moving hotspots to drink group:', error);
		}
	}, 200);

				renderer.domElement.addEventListener('pointermove', onPointerMove);
				renderer.domElement.addEventListener('pointerdown', onPointerDown);

	// Setup window resize handler
	setupResizeHandler(camera, renderer);

	// Setup panel controls (for hotspot panels)
			setupPanelControls();

	// Store fizzIntensityRef globally for bubble system
	window.fizzIntensityRef = fizzIntensityRef;

	// Setup GUI
			gui = new GUI({ width: 320 });
	
	// Add drink settings first (carbonation + orange peel) - this one stays open
	createDrinkSettingsGUI(gui, fizzIntensityRef);
	
	// Add floor controls (if model has already loaded)
	const floorModel = getFloorModel();
	if (floorModel) {
		createFloorGUI(gui);
	}
	
	// Add glass material controls (if model has already loaded)
	const glassMaterial = getGlassModelMaterial();
	if (glassMaterial) {
		createGlassGUI(gui);
	}
	
	// Add glass bottom material controls (if model has already loaded)
	const glassBottomMaterial = getGlassBottomModelMaterial();
	if (glassBottomMaterial) {
		createGlassBottomGUI(gui);
	}
	
	// Add liquid material controls (liquid is already built)
	const liquidMeshesForGUI = getLiquidMeshes();
	if (liquidMeshesForGUI && liquidMeshesForGUI.surface && liquidMeshesForGUI.body) {
		createLiquidGUI(gui);
	}
	
	// Add light controls
	createLightGUI(gui, lights, scene);
	
	// Add orbiting ingredients controls
	createOrbitGUI(gui);

	// Set ice parent group to drink group (so new ice cubes go to drink group)
	setIceParentGroup(drinkGroup);
	
	// Load ice cube GLB model (after GUI is created so it can add controls)
	loadIceCubeGLB(scene, gui, createIceCubeGUI);
	
	// Move existing ice cubes to drink group if any were spawned before setting parent
	setTimeout(() => {
		const iceObjects = getIceObjects();
		if (iceObjects) {
			iceObjects.forEach(iceData => {
				if (iceData.mesh && iceData.mesh.parent === scene) {
					scene.remove(iceData.mesh);
					drinkGroup.add(iceData.mesh);
				}
			});
		}
	}, 500);

	// Hide GUI by default
	gui.hide();

	// Initialize device motion for mobile tilt-based liquid sloshing
	initDeviceMotion((tiltX, tiltZ) => {
		setLiquidTilt(tiltX, tiltZ);
	});

	// Initialize AR system
	initARSystem(renderer, scene, camera, drinkGroup, controls);
	
	// Export AR functions to window for external access
	window.startARSession = startARSession;
	window.endARSession = endARSession;

	renderer.setAnimationLoop(animate);
			}

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
	const currentFizzIntensity = window.fizzIntensityRef ? window.fizzIntensityRef.value : fizzIntensity;
	updateBubbles(deltaTime, currentFizzIntensity);
			updateIceAnimation(elapsedTime);
	updateOrangePeelAnimation(elapsedTime);
	updateOrbitAnimation(elapsedTime);
			updateHotspots(elapsedTime);

			controls.update();
			renderer.render(scene, camera);
			}
