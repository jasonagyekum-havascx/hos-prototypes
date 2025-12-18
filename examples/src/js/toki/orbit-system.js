// Orbit System - handles orbiting ingredient elements around the drink
// Ingredients: Honey (fluid shader), Thyme, Citrus Peel, Basil, Green Apple, Vanilla, Oak

import * as THREE from '../../../../build/three.module.js';

// ============================================================================
// ORBIT CONFIGURATION
// ============================================================================

// Orbit rings at different radii and heights
const orbitRings = [
	{ radius: 1.8, height: 1.8, speed: 0.4 },   // Ring 1 - Inner (Honey, Citrus)
	{ radius: 2.4, height: 2.2, speed: 0.3 },   // Ring 2 - Middle (Thyme, Green Apple)
	{ radius: 3.0, height: 1.5, speed: 0.25 },  // Ring 3 - Outer (Basil, Vanilla, Oak)
];

// Master orbit configuration (mutable for GUI)
const orbitConfig = {
	enabled: false,  // Disabled by default - enable via GUI
	globalSpeed: 1.0,
	globalRadiusMultiplier: 1.0,
	globalScaleMultiplier: 7.0,  // Default scale for ingredients (except honey)
	honeyWobbleIntensity: 0.15,
	honeyWobbleSpeed: 1.5,
};

// Individual ingredient configurations
const ingredientConfigs = {
	honey: {
		name: 'Honey',
		visible: true,
		ring: 0,
		phaseOffset: 0,
		scale: 0.25,
		heightOffset: 0.3,
		color: 0xD4A017,
	},
	thyme: {
		name: 'Thyme',
		visible: true,
		ring: 1,
		phaseOffset: Math.PI * 0.5,
		scale: 0.15,
		heightOffset: 0.1,
		color: 0x2E5D2E,
	},
	citrusPeel: {
		name: 'Citrus Peel',
		visible: true,
		ring: 0,
		phaseOffset: Math.PI,
		scale: 0.18,
		heightOffset: -0.2,
		color: 0xFF8C00,
	},
	basil: {
		name: 'Basil',
		visible: true,
		ring: 2,
		phaseOffset: 0,
		scale: 0.2,
		heightOffset: 0.2,
		color: 0x228B22,
	},
	greenApple: {
		name: 'Green Apple',
		visible: true,
		ring: 1,
		phaseOffset: Math.PI * 1.5,
		scale: 0.22,
		heightOffset: -0.1,
		color: 0x7CBA3D,
	},
	vanilla: {
		name: 'Vanilla',
		visible: true,
		ring: 2,
		phaseOffset: Math.PI * 0.7,
		scale: 0.12,
		heightOffset: 0,
		color: 0x8B4513,
	},
	oak: {
		name: 'Oak',
		visible: true,
		ring: 2,
		phaseOffset: Math.PI * 1.4,
		scale: 0.18,
		heightOffset: -0.3,
		color: 0x5D4037,
	},
};

// ============================================================================
// STATE
// ============================================================================

let orbitGroup = null;
const ingredients = {};
let honeyMaterial = null;

// ============================================================================
// HONEY WOBBLE SHADER
// ============================================================================

