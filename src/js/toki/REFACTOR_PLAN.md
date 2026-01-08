# Refactoring Plan

## Modules to Create:

1. **constants.js** ✅ - Shared constants (GLASS_RADIUS, LIQUID_*, iceConfig, etc.)
2. **ice-system.js** - Ice cube creation, materials, spawning, animation, collisions
3. **bubble-system.js** - Bubble creation, spawning, animation
4. **orange-slice.js** - Orange slice creation and animation
5. **hotspots.js** - Hotspot system for UI interactions
6. **models.js** - GLB model loading (glass, floor, ice cube)
7. **liquid-system.js** - Liquid surface, body, shaders, animations
8. **glass-system.js** - Glass geometry creation
9. **gui.js** - All GUI creation functions
10. **controls.js** - Keyboard shortcuts and panel controls
11. **scene-setup.js** - Renderer, camera, scene initialization, environment map
12. **main.js** (refactored) - Orchestrates all modules

## Dependencies:
- Each module imports what it needs (THREE, constants, etc.)
- Modules export functions that accept dependencies (scene, camera, etc.)
- main.js imports all modules and wires them together
