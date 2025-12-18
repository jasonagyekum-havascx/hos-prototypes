// lights-config.js
// Dynamic light configuration for Three.js scenes

import * as THREE from '../../../../build/three.module.js';

// console.log('hello from lights-config.js');


export const lightConfig = {
	// Ambient light - overall scene illumination
	ambient: {
		enabled: true,
		color: 0xffffff,
		intensity: 0,
	},

	// Hemisphere light - sky/ground gradient
	// hemisphere: {
	// 	enabled: true,
	// 	skyColor: 0x87CEEB,
	// 	groundColor: 0xffffff,
	// 	intensity: 0.8,
	// },

	// Directional lights (sun-like lights)
	directional: [
	{
		name: 'keyLight',
		enabled: true,
		color: 0xffffff,
		intensity: 1,
		position: { x: 5, y: -0.5, z: -2.2 },
		castShadow: false,
		helper: false,
		helperSize: 1,
	},
		// {
		// 	name: 'fillLight',
		// 	enabled: true,
		// 	color: 0xaaddff,
		// 	intensity: 1.2,
		// 	position: { x: -3, y: 3, z: -2 },
		// 	castShadow: false,
		// 	helper: false,
		// 	helperSize: 1,
		// },
		// {
		// 	name: 'rimLight',
		// 	enabled: true,
		// 	color: 0xffeedd,
		// 	intensity: 1.0,
		// 	position: { x: 0, y: 2, z: -4 },
		// 	castShadow: false,
		// 	helper: false,
		// 	helperSize: 1,
		// },
	],

	// Point lights (omni-directional)
	point: [
		// {
		// 	name: 'pointLight1',
		// 	enabled: true,
		// 	color: 0xffffff,
		// 	intensity: 1.0,
		// 	position: { x: 0, y: 3, z: 0 },
		// 	distance: 10,
		// 	decay: 2,
		// 	castShadow: false,
		// 	helper: true,
		// 	helperSize: 0.5,
		// },
	],

	// Spot lights (focused cone lights)
	spot: [
		// {
		// 	name: 'spotLight1',
		// 	enabled: true,
		// 	color: 0xffffff,
		// 	intensity: 1.0,
		// 	position: { x: 0, y: 5, z: 0 },
		// 	target: { x: 0, y: 0, z: 0 },
		// 	angle: Math.PI / 6,
		// 	penumbra: 0.3,
		// 	distance: 20,
		// 	decay: 2,
		// 	castShadow: false,
		// 	helper: true,
		// },
	],
};