// Simplex noise function for GLSL (embedded in shader)
const simplexNoiseGLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
	const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
	const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
	
	vec3 i = floor(v + dot(v, C.yyy));
	vec3 x0 = v - i + dot(i, C.xxx);
	
	vec3 g = step(x0.yzx, x0.xyz);
	vec3 l = 1.0 - g;
	vec3 i1 = min(g.xyz, l.zxy);
	vec3 i2 = max(g.xyz, l.zxy);
	
	vec3 x1 = x0 - i1 + C.xxx;
	vec3 x2 = x0 - i2 + C.yyy;
	vec3 x3 = x0 - D.yyy;
	
	i = mod289(i);
	vec4 p = permute(permute(permute(
		i.z + vec4(0.0, i1.z, i2.z, 1.0))
		+ i.y + vec4(0.0, i1.y, i2.y, 1.0))
		+ i.x + vec4(0.0, i1.x, i2.x, 1.0));
	
	float n_ = 0.142857142857;
	vec3 ns = n_ * D.wyz - D.xzx;
	
	vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
	
	vec4 x_ = floor(j * ns.z);
	vec4 y_ = floor(j - 7.0 * x_);
	
	vec4 x = x_ * ns.x + ns.yyyy;
	vec4 y = y_ * ns.x + ns.yyyy;
	vec4 h = 1.0 - abs(x) - abs(y);
	
	vec4 b0 = vec4(x.xy, y.xy);
	vec4 b1 = vec4(x.zw, y.zw);
	
	vec4 s0 = floor(b0) * 2.0 + 1.0;
	vec4 s1 = floor(b1) * 2.0 + 1.0;
	vec4 sh = -step(h, vec4(0.0));
	
	vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
	vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
	
	vec3 p0 = vec3(a0.xy, h.x);
	vec3 p1 = vec3(a0.zw, h.y);
	vec3 p2 = vec3(a1.xy, h.z);
	vec3 p3 = vec3(a1.zw, h.w);
	
	vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
	p0 *= norm.x;
	p1 *= norm.y;
	p2 *= norm.z;
	p3 *= norm.w;
	
	vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
	m = m * m;
	return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

const honeyVertexShader = `
${simplexNoiseGLSL}

uniform float uTime;
uniform float uWobbleIntensity;
uniform float uWobbleSpeed;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
	vUv = uv;
	vNormal = normalize(normalMatrix * normal);
	
	vec3 pos = position;
	
	// Apply organic wobble using layered noise
	float noise1 = snoise(pos * 2.0 + uTime * uWobbleSpeed * 0.5);
	float noise2 = snoise(pos * 4.0 - uTime * uWobbleSpeed * 0.3);
	float combinedNoise = noise1 * 0.7 + noise2 * 0.3;
	
	// Displace along normal for organic bulging effect
	pos += normal * combinedNoise * uWobbleIntensity;
	
	vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
	vViewPosition = -mvPosition.xyz;
	
	gl_Position = projectionMatrix * mvPosition;
}
`;

const honeyFragmentShader = `
uniform vec3 uColor;
uniform vec3 uDeepColor;
uniform float uOpacity;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

void main() {
	// Calculate view-dependent fresnel for rim lighting
	vec3 viewDir = normalize(vViewPosition);
	float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.0);
	
	// Blend between deep and surface color based on fresnel
	vec3 color = mix(uDeepColor, uColor, fresnel * 0.6 + 0.4);
	
	// Add subtle internal glow variation
	float glow = sin(vUv.y * 10.0 + uTime * 0.5) * 0.1 + 0.9;
	color *= glow;
	
	// Rim highlight
	color += vec3(1.0, 0.9, 0.7) * fresnel * 0.3;
	
	gl_FragColor = vec4(color, uOpacity * (0.85 + fresnel * 0.15));
}
`;

// ============================================================================
// INGREDIENT MESH CREATORS (Placeholder geometries - easily swappable)
// ============================================================================

/**
 * Create honey mesh with fluid wobble shader
 * @returns {THREE.Mesh} Honey swirl mesh with custom shader
 */
const createHoneyMesh = () => {
	const config = ingredientConfigs.honey;
	
	// TorusKnot for organic swirl shape
	const geometry = new THREE.TorusKnotGeometry(0.4, 0.15, 100, 16, 2, 3);
	
	honeyMaterial = new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 },
			uWobbleIntensity: { value: orbitConfig.honeyWobbleIntensity },
			uWobbleSpeed: { value: orbitConfig.honeyWobbleSpeed },
			uColor: { value: new THREE.Color(config.color) },
			uDeepColor: { value: new THREE.Color(0x8B6914) },
			uOpacity: { value: 0.9 },
		},
		vertexShader: honeyVertexShader,
		fragmentShader: honeyFragmentShader,
		transparent: true,
		side: THREE.DoubleSide,
	});
	
	const mesh = new THREE.Mesh(geometry, honeyMaterial);
	mesh.scale.setScalar(config.scale);
	mesh.name = 'honey';
	
	return mesh;
};

/**
 * Create thyme mesh (cluster of small cylinders)
 * @returns {THREE.Group} Thyme sprig placeholder
 */
