// Liquid System - handles liquid surface, body, shaders, and animations

import * as THREE from '../../../../build/three.module.js';
import { liquidConfig } from './liquid-config.js';
import { LIQUID_RADIUS, LIQUID_HEIGHT, LIQUID_BASE_Y, LIQUID_SURFACE_Y } from './constants.js';

// Liquid system state
let liquidSurface = null;
let liquidBody = null;
let liquidUniforms = null;
let waterPlane = null;

// Animation state for liquid height
let heightAnimation = {
	isAnimating: false,
	startHeight: 1.0,
	targetHeight: 1.0,
	currentHeight: 1.0,
	startTime: 0,
	duration: 1.0, // 1 second animation
	pinnedBottomY: 0, // Bottom Y position that stays fixed during animation
	startSurfaceY: 0, // Surface Y position when animation starts
	targetSurfaceY: 0, // Target surface Y position
	startWaterPlaneY: 0, // Water plane Y position when animation starts
	targetWaterPlaneY: 0, // Target water plane Y position
	currentTargetIndex: 0 // Track which target we're on (0 = 75%, 1 = 50%, 2 = 25%, 3 = 5%)
};

// Build liquid geometry and materials
export function buildLiquid(scene, fizzIntensity) {
	liquidUniforms = {
		uTime: { value: 0 },
		uTilt: { value: new THREE.Vector2() },
		uRippleCenter: { value: new THREE.Vector2(10000, 10000) },
		uRippleStrength: { value: 0 },
		uFizz: { value: fizzIntensity },
	};

	const surfaceSegments = 64;
	const surfaceGeometry = new THREE.CircleGeometry(LIQUID_RADIUS, surfaceSegments);
	surfaceGeometry.rotateX(-Math.PI * 0.5);
	surfaceGeometry.translate(0, LIQUID_SURFACE_Y - 0.02, 0); // Slightly lower to reduce gap with cylinder

	const surfaceMaterial = new THREE.MeshStandardMaterial({
		color: liquidConfig.surface.color,
		metalness: liquidConfig.surface.metalness,
		roughness: liquidConfig.surface.roughness,
		transparent: liquidConfig.surface.transparent,
		opacity: liquidConfig.surface.opacity,
		emissive: liquidConfig.surface.emissive,
		emissiveIntensity: liquidConfig.surface.emissiveIntensity,
		side: liquidConfig.surface.side === 'Double' ? THREE.DoubleSide : (liquidConfig.surface.side === 'Back' ? THREE.BackSide : THREE.FrontSide),
		depthWrite: liquidConfig.surface.depthWrite,
	});
	if (liquidConfig.surface.envMapIntensity !== undefined) {
		surfaceMaterial.envMapIntensity = liquidConfig.surface.envMapIntensity;
	}

	surfaceMaterial.onBeforeCompile = (shader) => {
		shader.uniforms.uTime = liquidUniforms.uTime;
		shader.uniforms.uTilt = liquidUniforms.uTilt;
		shader.uniforms.uRippleCenter = liquidUniforms.uRippleCenter;
		shader.uniforms.uRippleStrength = liquidUniforms.uRippleStrength;
		shader.uniforms.uFizz = liquidUniforms.uFizz;

		shader.vertexShader = shader.vertexShader.replace(
			'#include <common>',
			`#include <common>
			uniform float uTime;
			uniform vec2 uTilt;
			uniform vec2 uRippleCenter;
			uniform float uRippleStrength;
			uniform float uFizz;
			varying float vWaveHeight;`
		);

		shader.vertexShader = shader.vertexShader.replace(
			'#include <begin_vertex>',
			`vec3 transformed = vec3(position);
			
			// Tilt effect
			float tilt = dot(transformed.xz, uTilt) * 0.2;
			
			// Gentle waves (slowed down, reduced amplitude)
			float wave = sin(transformed.x * 4.0 + uTime * 0.75) * 0.006
			           + sin(transformed.z * 4.5 + uTime * 0.55) * 0.006
			           + sin((transformed.x + transformed.z) * 3.0 + uTime * 0.9) * 0.004;
			
			// Fizz surface disturbance (slowed down, reduced amplitude)
			float fizz = sin(transformed.x * 20.0 + uTime * 2.5) * 0.0015 * uFizz
			           + sin(transformed.z * 22.0 + uTime * 3.0) * 0.0015 * uFizz;
			
			// Ripple from touch (slowed down)
			float dist = length(transformed.xz - uRippleCenter);
			float ripple = uRippleStrength * exp(-dist * 3.0) * sin(12.0 * dist - uTime * 2.5);
			
			float totalWave = tilt + wave + fizz + ripple;
			transformed.y += totalWave;
			vWaveHeight = totalWave;`
		);

		shader.fragmentShader = shader.fragmentShader.replace(
			'#include <common>',
			`#include <common>
			varying float vWaveHeight;`
		);

		surfaceMaterial.userData.shader = shader;
	};

	liquidSurface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
	liquidSurface.renderOrder = 2;
	scene.add(liquidSurface);

	// Liquid body (tapered - skinnier at bottom, larger at top)
	const bodyGeometry = new THREE.CylinderGeometry(
		LIQUID_RADIUS * liquidConfig.geometry.topRadius,      // Top radius (larger)
		LIQUID_RADIUS * liquidConfig.geometry.bottomRadius,   // Bottom radius (skinnier)
		LIQUID_HEIGHT,
		liquidConfig.geometry.radialSegments,
		liquidConfig.geometry.heightSegments,
		true
	);
	// Don't translate geometry - keep it centered at origin for easier scaling from bottom

	const bodyMaterial = new THREE.MeshStandardMaterial({
		color: liquidConfig.body.color,
		metalness: liquidConfig.body.metalness,
		roughness: liquidConfig.body.roughness,
		transparent: liquidConfig.body.transparent,
		opacity: liquidConfig.body.opacity,
		emissive: liquidConfig.body.emissive,
		emissiveIntensity: liquidConfig.body.emissiveIntensity,
		side: liquidConfig.body.side === 'Double' ? THREE.DoubleSide : (liquidConfig.body.side === 'Back' ? THREE.BackSide : THREE.FrontSide),
		depthWrite: liquidConfig.body.depthWrite,
	});
	if (liquidConfig.body.envMapIntensity !== undefined) {
		bodyMaterial.envMapIntensity = liquidConfig.body.envMapIntensity;
	}

	liquidBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
	liquidBody.renderOrder = 1;
	// Position mesh so bottom is at LIQUID_BASE_Y
	// Geometry center is at 0, so we need: position.y = LIQUID_BASE_Y + (LIQUID_HEIGHT * scale) * 0.5
	// Initially scale = 1.0, so: position.y = LIQUID_BASE_Y + LIQUID_HEIGHT * 0.5
	liquidBody.position.set(0, LIQUID_BASE_Y + LIQUID_HEIGHT * 0.5, 0);
	scene.add(liquidBody);

	// Liquid bottom (matches bottom radius of tapered cylinder)
	const bottomGeometry = new THREE.CircleGeometry(LIQUID_RADIUS * liquidConfig.geometry.bottomRadius, 64);
	bottomGeometry.rotateX(Math.PI * 0.5);
	bottomGeometry.translate(0, LIQUID_BASE_Y, 0);

	const bottomMaterial = new THREE.MeshStandardMaterial({
		color: liquidConfig.bottom.color,
		metalness: liquidConfig.bottom.metalness,
		roughness: liquidConfig.bottom.roughness,
		transparent: liquidConfig.bottom.transparent,
		opacity: liquidConfig.bottom.opacity,
		emissive: liquidConfig.bottom.emissive,
		emissiveIntensity: liquidConfig.bottom.emissiveIntensity,
		side: liquidConfig.bottom.side === 'Double' ? THREE.DoubleSide : (liquidConfig.bottom.side === 'Back' ? THREE.BackSide : THREE.FrontSide),
		depthWrite: liquidConfig.bottom.depthWrite,
	});

	const liquidBottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
	liquidBottom.renderOrder = 0;
	scene.add(liquidBottom);

	// Invisible raycast plane
	waterPlane = new THREE.Mesh(
		new THREE.PlaneGeometry(LIQUID_RADIUS * 2, LIQUID_RADIUS * 2),
		new THREE.MeshBasicMaterial({ visible: false })
	);
	waterPlane.rotation.x = -Math.PI * 0.5;
	waterPlane.position.y = LIQUID_SURFACE_Y;
	scene.add(waterPlane);
	
	// Store initial state for animation (after all objects are created)
	heightAnimation.startHeight = 1.0;
	heightAnimation.currentHeight = 1.0;
}

