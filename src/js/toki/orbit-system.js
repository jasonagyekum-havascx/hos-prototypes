// Orbit System - handles orbiting ingredient elements around the drink
// Ingredients: Citrus Peel (2 variants), Thyme (2 variants) - 2D flat sprites

import * as THREE from 'three';

// ============================================================================
// ORBIT CONFIGURATION
// ============================================================================

// Orbit rings at different radii and heights
const orbitRings = [
	{ radius: 1.0, height: 1.8, speed: 0.4 },   // Ring 1 - Inner
	{ radius: 1.3, height: 2.2, speed: 0.3 },   // Ring 2 - Middle
	{ radius: 1.6, height: 1.5, speed: 0.25 },  // Ring 3 - Outer
];

// Master orbit configuration (mutable for GUI)
const orbitConfig = {
	enabled: true,  // Enabled by default
	globalSpeed: 1.0,
	globalRadiusMultiplier: 1.0,
	globalScaleMultiplier: 1.5,  // Default scale for 2D sprites
};

// Fixed positions: North, East, South, West at different heights
const ingredientConfigs = {
	peel1: {
		name: 'Citrus Peel 1',
		visible: true,
		ring: 1,
		phaseOffset: 0,                    // North
		scale: 0.8,
		heightOffset: 0.4,                 // Highest
		imagePath: '../images/assets/peel.png',
	},
	thyme1: {
		name: 'Thyme 1',
		visible: true,
		ring: 1,
		phaseOffset: Math.PI * 0.5,        // East
		scale: 0.6,
		heightOffset: 0.1,                 // Mid-high
		imagePath: '../images/assets/thyme.png',
	},
	peel2: {
		name: 'Citrus Peel 2',
		visible: true,
		ring: 1,
		phaseOffset: Math.PI,              // South
		scale: 0.7,
		heightOffset: -0.15,               // Mid-low
		imagePath: '../images/assets/peel-2.png',
	},
	thyme2: {
		name: 'Thyme 2',
		visible: true,
		ring: 1,
		phaseOffset: Math.PI * 1.5,        // West
		scale: 0.65,
		heightOffset: -0.4,                // Lowest
		imagePath: '../images/assets/thyme-2.png',
	},
};

// ============================================================================
// STATE
// ============================================================================

let orbitGroup = null;
const ingredients = {};
const textureLoader = new THREE.TextureLoader();

// ============================================================================
// SPRITE CREATOR
// ============================================================================

/**
 * Create a 2D sprite from an image path
 * @param {string} imagePath - Path to the image
 * @param {number} scale - Base scale for the sprite
 * @param {string} name - Name for the sprite
 * @returns {THREE.Sprite} Sprite with loaded texture
 */
const createSprite = (imagePath, scale, name) => {
	const texture = textureLoader.load(imagePath);
	texture.colorSpace = THREE.SRGBColorSpace;
	
	const spriteMaterial = new THREE.SpriteMaterial({
		map: texture,
		transparent: true,
		opacity: 1,
		depthTest: true,
		depthWrite: false,
		side: THREE.DoubleSide,
	});
	
	const sprite = new THREE.Sprite(spriteMaterial);
	sprite.scale.set(scale, scale, 1);
	sprite.name = name;
	
	return sprite;
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
	
	// Create all ingredient sprites
	Object.entries(ingredientConfigs).forEach(([key, config]) => {
		const sprite = createSprite(
			config.imagePath,
			config.scale * orbitConfig.globalScaleMultiplier,
			key
		);
		
		ingredients[key] = {
			mesh: sprite,
			config,
			angle: config.phaseOffset,
		};
		
		sprite.visible = config.visible;
		orbitGroup.add(sprite);
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
		
		// Subtle scale pulse for visual interest
		const pulse = 1 + Math.sin(elapsedTime * 2 + config.phaseOffset) * 0.05;
		const baseScale = config.scale * orbitConfig.globalScaleMultiplier;
		mesh.scale.set(baseScale * pulse, baseScale * pulse, 1);
	});
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
 * Set global scale multiplier for all ingredients
 * @param {number} multiplier - Scale multiplier (0.5 - 5.0)
 */
export const setOrbitScale = (multiplier) => {
	orbitConfig.globalScaleMultiplier = multiplier;
	
	// Apply scale to all ingredients immediately
	Object.entries(ingredients).forEach(([key, data]) => {
		const baseScale = ingredientConfigs[key].scale;
		const newScale = baseScale * multiplier;
		data.mesh.scale.set(newScale, newScale, 1);
	});
};

/**
 * Set visibility for a specific ingredient
 * @param {string} name - Ingredient key (peel1, peel2, thyme1, thyme2)
 * @param {boolean} visible
 */
export const setIngredientVisible = (name, visible) => {
	if (ingredients[name]) {
		ingredients[name].mesh.visible = visible;
		ingredientConfigs[name].visible = visible;
	}
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
