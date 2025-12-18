import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { setupLights, createLightGUI } from './lights-config.js';
import { initScene, setupCameraControls, setupResizeHandler } from './scene-setup.js';
import { setupPanelControls } from './controls.js';
import { initHotspots, updateHotspots, checkHotspotHover, checkHotspotClick, closePanel, getActivePanel, getHotspotOverlay } from './hotspots.js';
import { buildLiquid, updateLiquidAnimation, triggerRipple, getLiquidMeshes, getLiquidUniforms, animateLiquidHeight } from './liquid-system.js';
import { spawnIce, updateIceAnimation, loadIceCubeGLB, getIceObjects, animateIceDown, stopIceAnimation } from './ice-system.js';
import { initBubbleSystem, updateBubbles } from './bubble-system.js';
import { createLiquidGUI, createIceCubeGUI, createGlassGUI, createOrbitGUI, createDrinkSettingsGUI } from './gui.js';
import { loadFloorModel } from './model-floor.js';
import { loadGlassModel, getGlassModelMaterial } from './model-glass.js';
import { iceConfig, fizzIntensity } from './constants.js';
import { initOrbitSystem, updateOrbitAnimation } from './orbit-system.js';
import { spawnOrangePeel, updateOrangePeelAnimation } from './orange-peel.js';

let renderer, scene, camera, controls;
let lights;
let gui; // GUI panel
let floor = null; // Floor mesh reference
let raycaster;
const mouse = new THREE.Vector2();

// Time tracking
let elapsedTime = 0;

// Fizz intensity reference (shared with GUI)
let fizzIntensityRef = { value: fizzIntensity };

init();

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

function init() {
	// Initialize scene, renderer, camera
	const sceneSetup = initScene();
	renderer = sceneSetup.renderer;
	scene = sceneSetup.scene;
	camera = sceneSetup.camera;

	// Setup lights from config file
	lights = setupLights(scene);

	// Build liquid and bubbles
	buildLiquid(scene, fizzIntensity);
	initBubbleSystem(scene);

	// Spawn orange peel
	spawnOrangePeel(scene);

	// Load glass model
	loadGlassModel(scene, (glassMaterial) => {
		// Create glass GUI after model loads, if gui is already created
		if (gui && glassMaterial) {
			createGlassGUI(gui);
		}
	});

	// Load floor model
	loadFloorModel(scene);

	// Initialize orbiting ingredients system
	initOrbitSystem(scene);

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
	
	// Add floor controls
	createFloorGUI(gui);
	
	// Add glass material controls (if model has already loaded)
	const glassMaterial = getGlassModelMaterial();
	if (glassMaterial) {
		createGlassGUI(gui);
	}
	
	// Add liquid material controls (liquid is already built)
	const liquidMeshes = getLiquidMeshes();
	if (liquidMeshes && liquidMeshes.surface && liquidMeshes.body) {
		createLiquidGUI(gui);
	}
	
	// Add light controls
	createLightGUI(gui, lights, scene);
	
	// Add orbiting ingredients controls
	createOrbitGUI(gui);

	// Load ice cube GLB model (after GUI is created so it can add controls)
	loadIceCubeGLB(scene, gui, createIceCubeGUI);

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