// Update liquid animation
export function updateLiquidAnimation(deltaTime) {
	if (liquidUniforms) {
		liquidUniforms.uTime.value += deltaTime;
		liquidUniforms.uRippleStrength.value *= 0.95;
	}
	
	// Update height animation if active
	if (heightAnimation.isAnimating && liquidBody && liquidSurface && waterPlane) {
		const elapsed = (Date.now() - heightAnimation.startTime) / 1000;
		const progress = Math.min(elapsed / heightAnimation.duration, 1.0);
		
		// Easing function (ease-out cubic)
		const eased = 1 - Math.pow(1 - progress, 3);
		
		// Interpolate height
		heightAnimation.currentHeight = heightAnimation.startHeight + 
			(heightAnimation.targetHeight - heightAnimation.startHeight) * eased;
		
		// Calculate the new mesh position to keep bottom at LIQUID_BASE_Y
		// Geometry is centered at origin (0, 0, 0) in local space
		// World bottom = mesh.position.y - (LIQUID_HEIGHT * scale) * 0.5
		// We want: world bottom = LIQUID_BASE_Y (always)
		// So: LIQUID_BASE_Y = mesh.position.y - (LIQUID_HEIGHT * scale) * 0.5
		// Therefore: mesh.position.y = LIQUID_BASE_Y + (LIQUID_HEIGHT * scale) * 0.5
		const scaledHeight = LIQUID_HEIGHT * heightAnimation.currentHeight;
		
		// Position mesh so bottom stays at LIQUID_BASE_Y
		const newBodyY = LIQUID_BASE_Y + scaledHeight * 0.5;
		
		// Interpolate surface and water plane positions from start to target
		const newSurfaceY = heightAnimation.startSurfaceY + 
			(heightAnimation.targetSurfaceY - heightAnimation.startSurfaceY) * eased;
		const newWaterPlaneY = heightAnimation.startWaterPlaneY + 
			(heightAnimation.targetWaterPlaneY - heightAnimation.startWaterPlaneY) * eased;
		
		// Update liquid body scale and position (bottom stays fixed at LIQUID_BASE_Y)
		liquidBody.scale.y = heightAnimation.currentHeight;
		liquidBody.position.y = newBodyY;
		
		// Move the surface circle to stay at the top of the cylinder
		liquidSurface.position.y = newSurfaceY;
		
		// Move the water plane to match the surface
		waterPlane.position.y = newWaterPlaneY;
		
		// Check if animation is complete
		if (progress >= 1.0) {
			heightAnimation.isAnimating = false;
		}
	}
}

