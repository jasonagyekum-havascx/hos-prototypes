// Scene Setup - handles renderer, camera, scene initialization, and environment map

import * as THREE from '../../../../build/three.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// Initialize scene, renderer, and camera
export function initScene() {
	const renderer = new THREE.WebGLRenderer({ 
		antialias: true,
		alpha: true // Enable alpha for AR camera passthrough
	});
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.1;
	
	// Enable XR support
	renderer.xr.enabled = true;
	
	document.body.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	
	// Load background image
	const textureLoader = new THREE.TextureLoader();
	textureLoader.load('../../images/mr-background.jpg', (bgTexture) => {
		bgTexture.colorSpace = THREE.SRGBColorSpace;
		scene.background = bgTexture;
	}, undefined, (error) => {
		console.error('Error loading background image:', error);
		scene.background = new THREE.Color(0x0a0a0a); // Fallback to dark color
	});

	// Load HDR environment map
	const pmremGenerator = new THREE.PMREMGenerator(renderer);
	pmremGenerator.compileEquirectangularShader();

	const rgbeLoader = new RGBELoader();
	rgbeLoader.setPath('./textures/');
	rgbeLoader.load('hdr_500.hdr', (texture) => {
		const envMap = pmremGenerator.fromEquirectangular(texture).texture;
		scene.environment = envMap; // Use HDR for reflections only
		// Background is now handled by the image texture loaded above
		
		texture.dispose();
		pmremGenerator.dispose();
		
		// console.log('HDR environment map loaded: hdr_500.hdr (reflections only)');
	}, undefined, (error) => {
		console.error('Error loading HDR environment map:', error);
		
		// Fallback to simple environment for reflections if HDR fails
		const envScene = new THREE.Scene();
		envScene.background = new THREE.Color(0xaaddff);
		const envGeo = new THREE.SphereGeometry(50, 32, 32);
		const envMat = new THREE.MeshBasicMaterial({
			color: 0xeef6ff,
			side: THREE.BackSide,
		});
		const envMesh = new THREE.Mesh(envGeo, envMat);
		envScene.add(envMesh);
		const envMap = pmremGenerator.fromScene(envScene).texture;
		scene.environment = envMap; // Only set environment for reflections, keep image background
		pmremGenerator.dispose();
	});

	const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
	// Start zoomed out to max distance
	camera.position.set(0, 3.5, 8);
	camera.lookAt(0, 1.2, 0);

	return { renderer, scene, camera };
}

// Setup camera controls
export function setupCameraControls(camera, renderer) {
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.target.set(0, 1.2, 0);
	
	// Disable zoom - lock the scale
	controls.enableZoom = false;
	
	// Limit polar angle to prevent top-down view
	// minPolarAngle = ~25° from vertical (prevents looking straight down)
	// maxPolarAngle = ~85° (slightly above horizontal, prevents viewing from below)
	controls.minPolarAngle = Math.PI / 7;  // ~25 degrees from top
	controls.maxPolarAngle = Math.PI / 2.1; // ~85 degrees (just above horizontal)
	
	return controls;
}

// Window resize handler
export function setupResizeHandler(camera, renderer) {
	function onWindowResize() {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
	}

	window.addEventListener('resize', onWindowResize);
	return onWindowResize;
}

