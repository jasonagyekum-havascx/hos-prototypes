---
name: Repository Structure Cleanup
overview: Reorganize the repository to move main app files from `examples/` to root, consolidate JavaScript files into a single `js/` folder, and clean up confusing entry points and file organization.
todos:
  - id: move-entry-point
    content: Move virtual-bartender.html to root as index.html and update all internal paths
    status: completed
  - id: consolidate-js
    content: Move all JS files to js/ folder and update all import paths
    status: completed
  - id: move-screens-html
    content: Move screen HTML fragments to screens/ folder and update loadHTMLFragment paths
    status: completed
  - id: move-css
    content: Move CSS files to css/ folder and update links in index.html
    status: completed
    dependencies:
      - move-entry-point
  - id: move-src
    content: Move src/js/toki/ to root src/ folder and update imports
    status: completed
  - id: move-assets
    content: Move lib/, models/, textures/ to root and update references
    status: completed
  - id: move-config
    content: Move config files to root and update generate-config.js script
    status: completed
  - id: update-configs
    content: Update package.json, vercel.json, and other config files with new paths
    status: completed
    dependencies:
      - move-entry-point
  - id: handle-standalone
    content: Update proto-toki.html and webgl_roku_gin.html paths if needed
    status: completed
    dependencies:
      - move-assets
      - move-src
  - id: cleanup-test
    content: Remove old files, test all imports, and verify everything works
    status: completed
    dependencies:
      - move-entry-point
      - consolidate-js
      - move-screens-html
      - move-css
      - move-src
      - move-assets
      - move-config
      - update-configs
      - handle-standalone
---

# Repository Structure Cleanup Pla

n

## Current Issues

1. **Confusing entry points**: Multiple `index.html` files redirecting to `virtual-bartender.html` in `examples/`
2. **Scattered JavaScript**: JS files split between `examples/js/`, `examples/screens/*.js`, and `examples/src/js/toki/`
3. **Nested structure**: Main app code buried in `examples/` folder when it should be at root
4. **Inconsistent naming**: `virtual-bartender.html` vs `proto-toki.html` vs `webgl_roku_gin.html`

## Target Structure

```javascript
/
├── index.html                    # Main app entry (renamed from virtual-bartender.html)
├── config.js                     # Moved from examples/
├── config.example.js             # Moved from examples/
├── js/                           # All JavaScript consolidated here
│   ├── common.js                 # From examples/js/common.js
│   ├── kanji.js                  # From examples/screens/kanji.js
│   ├── landing.js                # From examples/screens/landing.js
│   ├── chat.js                   # From examples/screens/chat.js
│   ├── swirl.js                  # From examples/screens/swirl.js
│   ├── drink.js                  # From examples/screens/drink.js
│   └── share.js                  # From examples/screens/share.js
├── screens/                      # HTML fragments (renamed from examples/screens/)
│   ├── kanji.html
│   ├── landing.html
│   ├── chat.html
│   ├── swirl.html
│   ├── drink.html
│   └── share.html
├── css/                          # Moved from examples/css/
│   ├── common.css
│   ├── kanji.css
│   ├── landing.css
│   ├── chat.css
│   ├── swirl.css
│   ├── drink.css
│   └── share.css
├── src/                          # 3D/WebGL code (moved from examples/src/)
│   └── js/
│       └── toki/                 # All toki/*.js files
├── lib/                          # Third-party libraries
│   └── jsm/                      # Three.js addons (moved from examples/jsm/)
├── models/                        # Moved from examples/models/
├── textures/                      # Moved from examples/textures/
├── images/                        # Already at root
├── scripts/                      # Already at root
├── archive/                       # Keep as-is
└── build/                         # Keep as-is
```



## Implementation Steps

### 1. Move and Rename Main Entry Point

- Move `examples/virtual-bartender.html` → `index.html` (root)
- Update all internal paths (CSS, JS imports, asset references)
- Remove old `index.html` files (root and examples/)

### 2. Consolidate JavaScript Files

- Move `examples/js/common.js` → `js/common.js`
- Move all `examples/screens/*.js` → `js/*.js`
- Update all import paths in JS files:
- Change `'../js/common.js'` → `'./common.js'` (for screen files now in same folder)
- Change `'./screens/chat.js'` → `'./chat.js'` (for cross-screen imports)
- Update `index.html` imports from `'./screens/kanji.js'` → `'./js/kanji.js'`

### 3. Move HTML Fragments

- Move `examples/screens/*.html` → `screens/*.html`
- Update `loadHTMLFragment()` calls in JS files:
- Change `'./screens/kanji.html'` → `'./screens/kanji.html'` (path stays relative)

### 4. Move CSS Files

- Move `examples/css/*.css` → `css/*.css`
- Update CSS links in `index.html`:
- Change `href="css/common.css"` → `href="./css/common.css"` (ensure root-relative)

### 5. Move 3D/WebGL Source Code

- Move `examples/src/js/toki/` → `src/js/toki/`
- Update imports in files that reference toki modules (check `proto-toki.html`, `swirl.js`)

### 6. Move Libraries and Assets

- Move `examples/jsm/` → `lib/jsm/`
- Move `examples/models/` → `models/`
- Move `examples/textures/` → `textures/`
- Update any references to these paths

### 7. Move Configuration Files

- Move `examples/config.js` → `config.js`
- Move `examples/config.example.js` → `config.example.js`
- Update `scripts/generate-config.js` to write to root `config.js`

### 8. Handle Standalone HTML Files

- Keep `examples/proto-toki.html` but update paths (or move to root if it's a demo)
- Keep `examples/webgl_roku_gin.html` but update paths (or move to root if it's a demo)
- Update iframe references in `swirl.html` if `proto-toki.html` moves

### 9. Update Configuration Files

- Update `package.json` scripts:
- Change `--open=examples/virtual-bartender.html` → `--open=index.html`
- Update `vercel.json` redirect:
- Change destination from `/examples/virtual-bartender.html` → `/index.html`

### 10. Clean Up

- Remove empty `examples/` folder (or keep only standalone demos)
- Update any remaining path references
- Test all imports and asset loading

## Files to Update

### Path Updates Required

- [index.html](examples/virtual-bartender.html) - Main entry point (move & rename)
- [js/common.js](examples/js/common.js) - Update screen import paths
- [js/kanji.js](examples/screens/kanji.js) - Update common.js import
- [js/landing.js](examples/screens/landing.js) - Update common.js import
- [js/chat.js](examples/screens/chat.js) - Update common.js and cross-screen imports
- [js/swirl.js](examples/screens/swirl.js) - Update common.js import
- [js/drink.js](examples/screens/drink.js) - Update imports
- [js/share.js](examples/screens/share.js) - Update imports
- [scripts/generate-config.js](scripts/generate-config.js) - Update config.js output path
- [package.json](package.json) - Update dev server path
- [vercel.json](vercel.json) - Update redirect destination

## Notes