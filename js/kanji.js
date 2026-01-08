import { state, navigateTo, registerScreen, loadHTMLFragment } from './common.js';

// ==================== 
// KANJI TRACING SYSTEM
// ====================
let kanjiSketch = null;
let kanjiScreen = null;
let progressFill = null;
let progressText = null;

// p5.js sketch for kanji tracing
const createKanjiSketch = (p) => {
  let canvas;
  let isDrawing = false;
  let strokePoints = [];
  let circleProgress = 0;
  let targetCircleRadius = 120;

  p.setup = function() {
    const container = document.getElementById('kanjiCanvas');
    const containerWidth = container ? container.offsetWidth : 500;
    const containerHeight = container ? container.offsetHeight : 500;
    
    canvas = p.createCanvas(containerWidth, containerHeight);
    canvas.parent('kanjiCanvas');

    // Set up ink-like brush with natural variations
    p.stroke('#8B7355'); // Gold stroke color
    p.strokeWeight(p.random(6, 12)); // Vary stroke weight for natural look
    p.noFill();

    // Set background to eggshell white (matching screen background)
    p.background(245, 240, 232); // Eggshell white, fully opaque
  };

  const drawTargetCircle = () => {
    p.push();
    p.stroke(139, 115, 85, 60); // More visible gold on light background
    p.strokeWeight(1);
    p.noFill();
    p.drawingContext.setLineDash([5, 5]);
    // Ensure circle is centered
    const centerX = p.width / 2;
    const centerY = p.height / 2;
    p.circle(centerX, centerY, targetCircleRadius * 2);
    p.drawingContext.setLineDash([]);
    p.pop();
  };

  p.draw = function() {
    // Redraw the target circle guide each frame to ensure it's visible
    drawTargetCircle();
    
    // Only update if we're drawing
    if (isDrawing) {
      // Draw with brush
      if (p.mouseIsPressed && p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
        // Record stroke points for circle detection
        strokePoints.push({x: p.mouseX, y: p.mouseY});
      }
    }

    // Check circle completion every few frames
    if (p.frameCount % 10 === 0 && strokePoints.length > 50) {
      checkCircleCompletion();
    }
  };

  p.windowResized = function() {
    // Resize canvas to match container
    const container = document.getElementById('kanjiCanvas');
    if (container) {
      p.resizeCanvas(container.offsetWidth, container.offsetHeight);
      // Redraw background to eggshell white
      p.background(245, 240, 232);
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
      // Vary stroke properties for ink-like effect
      p.strokeWeight(p.random(4, 10));
      p.stroke(p.color(139, 115, 85, p.random(180, 255))); // Vary opacity

      // Draw multiple overlapping lines for ink bleed effect
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

    // Calculate center and radius of the drawn shape
    let centerX = 0, centerY = 0;
    strokePoints.forEach(point => {
      centerX += point.x;
      centerY += point.y;
    });
    centerX /= strokePoints.length;
    centerY /= strokePoints.length;

    // Calculate average distance from center (radius)
    let avgRadius = 0;
    strokePoints.forEach(point => {
      let distance = p.dist(centerX, centerY, point.x, point.y);
      avgRadius += distance;
    });
    avgRadius /= strokePoints.length;

    // Check if the shape is close to the target circle (centered)
    const targetCenterX = p.width / 2;
    const targetCenterY = p.height / 2;

    const centerDistance = p.dist(centerX, centerY, targetCenterX, targetCenterY);
    const radiusDifference = Math.abs(avgRadius - targetCircleRadius);

    // Calculate completion score
    let centerAccuracy = Math.max(0, 1 - (centerDistance / 50)); // Within 50px of center
    let radiusAccuracy = Math.max(0, 1 - (radiusDifference / 30)); // Within 30px of target radius

    circleProgress = (centerAccuracy + radiusAccuracy) / 2;

    // Update progress UI
    updateProgressUI(circleProgress);

    // Complete if progress is high enough
    if (circleProgress > 0.7) {
      setTimeout(() => {
        completeKanji();
      }, 500);
    }
  };

  const updateProgressUI = (progress) => {
    if (progressFill && progressText) {
      progressFill.style.width = (progress * 100) + '%';

      if (progress > 0.7) {
        progressText.textContent = 'Perfect! Entering...';
        progressText.style.color = '#8B7355';
      } else if (progress > 0.4) {
        progressText.textContent = 'Almost there...';
      } else {
        progressText.textContent = 'Paint a circle to continue';
      }
    }
  };

  const completeKanji = () => {
    // Add completion animation
    p.push();
    p.fill(139, 115, 85, 50);
    p.noStroke();
    p.circle(p.width/2, p.height/2, targetCircleRadius * 2 + 20);
    p.pop();

    // Navigate to landing screen
    setTimeout(async () => {
      await navigateTo('landing');
    }, 1000);
  };
};

export const initKanjiScreen = async () => {
  const app = document.querySelector('.app');
  if (!app) return;

  // Load HTML fragment
  const fragment = await loadHTMLFragment('./screens/kanji.html');
  if (!fragment) return;

  app.appendChild(fragment);
  kanjiScreen = document.getElementById('kanjiScreen');
  if (!kanjiScreen) return;

  registerScreen('kanji', kanjiScreen);

  progressFill = document.getElementById('progressFill');
  progressText = document.getElementById('progressText');

  // Initialize p5.js sketch
  // Load p5.js library dynamically
  if (typeof p5 === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js';
    script.onload = () => {
      kanjiSketch = new p5(createKanjiSketch);
    };
    document.head.appendChild(script);
  } else {
    kanjiSketch = new p5(createKanjiSketch);
  }

  // Set kanji screen as initial active screen
  kanjiScreen.classList.add('active');
  state.currentScreen = 'kanji';
};