const createThymeMesh = () => {
	const config = ingredientConfigs.thyme;
	const group = new THREE.Group();
	
	const material = new THREE.MeshStandardMaterial({
		color: config.color,
		roughness: 0.7,
		metalness: 0.0,
	});
	
	// Create stem
	const stemGeometry = new THREE.CylinderGeometry(0.02, 0.015, 0.8, 8);
	const stem = new THREE.Mesh(stemGeometry, material);
	stem.rotation.z = Math.PI * 0.1;
	group.add(stem);
	
	// Create small leaf pairs along stem
	const leafGeometry = new THREE.SphereGeometry(0.04, 8, 6);
	leafGeometry.scale(1, 0.3, 0.6);
	
	for (let i = 0; i < 6; i++) {
		const t = (i / 5) - 0.5;
		const leafLeft = new THREE.Mesh(leafGeometry, material);
		const leafRight = new THREE.Mesh(leafGeometry, material);
		
		leafLeft.position.set(-0.05, t * 0.7, 0);
		leafRight.position.set(0.05, t * 0.7, 0);
		
		leafLeft.rotation.z = -0.3;
		leafRight.rotation.z = 0.3;
		
		group.add(leafLeft, leafRight);
	}
	
	group.scale.setScalar(config.scale);
	group.name = 'thyme';
	
	return group;
};

/**
 * Create citrus peel mesh (curved tube)
 * @returns {THREE.Mesh} Citrus peel placeholder
 */
const createCitrusPeelMesh = () => {
	const config = ingredientConfigs.citrusPeel;
	
	// Create curved path for peel
	const curve = new THREE.CatmullRomCurve3([
		new THREE.Vector3(-0.3, 0, 0),
		new THREE.Vector3(-0.1, 0.15, 0.1),
		new THREE.Vector3(0.1, 0.2, 0),
		new THREE.Vector3(0.3, 0.1, -0.05),
	]);
	
	const geometry = new THREE.TubeGeometry(curve, 20, 0.06, 8, false);
	
	const material = new THREE.MeshStandardMaterial({
		color: config.color,
		roughness: 0.5,
		metalness: 0.05,
		side: THREE.DoubleSide,
	});
	
	const mesh = new THREE.Mesh(geometry, material);
	mesh.scale.setScalar(config.scale);
	mesh.name = 'citrusPeel';
	
	return mesh;
};

/**
 * Create basil mesh (flat leaf shape)
 * @returns {THREE.Group} Basil leaf placeholder
 */
const createBasilMesh = () => {
	const config = ingredientConfigs.basil;
	const group = new THREE.Group();
	
	const material = new THREE.MeshStandardMaterial({
		color: config.color,
		roughness: 0.6,
		metalness: 0.0,
		side: THREE.DoubleSide,
	});
	
	// Create leaf shape using scaled sphere
	const leafGeometry = new THREE.SphereGeometry(0.3, 16, 8);
	leafGeometry.scale(1, 0.08, 0.7);
	
	const leaf = new THREE.Mesh(leafGeometry, material);
	leaf.rotation.x = Math.PI * 0.1;
	group.add(leaf);
	
	// Add stem
	const stemGeometry = new THREE.CylinderGeometry(0.015, 0.02, 0.2, 6);
	const stemMaterial = new THREE.MeshStandardMaterial({
		color: 0x1B4D1B,
		roughness: 0.7,
	});
	const stem = new THREE.Mesh(stemGeometry, stemMaterial);
	stem.position.set(0, -0.1, 0.15);
	stem.rotation.x = Math.PI * 0.3;
	group.add(stem);
	
	group.scale.setScalar(config.scale);
	group.name = 'basil';
	
	return group;
};

/**
 * Create green apple mesh (sphere with indent)
 * @returns {THREE.Group} Green apple placeholder
 */
