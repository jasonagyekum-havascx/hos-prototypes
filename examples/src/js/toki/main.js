import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { setupLights, createLightGUI } from './lights-config.js';
import { initScene, setupCameraControls, setupResizeHandler } from './scene-setup.js';
import { setupPanelControls, setupControls } from './controls.js';
import { initHotspots, updateHotspots, checkHotspotHover, checkHotspotClick, closePanel, getActivePanel, getHotspotOverlay } from './hotspots.js';
import { buildLiquid, updateLiquidAnimation, triggerRipple, getLiquidMeshes, getLiquidUniforms, animateLiquidHeight } from './liquid-system.js';
import { spawnIce, updateIceAnimation, loadIceCubeGLB, getIceObjects } from './ice-system.js';
import { initBubbleSystem, updateBubbles } from './bubble-system.js';
import { createLiquidGUI, createIceCubeGUI, createGlassGUI, createOrbitGUI } from './gui.js';
import { loadFloorModel } from './model-floor.js';
import { loadGlassModel, getGlassModelMaterial } from './model-glass.js';
import { iceConfig, fizzIntensity } from './constants.js';
import { initOrbitSystem, updateOrbitAnimation } from './orbit-system.js';

let renderer, scene, camera, controls;
let lights;
let gui; // GUI panel
let floor = null; // Floor mesh reference
let raycaster;
const mouse = new THREE.Vector2();

// Orange slice
let orangeSlice;
let orangeSliceVisible = false;

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
	// console.log('Lights configured from lights-config.js');

	// Default floor removed - using floor-01.glb model instead
	buildLiquid(scene, fizzIntensity);
	initBubbleSystem(scene);

	// Spawn orange slice
	spawnOrangeSlice();

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
	
	// Callback when a panel is closed
	function onHotspotPanelClose() {
		// Wait 0.5 seconds, then trigger animation
		setTimeout(() => {
			if (hotspotInteractionCount < hotspotTargets.length) {
				const targetScale = hotspotTargets[hotspotInteractionCount];
				animateLiquidHeight(targetScale);
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

	// Setup controls
	// Wrap fizzIntensity and orangeSliceVisible in objects for pass-by-reference
	const fizzIntensityRef = { value: fizzIntensity };
	const orangeSliceVisibleRef = { value: orangeSliceVisible };
	
	setupControls(fizzIntensityRef, getLiquidUniforms(), orangeSliceVisibleRef, toggleOrangeSlice);
	setupPanelControls();
	
	// Store refs for use in other functions
	window.fizzIntensityRef = fizzIntensityRef;
	window.orangeSliceVisibleRef = orangeSliceVisibleRef;

	// Setup GUI for light controls
	gui = new GUI({ width: 320 });
	gui.close(); // Start collapsed
	
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
	updateOrangeSliceAnimation(elapsedTime);
	updateOrbitAnimation(elapsedTime);
	updateHotspots(elapsedTime);

	controls.update();
	renderer.render(scene, camera);
}