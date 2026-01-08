// Hotspots - handles hotspot creation, updates, hover, click interactions, and panel visibility

import * as THREE from 'three';

// Hotspot system state
let hotspots = [];
let activePanel = null;
let scene, camera, renderer, raycaster, mouse;
let hotspotLabel, hotspotOverlay;
let onPanelCloseCallback = null;
let ensoSketch = null;

// Texture loader
const textureLoader = new THREE.TextureLoader();

// Create a hotspot with icon button
function createHotspot(position, label, panelId, iconPath) {
	const group = new THREE.Group();
	group.position.copy(position);

	// Load icon texture
	const texture = textureLoader.load(iconPath);
	texture.colorSpace = THREE.SRGBColorSpace;

	// Create sprite material with the icon
	const spriteMaterial = new THREE.SpriteMaterial({
		map: texture,
		transparent: true,
		opacity: 1,
		depthTest: true,
		depthWrite: false,
	});

	// Create sprite (always faces camera)
	const sprite = new THREE.Sprite(spriteMaterial);
	sprite.scale.set(0.5, 0.5, 1); // Adjust size as needed
	group.add(sprite);

	group.userData = {
		label: label,
		panelId: panelId,
		sprite: sprite,
		baseScale: 0.5,
		hovered: false,
	};

	scene.add(group);
	hotspots.push(group);
}

// Initialize hotspots
export function initHotspots(sceneRef, cameraRef, rendererRef, raycasterRef, mouseRef, onPanelClose = null) {
	scene = sceneRef;
	camera = cameraRef;
	renderer = rendererRef;
	raycaster = raycasterRef;
	mouse = mouseRef;
	onPanelCloseCallback = onPanelClose;
	
	hotspotLabel = document.getElementById('hotspotLabel');
	hotspotOverlay = document.getElementById('hotspotOverlay');

	// Video hotspot - play button at the top (rim level)
	createHotspot(
		new THREE.Vector3(0.0, 3.0, 1.0),
		'Watch the Perfect Serve',
		'panelVideo',
		'../images/assets/play-sign.png'
	);

	// Glass hotspot - plus button upper area
	createHotspot(
		new THREE.Vector3(1.1, 2.4, -0.8),
		'Highball Glass',
		'panelGlass',
		'../images/assets/plus-sign.png'
	);

	// Ice hotspot - plus button middle (ice level)
	createHotspot(
		new THREE.Vector3(-1.0, 1.8, 0.9),
		'The Perfect Ice',
		'panelIce',
		'../images/assets/plus-sign.png'
	);

	// Whisky hotspot - plus button lower (liquid level)
	createHotspot(
		new THREE.Vector3(1.2, 1.2, 0.6),
		'About Toki Whisky',
		'panelWhisky',
		'../images/assets/plus-sign.png'
	);

	// Enso hotspot - positioned on the left side near garnish
	createHotspot(
		new THREE.Vector3(-1.1, 2.8, 0.5),
		'Trace the Enso',
		'panelEnso',
		'../images/enso.png'
	);
}

// Update hotspots animation
export function updateHotspots(time) {
	for (const hotspot of hotspots) {
		const { sprite, hovered, baseScale } = hotspot.userData;

		// Subtle pulse animation for the sprite
		const pulse = 1 + Math.sin(time * 2) * 0.08;
		
		// Hover effect - scale up when hovered
		const targetScale = hovered ? baseScale * 1.2 : baseScale;
		const currentScale = sprite.scale.x;
		const newScale = currentScale + (targetScale * pulse - currentScale) * 0.1;
		sprite.scale.set(newScale, newScale, 1);
	}
}

// Check hotspot hover
export function checkHotspotHover() {
	if (!raycaster || !mouse || !camera) return;
	raycaster.setFromCamera(mouse, camera);

	let foundHover = false;

	for (const hotspot of hotspots) {
		const intersects = raycaster.intersectObject(hotspot, true);

		if (intersects.length > 0 && intersects[0].distance < 10) {
			hotspot.userData.hovered = true;
			foundHover = true;
			renderer.domElement.style.cursor = 'pointer';
		} else {
			hotspot.userData.hovered = false;
		}
	}

	if (!foundHover) {
		renderer.domElement.style.cursor = 'grab';
	}
}

// Check hotspot click
export function checkHotspotClick() {
	if (!raycaster || !mouse || !camera) return false;
	raycaster.setFromCamera(mouse, camera);

	for (const hotspot of hotspots) {
		const intersects = raycaster.intersectObject(hotspot, true);

		if (intersects.length > 0 && intersects[0].distance < 10) {
			openPanel(hotspot.userData.panelId);
			return true;
		}
	}

	return false;
}

// Load p5.js library
function loadP5Library() {
	return new Promise((resolve, reject) => {
		if (typeof window.p5 !== 'undefined') {
			resolve();
			return;
		}
		
		const script = document.createElement('script');
		script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js';
		script.onload = () => resolve();
		script.onerror = () => reject(new Error('Failed to load p5.js'));
		document.head.appendChild(script);
	});
}

