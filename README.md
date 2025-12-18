# Toki Highball Interactive Experience

A 3D interactive visualization of the Suntory Toki Japanese Highball drink using Three.js.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev
```

The browser will automatically open to `http://localhost:3000/examples/proto-toki.html`

## Project Structure

```
hos-prototypes/
├── build/                    # Three.js library files
├── examples/
│   ├── proto-toki.html       # Main interactive experience
│   ├── example.css           # Shared styles
│   ├── jsm/                   # Three.js addons (loaders, controls, libs)
│   ├── models/glb/            # 3D models (glass, floor, ice)
│   ├── textures/              # HDR environment maps
│   └── src/js/toki/           # Source code modules
│       ├── main.js            # Entry point
│       ├── scene-setup.js     # Renderer, camera, environment
│       ├── liquid-system.js   # Liquid rendering & animation
│       ├── bubble-system.js   # Carbonation bubbles
│       ├── ice-system.js      # Ice cube physics
│       ├── hotspots.js        # Interactive hotspots
│       ├── lights-config.js   # Lighting setup
│       ├── orbit-system.js    # Orbiting ingredients
│       ├── controls.js        # User controls
│       └── gui.js             # Debug GUI panels
├── archive/                   # Archived/unused files
└── package.json
```

## Features

- Realistic glass rendering with refraction
- Animated carbonation bubbles
- Floating ice cubes with physics
- Interactive hotspots with info panels
- Adjustable fizz intensity
- Orange peel garnish toggle
- Debug GUI for material tweaking

## Controls

- **Drag** to orbit camera
- **Scroll** to zoom
- **Click** hotspots for info
- **Click** liquid surface for ripples
- Use the control panel (bottom-left) to adjust settings

## Development

The dev server watches for changes in `examples/` and `build/` directories and automatically refreshes the browser.

### Key Files

- `examples/proto-toki.html` - Main HTML entry point
- `examples/src/js/toki/main.js` - Application entry, initializes all systems
- `examples/src/js/toki/constants.js` - Shared configuration values

