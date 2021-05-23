import { Boid } from './boid.js';
import { WORLD } from "./world.js";

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
        const boid = new Boid(i);
        boid.updateBoid();
    }

}

init();