// Create Enso sketch
function createEnsoSketch(onComplete = null) {
	return (p) => {
		let canvas;
		let isDrawing = false;
		let strokePoints = [];
		let circleProgress = 0;
		let targetCircleRadius = 80;
		let ensoImage;

		p.preload = function() {
			ensoImage = p.loadImage('../images/enso.png');
		};

		p.setup = function() {
			const container = document.getElementById('ensoCanvasContainer');
			const containerWidth = container ? container.offsetWidth : 400;
			const containerHeight = container ? container.offsetHeight : 300;
			
			canvas = p.createCanvas(containerWidth, containerHeight);
			canvas.parent('ensoCanvasContainer');
			p.stroke('#8B7355');
			p.strokeWeight(p.random(6, 12));
			p.noFill();
			p.background(245, 240, 232);
		};

		const drawTargetCircle = () => {
			if (ensoImage) {
				p.push();
				p.imageMode(p.CENTER);
				const centerX = p.width / 2;
				const centerY = p.height / 2;
				p.image(ensoImage, centerX, centerY, targetCircleRadius * 2, targetCircleRadius * 2);
				p.pop();
			}
		};

		p.draw = function() {
			drawTargetCircle();
			
			if (isDrawing) {
				if (p.mouseIsPressed && p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
					strokePoints.push({x: p.mouseX, y: p.mouseY});
				}
			}

			if (p.frameCount % 10 === 0 && strokePoints.length > 50) {
				checkCircleCompletion();
			}
		};

		p.mousePressed = function() {
			if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
				isDrawing = true;
				strokePoints = [{x: p.mouseX, y: p.mouseY}];
			}
		};

		p.mouseDragged = function() {
			if (isDrawing && p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
				p.strokeWeight(p.random(4, 10));
				p.stroke(p.color(139, 115, 85, p.random(180, 255)));

				for (let i = 0; i < 3; i++) {
					let offsetX = p.random(-2, 2);
					let offsetY = p.random(-2, 2);
					p.line(p.pmouseX + offsetX, p.pmouseY + offsetY, p.mouseX + offsetX, p.mouseY + offsetY);
				}

				strokePoints.push({x: p.mouseX, y: p.mouseY});
			}
		};

		p.mouseReleased = function() {
			if (isDrawing) {
				isDrawing = false;
			}
		};

		const checkCircleCompletion = () => {
			if (strokePoints.length < 100) return;

			let centerX = 0, centerY = 0;
			strokePoints.forEach(point => {
				centerX += point.x;
				centerY += point.y;
			});
			centerX /= strokePoints.length;
			centerY /= strokePoints.length;

			let avgRadius = 0;
			strokePoints.forEach(point => {
				let distance = p.dist(centerX, centerY, point.x, point.y);
				avgRadius += distance;
			});
			avgRadius /= strokePoints.length;

			const targetCenterX = p.width / 2;
			const targetCenterY = p.height / 2;

			const centerDistance = p.dist(centerX, centerY, targetCenterX, targetCenterY);
			const radiusDifference = Math.abs(avgRadius - targetCircleRadius);

			let centerAccuracy = Math.max(0, 1 - (centerDistance / 50));
			let radiusAccuracy = Math.max(0, 1 - (radiusDifference / 30));

			circleProgress = (centerAccuracy + radiusAccuracy) / 2;

			updateProgressUI(circleProgress);

			if (circleProgress > 0.4) {
				setTimeout(() => {
					completeEnso();
				}, 500);
			}
		};

		const updateProgressUI = (progress) => {
			const fill = document.getElementById('ensoProgressFill');
			const text = document.getElementById('ensoProgressText');
			
			if (fill && text) {
				fill.style.width = (progress * 100) + '%';

				if (progress > 0.4) {
					text.textContent = 'Perfect! Completing...';
					text.style.color = '#8B7355';
				} else if (progress > 0.25) {
					text.textContent = 'Almost there...';
				} else {
					text.textContent = 'Trace the circle';
				}
			}
		};

		const completeEnso = () => {
			p.push();
			p.fill(139, 115, 85, 50);
			p.noStroke();
			p.circle(p.width/2, p.height/2, targetCircleRadius * 2 + 20);
			p.pop();

			setTimeout(() => {
				if (onComplete && typeof onComplete === 'function') {
					onComplete();
				}
			}, 1000);
		};
	};
}

// Open panel
function openPanel(panelId) {
	// Close any open panel first
	closePanel();

	const panel = document.getElementById(panelId);
	if (panel) {
		activePanel = panel;
		panel.classList.add('active');
		hotspotOverlay.classList.add('active');

		// Notify parent window that modal is open (for z-index handling)
		if (window.parent !== window) {
			window.parent.postMessage({ type: 'hotspotPanelOpen' }, '*');
		}

		// Initialize Enso canvas if this is the Enso panel
		if (panelId === 'panelEnso') {
			loadP5Library().then(() => {
				if (!ensoSketch) {
					const onComplete = () => {
						setTimeout(() => {
							closePanel();
						}, 500);
					};
					ensoSketch = new window.p5(createEnsoSketch(onComplete));
				}
			}).catch(error => {
				console.error('Error loading p5.js:', error);
			});
		}

		// Focus trap for accessibility
		const closeBtn = panel.querySelector('.hotspot-panel-close');
		if (closeBtn) closeBtn.focus();
	}
}

// Close panel
export function closePanel() {
	const wasOpen = activePanel !== null;
	
	if (activePanel) {
		// Pause video if it exists in the panel
		const video = activePanel.querySelector('video');
		if (video) {
			video.pause();
			video.currentTime = 0;
		}
		
		// Clean up Enso sketch if it exists
		if (ensoSketch) {
			ensoSketch.remove();
			ensoSketch = null;
		}
		
		activePanel.classList.remove('active');
		activePanel = null;
	}

	hotspotOverlay.classList.remove('active');
	
	// Notify parent window that modal is closed (for z-index handling)
	if (wasOpen && window.parent !== window) {
		window.parent.postMessage({ type: 'hotspotPanelClose' }, '*');
	}
	
	// Trigger callback if panel was actually open
	if (wasOpen && onPanelCloseCallback) {
		onPanelCloseCallback();
	}
}

// Export for use in controls.js
export function getActivePanel() {
	return activePanel;
}

export function getHotspotOverlay() {
	return hotspotOverlay;
}

// Get all hotspot groups for external access (e.g., for AR grouping)
export function getHotspots() {
	return hotspots;
}

