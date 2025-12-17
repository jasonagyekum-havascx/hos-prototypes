// Liquid material configuration
import * as THREE from '../build/three.module.js';

export const liquidConfig = {
	// Surface material (top animated circle)
	surface: {
		color: 0xaf934a,           // Toki Highball golden amber
		metalness: 0.3,
		roughness: 0,
		opacity: 0.5,
		transparent: true,
		emissive: 0xa18033,        // LIQUID_DEEP_COLOR
		emissiveIntensity: 0.2,
		envMapIntensity: 0,
		side: 'Front',            // 'Front', 'Back', or 'Double'
		depthWrite: true,
	},
	
	// Body material (cylinder)
	body: {
		color: 0xaf934a,           // Toki Highball golden amber
		metalness: 0.3,
		roughness: 0,
		opacity: 0.5,
		transparent: true,
		emissive: 0xa18033,        // LIQUID_DEEP_COLOR
		emissiveIntensity: 0.2,
		envMapIntensity: 0,
		side: 'Front',            // 'Front', 'Back', or 'Double'
		depthWrite: false,
	},
	
	// Bottom material
	bottom: {
		color: 0xa18033,           // LIQUID_DEEP_COLOR
		metalness: 0.1,
		roughness: 0.2,
		opacity: 0.7,
		transparent: true,
		emissive: 0x8b6914,
		emissiveIntensity: 0.03,
		side: 'Double',
		depthWrite: false,
	},
	
	// Geometry settings
	geometry: {
		topRadius: 1.0,            // Multiplier for LIQUID_RADIUS (top of cylinder)
		bottomRadius: 0.9,         // Multiplier for LIQUID_RADIUS (bottom of cylinder)
		radialSegments: 64,
		heightSegments: 1,
	},
};

// Helper function to convert side string to THREE.js constant
export function getSideConstant(side) {
	const sideMap = {
		'Front': THREE.FrontSide,
		'Back': THREE.BackSide,
		'Double': THREE.DoubleSide
	};
	return sideMap[side] || THREE.DoubleSide;
}

// Apply liquid config to materials
export function applyLiquidConfig(surfaceMaterial, bodyMaterial, bottomMaterial, config = liquidConfig) {
	// Apply surface material config
	if (surfaceMaterial) {
		surfaceMaterial.color.setHex(config.surface.color);
		surfaceMaterial.metalness = config.surface.metalness;
		surfaceMaterial.roughness = config.surface.roughness;
		surfaceMaterial.opacity = config.surface.opacity;
		surfaceMaterial.transparent = config.surface.transparent;
		if (surfaceMaterial.emissive) surfaceMaterial.emissive.setHex(config.surface.emissive);
		if (surfaceMaterial.emissiveIntensity !== undefined) surfaceMaterial.emissiveIntensity = config.surface.emissiveIntensity;
		if (surfaceMaterial.envMapIntensity !== undefined) surfaceMaterial.envMapIntensity = config.surface.envMapIntensity;
		surfaceMaterial.side = getSideConstant(config.surface.side);
		surfaceMaterial.depthWrite = config.surface.depthWrite;
	}
	
	// Apply body material config
	if (bodyMaterial) {
		bodyMaterial.color.setHex(config.body.color);
		bodyMaterial.metalness = config.body.metalness;
		bodyMaterial.roughness = config.body.roughness;
		bodyMaterial.opacity = config.body.opacity;
		bodyMaterial.transparent = config.body.transparent;
		if (bodyMaterial.emissive) bodyMaterial.emissive.setHex(config.body.emissive);
		if (bodyMaterial.emissiveIntensity !== undefined) bodyMaterial.emissiveIntensity = config.body.emissiveIntensity;
		if (bodyMaterial.envMapIntensity !== undefined) bodyMaterial.envMapIntensity = config.body.envMapIntensity;
		bodyMaterial.side = getSideConstant(config.body.side);
		bodyMaterial.depthWrite = config.body.depthWrite;
	}
	
	// Apply bottom material config
	if (bottomMaterial) {
		bottomMaterial.color.setHex(config.bottom.color);
		bottomMaterial.metalness = config.bottom.metalness;
		bottomMaterial.roughness = config.bottom.roughness;
		bottomMaterial.opacity = config.bottom.opacity;
		bottomMaterial.transparent = config.bottom.transparent;
		if (bottomMaterial.emissive) bottomMaterial.emissive.setHex(config.bottom.emissive);
		if (bottomMaterial.emissiveIntensity !== undefined) bottomMaterial.emissiveIntensity = config.bottom.emissiveIntensity;
		bottomMaterial.side = getSideConstant(config.bottom.side);
		bottomMaterial.depthWrite = config.bottom.depthWrite;
	}
}

