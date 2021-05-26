import { WORLD, appendFlock, flock } from "./world.js";
import { HIGHLIGHT_CONFIG } from "./config.js";
import { distance2D } from "./utils.js";

// Boid object
class Boid {
    FOVEnabled = false;
    nearestNeigbhorEnabled = false;

    neighbors = new Set();
    neighborLineElements = {};

    constructor({ id, isHighlighted }) {
        this.id = id;
        this.highlighted = isHighlighted;

        // Model position
        this.positionX = (Math.random() * WORLD.CANVAS_WIDTH);
        this.positionY = (Math.random() * WORLD.CANVAS_HEIGHT);

        // Model velocity
        this.velocityX = Math.random() * (Math.random() < 0.5 ? -1 : 1);
        this.velocityY = Math.random() * (Math.random() < 0.5 ? -1 : 1);

        // Model field of vision
        this.range = 125;

        this.initializeDOMElements(isHighlighted);
    }

    initializeDOMElements(isHighlighted) {
        // Add boid element
        this.boidElement = document.createElement("div");
        this.boidElement.setAttribute("id", "boid" + this.id);
        this.boidElement.classList.add("boids");
        document.getElementById("canvas").appendChild(this.boidElement);

        // Determines whether to draw FOV or other details
        if (isHighlighted) {
            this.toggleFOV();
        }
    }

    update(flock, timestamp) {
        this.findNeighborsWithinRange(flock);
        this.moveBoid();
    }

    /**
     * Move the boid's position
    */
    moveBoid() {
        const { CANVAS_HEIGHT, CANVAS_WIDTH } = WORLD;
        const deltaT = 1;
        const offset = 50;
        this.positionX += this.velocityX * deltaT;
        this.positionY += -this.velocityY * deltaT;

        /**
         * If the boid has moved out of the canvas, wrap it back into the canvas
         */
        if (this.positionX > CANVAS_WIDTH) {
            this.positionX = -offset;
        }
        else if (this.positionX < -offset) {
            this.positionX = CANVAS_WIDTH;
        }

        if (this.positionY > CANVAS_HEIGHT) {
            this.positionY = 0;
        }
        else if (this.positionY < -offset) {
            this.positionY = CANVAS_HEIGHT;
        }
    }

    toggleFOV() {
        if (!this.FOVEnabled) {
            this.FOVElement = document.createElement("div");
            this.FOVElement.classList.add("FOV");
            this.FOVElement.style.width = `${this.range * 2}px`;
            this.FOVElement.style.height = `${this.range * 2}px`;
            this.boidElement.appendChild(this.FOVElement);
        } else {
            this.FOVElement.remove();
        }

        this.FOVEnabled = !this.FOVEnabled
    }

    /**
     * Display boid into the DOM
     */
    draw() {
        if (this.highlighted) {
            this.drawNeighbors();
        }

        this.drawBoid();
    }

    logBoidDetails() {
        console.log("boid id: " + this.id);
        console.log("position x: " + this.positionX);
        console.log("position y: " + this.positionY);
        console.log("velocity x: " + this.velocityX);
        console.log("velocity y: " + this.velocityY);
    }

    /**
     * Draws the boid body
     */
    drawBoid() {
        const styles = {};

        const transforms = [];

        const positionTransform = `translate(${this.positionX}px, ${this.positionY}px)`;
        transforms.push(positionTransform);

        const rotationInRadians = -Math.atan2(this.velocityY, this.velocityX);
        const rotationTransform = `rotateZ(${rotationInRadians}rad)`;
        transforms.push(rotationTransform);

        styles.transform = transforms.join(" ");

        Object.entries(styles).forEach(([CSSProperty, value]) => {
            this.boidElement.style[CSSProperty] = value;
        });
    }

    /**
     * Draws lines to the neighbors
     */
    drawNeighbors() {
        /**
         * Clean now out of range boids
         */

        // Find which birds are now out of range
        const outOfRangeBoidIds = new Set(Object.keys(this.neighborLineElements));
        this.neighbors.forEach((neighborBoid) => {
            // Remove boids still in range
            outOfRangeBoidIds.delete(neighborBoid.id);
        });

        // Delete the line DOM elements for out of range boids and delete from the hash table
        outOfRangeBoidIds.forEach((outOfRangeBoidId) => {
            this.neighborLineElements[outOfRangeBoidId]?.remove();
            delete this.neighborLineElements[outOfRangeBoidId];
        })

        if (this.neighbors.size === 0) return;

        this.neighbors.forEach((neighborBoid) => this.drawLineToOtherBoid(neighborBoid));
    }

    drawLineToOtherBoid(otherBoid) {
        // Check hash table to see if the line DOM element is already created.
        let lineElement = this.neighborLineElements[otherBoid.id];
        if (!lineElement) {
            // If the DOM element is not created, then create it
            lineElement = document.createElement("div");
            lineElement.classList.add("neighbor-line");
            lineElement.setAttribute("id", `${this.id}-to-${otherBoid.id}`)

            // Record this DOM element in hash table
            this.neighborLineElements[otherBoid.id] = lineElement;
            document.getElementById("canvas").appendChild(lineElement);
        }

        // Use the distance between the points as the line length
        const lineLength = distance2D(this.positionX, this.positionY, otherBoid.positionX, otherBoid.positionY);
        lineElement.style.height = `${lineLength}px`;

        lineElement.style.width = `${Math.sqrt(5 * (this.range - lineLength) / this.range)}px`;

        const transforms = [];

        // Vector [X, Y] is the vector that points from this boid, to the other boid
        const vectorX = otherBoid.positionX - this.positionX;
        const vectorY = otherBoid.positionY - this.positionY;

        /**
         * The line is rotated about its center. So we need to move the center of the line to the point
         * exactly halfway between the boids.
         */
        const translationX = this.positionX + vectorX / 2;
        const translationY = this.positionY + vectorY / 2 - lineLength / 2; // Line length needed to cancel the height of the div I guess.
        transforms.push(`translate(${translationX}px, ${translationY}px)`)

        /**
         * Rotate the line to point from this boid to the other boid
         * Since vector [X, Y] points from this boid to the other boid, we can pass this to atan2
         */
        const rotationInRadians = -Math.atan2(vectorX, vectorY);
        transforms.push(`rotate(${rotationInRadians}rad)`);

        lineElement.style.transform = transforms.join(" ");
    }

    /**
     * Avoid nearby boids
     */
    separate() {

    }

    /**
     * Move towards average direction of nearby boids
     */
    Align() {

    }

    /**
     * Fly towards center of mass
     */
    cohere() {
    }

    /**
     * Find n closest/neighboring boids
     */
    nClosestBoids(boid, n) {

    }

    /**
     * Find neighbors within this boid's range
     */
    findNeighborsWithinRange(flock) {
        flock.forEach((otherBoid) => {
            if (otherBoid === this) return;

            if (this.range >= distance2D(this.positionX, this.positionY, otherBoid.positionX, otherBoid.positionY)) {
                this.neighbors.add(otherBoid)
            } else {
                this.neighbors.delete(otherBoid)
            }
        });

        return this.neighbors;
    }
}

export { Boid };