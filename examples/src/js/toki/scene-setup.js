// Scene Setup - handles renderer, camera, scene initialization, and environment map

import * as THREE from '../../../../build/three.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// Initialize scene, renderer, and camera
export function initScene() {
	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.1;
	document.body.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0a0a0a); // Pretty black (very dark gray)

	// Load HDR environment map
	const pmremGenerator = new THREE.PMREMGenerator(renderer);
	pmremGenerator.compileEquirectangularShader();

	const rgbeLoader = new RGBELoader();
	rgbeLoader.setPath('./textures/');
	rgbeLoader.load('hdr_500.hdr', (texture) => {
		const envMap = pmremGenerator.fromEquirectangular(texture).texture;
		scene.environment = envMap; // Use HDR for reflections only
		scene.background = new THREE.Color(0x0a0a0a); // Pretty black (very dark gray)
		
		texture.dispose();
		pmremGenerator.dispose();
		
		// console.log('HDR environment map loaded: hdr_500.hdr (reflections only)');
	}, undefined, (error) => {
		console.error('Error loading HDR environment map:', error);
		// console.log('Falling back to simple environment...');
		
		// Fallback to simple environment if HDR fails
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
		scene.environment = envMap;
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
	// Zoom constraints removed - can zoom freely
	// controls.minDistance = 2.5;
	// controls.maxDistance = 8;
	controls.minPolarAngle = 0; // Allow viewing from above
	controls.maxPolarAngle = Math.PI / 2; // Prevent viewing from below (horizontal is the limit)
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

