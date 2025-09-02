import { Boid } from './boid.js';
import { randomRange, pickOneTriadic, pickOneTetradic } from './utils.js'
import { Vector2D } from './vector.js'
import { WORLD, appendFlock, flock } from "./world.js";

let isPaused = false;
let lastTimestamp = 0;

function init() {
    /**
     * Initialize Canvas with modern styling
     */
    const canvasElement = document.createElement("div");
    canvasElement.setAttribute("id", "canvas");
    canvasElement.style.width = `${WORLD.CANVAS_WIDTH}px`;
    canvasElement.style.height = `${WORLD.CANVAS_HEIGHT}px`;
    canvasElement.style.position = "relative";
    canvasElement.style.overflow = "hidden";
    document.getElementById("canvas-container").appendChild(canvasElement);

    /**
     * Initialize Boids with improved colors
     */
    for (let i = 0; i < WORLD.NUM_BOIDS; i++) {
        const isHighlighted = i === 0;
        const boid = new Boid({ id: i, isHighlighted });

        // Use modern color palette
        const color = pickOneTetradic(
            "#3b82f6", "#106db9ff", "#0bf5f5ff", "#44b9efff"
        );
        boid.setColor(color);

        appendFlock(boid);
    }

    // Style the main boid
    if (flock[0]) {
        flock[0].setColor("#000000ff");
        flock[0].boidElement.style.filter = "drop-shadow(0 0 4px rgba(29, 29, 29, 0.8))";
    }

    // Dispatch event to notify UI that boids are ready
    window.dispatchEvent(new CustomEvent('boids-ready'));

    // Listen for pause events from UI
    window.addEventListener('simulation-pause-toggle', (e) => {
        isPaused = e.detail.isPaused;
    });

    // Start the simulation
    window.requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
    if (!isPaused) {
        let deltaT = (timestamp - lastTimestamp) * WORLD.TIME_SCALE;
        deltaT = Math.min(deltaT, 50);

        for (let i = 0; i < flock.length; i++) {
            const boid = flock[i];
            boid.update(flock, deltaT);
            boid.draw();
        }
    }

    lastTimestamp = timestamp;
    window.requestAnimationFrame(gameLoop);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
