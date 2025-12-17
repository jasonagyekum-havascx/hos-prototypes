// Constants and configuration values

export const GLASS_RADIUS = 0.85;
export const GLASS_HEIGHT = 2.8;
export const GLASS_THICKNESS = 0.04;

export const LIQUID_RADIUS = GLASS_RADIUS - GLASS_THICKNESS - 0.02;
export const LIQUID_HEIGHT = 2.2;
export const LIQUID_BASE_Y = 0.1;
export const LIQUID_SURFACE_Y = LIQUID_BASE_Y + LIQUID_HEIGHT;

export const LIQUID_COLOR = 0xaf934a;
export const LIQUID_DEEP_COLOR = 0xa18033;

export const iceConfig = {
	quantity: 2,
	maxQuantity: 4,
	baseSize: 0.12,
	sizeMultiplier: 3.75,
};

export const MAX_BUBBLES = 500;
export const fizzIntensity = 3.0;