const createGreenAppleMesh = () => {
	const config = ingredientConfigs.greenApple;
	const group = new THREE.Group();
	
	const material = new THREE.MeshStandardMaterial({
		color: config.color,
		roughness: 0.4,
		metalness: 0.1,
	});
	
	// Main apple body
	const appleGeometry = new THREE.SphereGeometry(0.3, 32, 24);
	// Slightly flatten top and bottom for apple shape
	appleGeometry.scale(1, 0.85, 1);
	
	const apple = new THREE.Mesh(appleGeometry, material);
	group.add(apple);
	
	// Indent at top (dark spot)
	const indentGeometry = new THREE.SphereGeometry(0.08, 16, 8);
	const indentMaterial = new THREE.MeshStandardMaterial({
		color: 0x3D5D1D,
		roughness: 0.6,
	});
	const indent = new THREE.Mesh(indentGeometry, indentMaterial);
	indent.position.y = 0.22;
	indent.scale.y = 0.3;
	group.add(indent);
	
	// Stem
	const stemGeometry = new THREE.CylinderGeometry(0.015, 0.02, 0.12, 6);
	const stemMaterial = new THREE.MeshStandardMaterial({
		color: 0x4A3728,
		roughness: 0.8,
	});
	const stem = new THREE.Mesh(stemGeometry, stemMaterial);
	stem.position.y = 0.28;
	stem.rotation.z = 0.2;
	group.add(stem);
	
	group.scale.setScalar(config.scale);
	group.name = 'greenApple';
	
	return group;
};

/**
 * Create vanilla mesh (long pod)
 * @returns {THREE.Mesh} Vanilla pod placeholder
 */
const createVanillaMesh = () => {
	const config = ingredientConfigs.vanilla;
	
	// Long tapered cylinder for vanilla pod
	const geometry = new THREE.CylinderGeometry(0.025, 0.035, 1.0, 8);
	
	const material = new THREE.MeshStandardMaterial({
		color: config.color,
		roughness: 0.7,
		metalness: 0.0,
	});
	
	const mesh = new THREE.Mesh(geometry, material);
	mesh.rotation.z = Math.PI * 0.1;
	mesh.scale.setScalar(config.scale);
	mesh.name = 'vanilla';
	
	return mesh;
};

/**
 * Create oak mesh (bark chunk)
 * @returns {THREE.Mesh} Oak bark placeholder
 */
const createOakMesh = () => {
	const config = ingredientConfigs.oak;
	
	// Irregular box shape for bark chunk
	const geometry = new THREE.BoxGeometry(0.4, 0.25, 0.15);
	
	// Add some irregularity to vertices
	const positions = geometry.attributes.position;
	for (let i = 0; i < positions.count; i++) {
		positions.setX(i, positions.getX(i) + (Math.random() - 0.5) * 0.05);
		positions.setY(i, positions.getY(i) + (Math.random() - 0.5) * 0.05);
		positions.setZ(i, positions.getZ(i) + (Math.random() - 0.5) * 0.03);
	}
	geometry.computeVertexNormals();
	
	const material = new THREE.MeshStandardMaterial({
		color: config.color,
		roughness: 0.9,
		metalness: 0.0,
	});
	
	const mesh = new THREE.Mesh(geometry, material);
	mesh.scale.setScalar(config.scale);
	mesh.name = 'oak';
	
	return mesh;
};

// ============================================================================
// ORBIT SYSTEM INITIALIZATION & ANIMATION
// ============================================================================

/**
 * Initialize the orbit system and add all ingredients to the scene
 * @param {THREE.Scene} scene - The Three.js scene
 */
export const initOrbitSystem = (scene) => {
	orbitGroup = new THREE.Group();
	orbitGroup.name = 'orbitingIngredients';
	orbitGroup.visible = orbitConfig.enabled; // Hidden by default
	
	// Create all ingredient meshes
	const meshCreators = {
		honey: createHoneyMesh,
		thyme: createThymeMesh,
		citrusPeel: createCitrusPeelMesh,
		basil: createBasilMesh,
		greenApple: createGreenAppleMesh,
		vanilla: createVanillaMesh,
		oak: createOakMesh,
	};
	
	Object.entries(meshCreators).forEach(([key, createMesh]) => {
		const mesh = createMesh();
		const config = ingredientConfigs[key];
		
		ingredients[key] = {
			mesh,
			config,
			angle: config.phaseOffset,
		};
		
		// Apply initial scale multiplier (except for honey)
		if (key !== 'honey') {
			const scaledSize = config.scale * orbitConfig.globalScaleMultiplier;
			mesh.scale.setScalar(scaledSize);
		}
		
		mesh.visible = config.visible;
		orbitGroup.add(mesh);
	});
	
	scene.add(orbitGroup);
};

