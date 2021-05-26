import { Boid } from './boid.js';
import { WORLD, appendFlock, flock } from "./world.js";

function init() {
    /**
     * Initialize Canvas
     */
    const canvasElement = document.createElement("div");
    canvasElement.setAttribute("id", "canvas");
    canvasElement.classList.add("canvas");
    canvasElement.style.width = `${WORLD.CANVAS_WIDTH}px`;
    canvasElement.style.height = `${WORLD.CANVAS_HEIGHT}px`;
    document.getElementById("canvas-container").appendChild(canvasElement);

    /**
     * Initialize Boids
     */
    for (let i = 0; i < WORLD.NUM_BOIDS; i++) {
        const isHighlighted = i === 0;
        const boid = new Boid({ id: i, isHighlighted });
        appendFlock(boid);
    }

    gameLoop(0);
}

let lastTimestamp;

function gameLoop(timestamp) {
    for (let i = 0; i < flock.length; i++) {
        const boid = flock[i];
        boid.update(flock);
        boid.draw();
    }
    window.requestAnimationFrame(gameLoop);
}

init();
console.log(flock);