// Function to create and add lights to a scene based on config
export function setupLights(scene, config = lightConfig) {
	const lights = {
		ambient: null,
		hemisphere: null,
		directional: [],
		point: [],
		spot: [],
		helpers: [],
	};

	// Ambient Light
	if (config.ambient?.enabled) {
		lights.ambient = new THREE.AmbientLight(
			config.ambient.color,
			config.ambient.intensity
		);
		scene.add(lights.ambient);
		// console.log('Added ambient light');
	}

	// Hemisphere Light
	if (config.hemisphere?.enabled) {
		lights.hemisphere = new THREE.HemisphereLight(
			config.hemisphere.skyColor,
			config.hemisphere.groundColor,
			config.hemisphere.intensity
		);
		scene.add(lights.hemisphere);
		// console.log('Added hemisphere light');
	}

	// Directional Lights
	config.directional?.forEach((lightConfig) => {
		if (!lightConfig.enabled) return;

		const light = new THREE.DirectionalLight(
			lightConfig.color,
			lightConfig.intensity
		);
		light.position.set(
			lightConfig.position.x,
			lightConfig.position.y,
			lightConfig.position.z
		);
		light.castShadow = lightConfig.castShadow || false;
		light.name = lightConfig.name;

		scene.add(light);
		lights.directional.push(light);

		// Add helper if enabled
		if (lightConfig.helper) {
			const helper = new THREE.DirectionalLightHelper(
				light,
				lightConfig.helperSize || 1
			);
			scene.add(helper);
			lights.helpers.push(helper);
		}

		// console.log(`Added directional light: ${lightConfig.name}`);
	});

	// Point Lights
	config.point?.forEach((lightConfig) => {
		if (!lightConfig.enabled) return;

		const light = new THREE.PointLight(
			lightConfig.color,
			lightConfig.intensity,
			lightConfig.distance,
			lightConfig.decay
		);
		light.position.set(
			lightConfig.position.x,
			lightConfig.position.y,
			lightConfig.position.z
		);
		light.castShadow = lightConfig.castShadow || false;
		light.name = lightConfig.name;

		scene.add(light);
		lights.point.push(light);

		// Add helper if enabled
		if (lightConfig.helper) {
			const helper = new THREE.PointLightHelper(
				light,
				lightConfig.helperSize || 0.5
			);
			scene.add(helper);
			lights.helpers.push(helper);
		}

		// console.log(`Added point light: ${lightConfig.name}`);
	});

	// Spot Lights
	config.spot?.forEach((lightConfig) => {
		if (!lightConfig.enabled) return;

		const light = new THREE.SpotLight(
			lightConfig.color,
			lightConfig.intensity,
			lightConfig.distance,
			lightConfig.angle,
			lightConfig.penumbra,
			lightConfig.decay
		);
		light.position.set(
			lightConfig.position.x,
			lightConfig.position.y,
			lightConfig.position.z
		);

		if (lightConfig.target) {
			light.target.position.set(
				lightConfig.target.x,
				lightConfig.target.y,
				lightConfig.target.z
			);
			scene.add(light.target);
		}

		light.castShadow = lightConfig.castShadow || false;
		light.name = lightConfig.name;

		scene.add(light);
		lights.spot.push(light);

		// Add helper if enabled
		if (lightConfig.helper) {
			const helper = new THREE.SpotLightHelper(light);
			scene.add(helper);
			lights.helpers.push(helper);
		}

		// console.log(`Added spot light: ${lightConfig.name}`);
	});

	return lights;
}

// Function to update light helpers (call in animation loop if lights move)
export function updateLightHelpers(lights) {
	if (lights.helpers) {
		lights.helpers.forEach((helper) => {
			if (helper.update) {
				helper.update();
			}
		});
	}
}

// Function to toggle all helpers visibility
export function toggleHelpers(lights, visible) {
	if (lights.helpers) {
		lights.helpers.forEach((helper) => {
			helper.visible = visible;
		});
	}
	// console.log('Light helpers', visible ? 'visible' : 'hidden');
}