// Trigger ripple on liquid surface
export function triggerRipple(raycaster, mouse, camera) {
	if (!waterPlane || !liquidUniforms || !raycaster) return;

	raycaster.setFromCamera(mouse, camera);
	const hit = raycaster.intersectObject(waterPlane);
	if (hit.length === 0) return;

	const point = hit[0].point;
	liquidUniforms.uRippleCenter.value.set(point.x, point.z);
	liquidUniforms.uRippleStrength.value = Math.min(
		liquidUniforms.uRippleStrength.value + 0.4,
		1.2
	);
}

// Get liquid meshes for GUI access
export function getLiquidMeshes() {
	return {
		surface: liquidSurface,
		body: liquidBody,
		waterPlane: waterPlane
	};
}

// Get liquid uniforms for animation updates
export function getLiquidUniforms() {
	return liquidUniforms;
}

// Animate liquid height to a target scale (1.0 = 100%, 0.75 = 75%, etc.)
export function animateLiquidHeight(targetScale) {
	if (!liquidBody || !liquidSurface || !waterPlane) return;
	
	// Capture current state (scale and positions) when animation starts
	// Ensure we're starting from the actual current scale (should be 1.0 initially)
	const currentScale = liquidBody.scale.y || 1.0;
	heightAnimation.startHeight = currentScale;
	heightAnimation.currentHeight = currentScale;
	heightAnimation.targetHeight = targetScale;
	heightAnimation.startTime = Date.now();
	heightAnimation.isAnimating = true;
	
	// The bottom should always be at LIQUID_BASE_Y
	// Geometry center in local space is at: LIQUID_BASE_Y + LIQUID_HEIGHT * 0.5
	// World center = mesh.position.y + (LIQUID_BASE_Y + LIQUID_HEIGHT * 0.5)
	// World bottom = world center - (LIQUID_HEIGHT * scale) * 0.5
	// We want world bottom to always be LIQUID_BASE_Y
	heightAnimation.pinnedBottomY = LIQUID_BASE_Y;
	
	// Capture the ACTUAL current positions (not calculated)
	heightAnimation.startSurfaceY = liquidSurface.position.y;
	heightAnimation.startWaterPlaneY = waterPlane.position.y;
	
	// Calculate how much to move down based on the scale change
	// Current height = LIQUID_HEIGHT * currentScale
	// Target height = LIQUID_HEIGHT * targetScale
	// Height reduction = LIQUID_HEIGHT * (currentScale - targetScale)
	// Move surface down by that amount
	const heightReduction = LIQUID_HEIGHT * (currentScale - targetScale);
	heightAnimation.targetSurfaceY = heightAnimation.startSurfaceY - heightReduction;
	heightAnimation.targetWaterPlaneY = heightAnimation.startWaterPlaneY - heightReduction;
	
	console.log('Animation start - Current scale:', currentScale, 'Target scale:', targetScale);
	console.log('Surface Y - Start:', heightAnimation.startSurfaceY.toFixed(3), 'Target:', heightAnimation.targetSurfaceY.toFixed(3));
	console.log('Moving down by:', heightReduction.toFixed(3));
}

// Get the next target scale in the sequence
export function getNextHeightTarget() {
	const targets = [0.75, 0.50, 0.25, 0.05];
	const target = targets[heightAnimation.currentTargetIndex];
	heightAnimation.currentTargetIndex = (heightAnimation.currentTargetIndex + 1) % targets.length;
	return target;
}