/**
 * Update orbit animation each frame
 * @param {number} elapsedTime - Total elapsed time in seconds
 */
export const updateOrbitAnimation = (elapsedTime) => {
	if (!orbitGroup || !orbitConfig.enabled) return;
	
	const deltaAngle = 0.016; // Approximate frame time
	
	Object.entries(ingredients).forEach(([key, data]) => {
		const { mesh, config } = data;
		if (!mesh.visible) return;
		
		const ring = orbitRings[config.ring];
		const radius = ring.radius * orbitConfig.globalRadiusMultiplier;
		const speed = ring.speed * orbitConfig.globalSpeed;
		
		// Update angle
		data.angle += speed * deltaAngle;
		
		// Calculate position on orbit
		const x = Math.cos(data.angle) * radius;
		const z = Math.sin(data.angle) * radius;
		const y = ring.height + config.heightOffset;
		
		// Add gentle vertical bobbing
		const bob = Math.sin(elapsedTime * 1.5 + config.phaseOffset) * 0.08;
		
		mesh.position.set(x, y + bob, z);
		
		// Gentle rotation for visual interest
		mesh.rotation.y = data.angle * 0.5;
		mesh.rotation.x = Math.sin(elapsedTime * 0.8 + config.phaseOffset) * 0.15;
	});
	
	// Update honey shader uniforms
	if (honeyMaterial) {
		honeyMaterial.uniforms.uTime.value = elapsedTime;
		honeyMaterial.uniforms.uWobbleIntensity.value = orbitConfig.honeyWobbleIntensity;
		honeyMaterial.uniforms.uWobbleSpeed.value = orbitConfig.honeyWobbleSpeed;
	}
};

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Enable or disable the entire orbit system
 * @param {boolean} enabled
 */
export const setOrbitEnabled = (enabled) => {
	orbitConfig.enabled = enabled;
	if (orbitGroup) {
		orbitGroup.visible = enabled;
	}
};

/**
 * Set global orbit speed multiplier
 * @param {number} speed - Speed multiplier (0.1 - 3.0)
 */
export const setOrbitSpeed = (speed) => {
	orbitConfig.globalSpeed = speed;
};

/**
 * Set global radius multiplier
 * @param {number} multiplier - Radius multiplier (0.5 - 2.0)
 */
export const setOrbitRadius = (multiplier) => {
	orbitConfig.globalRadiusMultiplier = multiplier;
};

/**
 * Set global scale multiplier for all ingredients (except honey)
 * @param {number} multiplier - Scale multiplier (0.5 - 10.0)
 */
export const setOrbitScale = (multiplier) => {
	orbitConfig.globalScaleMultiplier = multiplier;
	
	// Apply scale to all ingredients immediately (except honey which has its own scale)
	Object.entries(ingredients).forEach(([key, data]) => {
		if (key === 'honey') return; // Skip honey - it has its own fixed scale
		const baseScale = ingredientConfigs[key].scale;
		const newScale = baseScale * multiplier;
		data.mesh.scale.setScalar(newScale);
	});
};

/**
 * Set visibility for a specific ingredient
 * @param {string} name - Ingredient key (honey, thyme, etc.)
 * @param {boolean} visible
 */
export const setIngredientVisible = (name, visible) => {
	if (ingredients[name]) {
		ingredients[name].mesh.visible = visible;
		ingredientConfigs[name].visible = visible;
	}
};

/**
 * Set honey wobble intensity
 * @param {number} intensity
 */
export const setHoneyWobbleIntensity = (intensity) => {
	orbitConfig.honeyWobbleIntensity = intensity;
};

/**
 * Set honey wobble speed
 * @param {number} speed
 */
export const setHoneyWobbleSpeed = (speed) => {
	orbitConfig.honeyWobbleSpeed = speed;
};

/**
 * Get the orbit configuration object (for GUI binding)
 * @returns {Object} orbitConfig
 */
export const getOrbitConfig = () => orbitConfig;

/**
 * Get ingredient configurations (for GUI binding)
 * @returns {Object} ingredientConfigs
 */
export const getIngredientConfigs = () => ingredientConfigs;

/**
 * Get ingredients map (for external access)
 * @returns {Object} ingredients
 */
export const getIngredients = () => ingredients;