// Create GUI panel for light controls
export function createLightGUI(gui, lights, scene) {
	if (!gui || !lights) return;

	// Directional Lights
	if (lights.directional && lights.directional.length > 0) {
		const dirFolder = gui.addFolder('Directional Lights');
		
		lights.directional.forEach((light, index) => {
			const lightFolder = dirFolder.addFolder(light.name || `Light ${index}`);
			
			// Visible toggle - bind directly to light.visible property
			lightFolder.add(light, 'visible').name('Visible').listen();
			
			// Intensity
			lightFolder.add(light, 'intensity', 0, 5, 0.1).name('Intensity');
			
			// Color
			const colorControl = {
				color: '#' + light.color.getHexString(),
			};
			lightFolder.addColor(colorControl, 'color').name('Color').onChange((value) => {
				light.color.set(value);
			});
			
			// Position
			const posFolder = lightFolder.addFolder('Position');
			posFolder.add(light.position, 'x', -10, 10, 0.1).name('X').listen();
			posFolder.add(light.position, 'y', -10, 10, 0.1).name('Y').listen();
			posFolder.add(light.position, 'z', -10, 10, 0.1).name('Z').listen();
			posFolder.close(); // Collapse by default
			
			// Collapse individual light folders by default
			lightFolder.close();
		});
		
		// Collapse main directional lights folder by default
		dirFolder.close();
	}

	// Point Lights
	if (lights.point && lights.point.length > 0) {
		const pointFolder = gui.addFolder('Point Lights');
		
		lights.point.forEach((light, index) => {
			const lightFolder = pointFolder.addFolder(light.name || `Point ${index}`);
			
			lightFolder.add(light, 'visible').name('Visible').listen();
			lightFolder.add(light, 'intensity', 0, 5, 0.1).name('Intensity');
			lightFolder.add(light, 'distance', 0, 50, 0.5).name('Distance');
			lightFolder.add(light, 'decay', 0, 5, 0.1).name('Decay');
			
			const colorControl = {
				color: '#' + light.color.getHexString(),
			};
			lightFolder.addColor(colorControl, 'color').name('Color').onChange((value) => {
				light.color.set(value);
			});
			
			const posFolder = lightFolder.addFolder('Position');
			posFolder.add(light.position, 'x', -10, 10, 0.1).name('X').listen();
			posFolder.add(light.position, 'y', -10, 10, 0.1).name('Y').listen();
			posFolder.add(light.position, 'z', -10, 10, 0.1).name('Z').listen();
			posFolder.close(); // Collapse by default
			
			// Collapse individual light folders by default
			lightFolder.close();
		});
		
		// Collapse main point lights folder by default
		pointFolder.close();
	}

	// Spot Lights
	if (lights.spot && lights.spot.length > 0) {
		const spotFolder = gui.addFolder('Spot Lights');
		
		lights.spot.forEach((light, index) => {
			const lightFolder = spotFolder.addFolder(light.name || `Spot ${index}`);
			
			lightFolder.add(light, 'visible').name('Visible').listen();
			lightFolder.add(light, 'intensity', 0, 5, 0.1).name('Intensity');
			lightFolder.add(light, 'distance', 0, 50, 0.5).name('Distance');
			lightFolder.add(light, 'angle', 0, Math.PI / 2, 0.01).name('Angle');
			lightFolder.add(light, 'penumbra', 0, 1, 0.01).name('Penumbra');
			lightFolder.add(light, 'decay', 0, 5, 0.1).name('Decay');
			
			const colorControl = {
				color: '#' + light.color.getHexString(),
			};
			lightFolder.addColor(colorControl, 'color').name('Color').onChange((value) => {
				light.color.set(value);
			});
			
			const posFolder = lightFolder.addFolder('Position');
			posFolder.add(light.position, 'x', -10, 10, 0.1).name('X').listen();
			posFolder.add(light.position, 'y', -10, 10, 0.1).name('Y').listen();
			posFolder.add(light.position, 'z', -10, 10, 0.1).name('Z').listen();
			posFolder.close(); // Collapse by default
			
			// Collapse individual light folders by default
			lightFolder.close();
		});
		
		// Collapse main spot lights folder by default
		spotFolder.close();
	}

	// Ambient Light
	if (lights.ambient) {
		const ambientFolder = gui.addFolder('Ambient Light');
		ambientFolder.add(lights.ambient, 'intensity', 0, 2, 0.1).name('Intensity');
		
		const colorControl = {
			color: '#' + lights.ambient.color.getHexString(),
		};
		ambientFolder.addColor(colorControl, 'color').name('Color').onChange((value) => {
			lights.ambient.color.set(value);
		});
		ambientFolder.close(); // Collapse by default
	}

	// Hemisphere Light
	if (lights.hemisphere) {
		const hemiFolder = gui.addFolder('Hemisphere Light');
		hemiFolder.add(lights.hemisphere, 'intensity', 0, 2, 0.1).name('Intensity');
		
		const skyColorControl = {
			color: '#' + lights.hemisphere.color.getHexString(),
		};
		hemiFolder.addColor(skyColorControl, 'color').name('Sky Color').onChange((value) => {
			lights.hemisphere.color.set(value);
		});
		
		const groundColorControl = {
			color: '#' + lights.hemisphere.groundColor.getHexString(),
		};
		hemiFolder.addColor(groundColorControl, 'color').name('Ground Color').onChange((value) => {
			lights.hemisphere.groundColor.set(value);
		});
		hemiFolder.close(); // Collapse by default
	}

	// console.log('Light GUI created');
}

