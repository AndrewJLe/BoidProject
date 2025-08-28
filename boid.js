import { WORLD } from "./world.js";
import { distance2D } from "./utils.js";
import { Vector2D } from "./vector.js";

// Constants for better performance and readability
const DEGREES_TO_RADIANS = Math.PI / 180;
const DEFAULT_COEFFICIENTS = {
    SEPARATION: 1e-2 * 25,
    COHESION: 1e-2 * 25,
    ALIGNMENT: 1e-3 * 25,
    REPEL: 0.5,
    GRAVITY: 2
};

const DEFAULT_SETTINGS = {
    MAX_SPEED: 3,
    RANGE: 150,
    FOV_ANGLE: 130 * DEGREES_TO_RADIANS,
    WALL_OFFSET: 20,
    GRAVITY_OFFSET: -10
};

// Boid object
class Boid {
    // Pre-allocate vectors to avoid garbage collection
    static _tempVector = new Vector2D(0, 0);
    static _tempVector2 = new Vector2D(0, 0);
    static _tempVector3 = new Vector2D(0, 0);

    constructor({ id, isHighlighted }) {
        this.id = id;
        this.highlighted = isHighlighted;

        // Configuration
        this.maxSpeed = DEFAULT_SETTINGS.MAX_SPEED;
        this.range = DEFAULT_SETTINGS.RANGE;
        this.leftSideFOV = DEFAULT_SETTINGS.FOV_ANGLE;
        this.rightSideFOV = DEFAULT_SETTINGS.FOV_ANGLE;

        // Coefficients
        this.separationCoefficient = DEFAULT_COEFFICIENTS.SEPARATION;
        this.cohereCoefficient = DEFAULT_COEFFICIENTS.COHESION;
        this.alignCoefficient = DEFAULT_COEFFICIENTS.ALIGNMENT;

        // State
        this.FOVEnabled = false; // Default to false for all boids
        this.neighbors = new Set();
        this.neighborLineElements = {};
        this.neighborDistances = new Map(); // Cache distances

        // Display flags
        this.showAlign = false;
        this.showCohere = false;
        this.showSeparate = false;
        this.showNeighbors = false;
        this.showRepel = isHighlighted;

        // Vectors
        this.position = new Vector2D(
            Math.random() * WORLD.CANVAS_WIDTH,
            Math.random() * WORLD.CANVAS_HEIGHT
        );
        this.velocity = this._initializeVelocity();

        // DOM elements
        this.initializeDOMElements(isHighlighted);
    }

    _initializeVelocity() {
        const velocity = new Vector2D(Math.random() * 10 - 5, Math.random() * 10 - 5);
        velocity.scale(this.maxSpeed);
        return velocity;
    }

    initializeDOMElements(isHighlighted) {
        this._createBoidElement();

        if (isHighlighted) {
            this._createSteerElements();
            // Only create FOV elements if FOV is enabled
            if (this.FOVEnabled) {
                this._createFOVElements();
            }
        }
    }

    _createBoidElement() {
        this.boidElement = document.createElement("div");
        this.boidElement.setAttribute("id", "boid" + this.id);
        this.boidElement.classList.add("boids");
        document.getElementById("canvas").appendChild(this.boidElement);
    }

    _createSteerElements() {
        const steerTypes = ['separate', 'cohere', 'align', 'repel'];
        steerTypes.forEach(type => {
            const element = document.createElement("div");
            element.classList.add(`${type}-line`);
            document.getElementById("canvas").appendChild(element);
            this[`${type}SteerElement`] = element;
        });
    }

    update(flock, deltaT) {
        // Update neighbor information
        this.findNeighborsWithinRange(flock);

        // Apply boid behaviors
        this._applyBoidRules(deltaT);

        // Apply movement constraints
        this._applyConstraints(deltaT);

        // Move the boid
        this._updatePosition(deltaT);
    }

    _applyBoidRules(deltaT) {
        this.separate(deltaT);
        this.cohere(deltaT);
        this.align(deltaT);
        this.speedControl();
    }

    _applyConstraints(deltaT) {
        this.repel(deltaT);
        this.superGravity(deltaT);
    }

    _updatePosition(deltaT) {
        // Reuse temp vector to avoid allocation
        Boid._tempVector.x = this.velocity.x * deltaT;
        Boid._tempVector.y = this.velocity.y * deltaT;
        this.position.add(Boid._tempVector);
    }

    /**
     * Optimized wall repulsion with unified logic
     */
    repel(deltaT) {
        const { CANVAS_HEIGHT, CANVAS_WIDTH } = WORLD;
        const offset = DEFAULT_SETTINGS.WALL_OFFSET;

        // Reset temp vector
        Boid._tempVector.x = 0;
        Boid._tempVector.y = 0;

        // Check each wall and apply repulsion
        this._checkWallRepulsion(this.position.x, CANVAS_WIDTH - offset, -1, 0, Boid._tempVector);
        this._checkWallRepulsion(offset - this.position.x, this.range, 1, 0, Boid._tempVector);
        this._checkWallRepulsion(this.position.y, CANVAS_HEIGHT - offset, 0, -1, Boid._tempVector);
        this._checkWallRepulsion(offset - this.position.y, this.range, 0, 1, Boid._tempVector);

        // Apply the accumulated repulsion force
        if (Boid._tempVector.x !== 0 || Boid._tempVector.y !== 0) {
            Boid._tempVector.scale(deltaT * DEFAULT_COEFFICIENTS.REPEL);
            this.velocity.add(Boid._tempVector);
        }
    }

    _checkWallRepulsion(distance, threshold, dirX, dirY, accumulator) {
        if (distance > threshold - this.range && distance < threshold) {
            const distanceFromWall = Math.abs(threshold - distance);
            const strengthRatio = Math.pow(1 - (distanceFromWall / this.range), 2);
            accumulator.x += dirX * strengthRatio;
            accumulator.y += dirY * strengthRatio;
        }
    }

    /**
     * Simplified super gravity implementation
     */
    superGravity(deltaT) {
        const { CANVAS_HEIGHT, CANVAS_WIDTH } = WORLD;
        const offset = DEFAULT_SETTINGS.GRAVITY_OFFSET;

        // Check if boid is near any boundary
        const nearBoundary = (
            this.position.x > CANVAS_WIDTH + offset ||
            this.position.x < -offset ||
            this.position.y > CANVAS_HEIGHT + offset ||
            this.position.y < -offset
        );

        if (nearBoundary) {
            // Calculate direction to center
            Boid._tempVector.x = CANVAS_WIDTH / 2 - this.position.x;
            Boid._tempVector.y = CANVAS_HEIGHT / 2 - this.position.y;

            const steer = this.steerTowardsTarget(Boid._tempVector);
            steer.scale(DEFAULT_COEFFICIENTS.GRAVITY * deltaT);
            this.velocity.add(steer);
        }
    }

    /**
     * Toggle FOV state and update visuals accordingly
     */
    toggleFOV() {
        this.FOVEnabled = !this.FOVEnabled;
        this.updateFOVDisplay();
    }

    /**
     * Update FOV display based on current FOVEnabled state
     */
    updateFOVDisplay() {
        if (this.FOVEnabled) {
            if (!this.SVGElement) {
                this._createFOVElements();
            }
            if (this.BlindSpotElement) {
                this.BlindSpotElement.setAttribute('stroke-opacity', '0.3');
            }
        } else {
            if (this.BlindSpotElement) {
                this.BlindSpotElement.setAttribute('stroke-opacity', '0');
            }
        }
    }

    _createFOVElements() {
        const circumference = Math.PI * this.range;
        const viewPercentage = ((2 * this.leftSideFOV / DEGREES_TO_RADIANS) / 360) * 100;

        // Create SVG container
        this.SVGElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this._setSVGAttributes(this.SVGElement, this.range * 2);

        // Create blindspot circle
        this.BlindSpotElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this._setBlindSpotAttributes(this.BlindSpotElement, this.range, circumference, viewPercentage);

        this.SVGElement.appendChild(this.BlindSpotElement);
        this.boidElement.appendChild(this.SVGElement);
    }

    _setSVGAttributes(svg, size) {
        svg.setAttribute("height", size);
        svg.setAttribute("width", size);
        svg.classList.add("FOV");
    }

    _setBlindSpotAttributes(circle, range, circumference, viewPercentage) {
        const radius = range / 2;
        const attributes = {
            "height": range * 2,
            "width": range * 2,
            "cx": range,
            "cy": range,
            "r": radius,
            "fill": "none",
            "stroke": "grey",
            "stroke-opacity": this.FOVEnabled ? "0.3" : "0",
            "stroke-width": range,
            "stroke-dasharray": `${viewPercentage * circumference / 100} ${circumference}`
        };

        Object.entries(attributes).forEach(([key, value]) => {
            circle.setAttribute(key, value);
        });

        circle.classList.add("blindspot");
    }

    _removeFOVElements() {
        if (this.SVGElement) {
            this.SVGElement.remove();
            this.SVGElement = null;
            this.BlindSpotElement = null;
        }
    }

    /**
     * Optimized speed control using in-place normalization
     */
    speedControl() {
        const magnitude = this.velocity.magnitude();
        if (magnitude > 0) {
            const scale = this.maxSpeed / magnitude;
            this.velocity.scale(scale);
        }
    }

    /**
     * Optimized neighbor finding with distance caching
     */
    findNeighborsWithinRange(flock) {
        // Clear previous neighbor distances
        this.neighborDistances.clear();

        for (const otherBoid of flock) {
            if (otherBoid === this) continue;

            const distance = distance2D(
                [this.position.x, this.position.y],
                [otherBoid.position.x, otherBoid.position.y]
            );

            if (distance <= this.range) {
                // Cache the distance for later use
                this.neighborDistances.set(otherBoid, distance);

                if (this._isInFieldOfView(otherBoid)) {
                    this.neighbors.add(otherBoid);
                } else {
                    this.neighbors.delete(otherBoid);
                }
            } else {
                this.neighbors.delete(otherBoid);
            }
        }

        return this.neighbors;
    }

    _isInFieldOfView(otherBoid) {
        // Calculate vector from this boid to other boid (reuse temp vector)
        Boid._tempVector.x = otherBoid.position.x - this.position.x;
        Boid._tempVector.y = otherBoid.position.y - this.position.y;

        const angleBetween = this.velocity.angleBetweenVectors(Boid._tempVector);
        return angleBetween > -this.leftSideFOV && angleBetween < this.rightSideFOV;
    }

    /**
     * Optimized separation with cached distances
     */
    separate(deltaT) {
        if (this.neighbors.size === 0) return;

        // Reset temp vector for accumulation
        Boid._tempVector.x = 0;
        Boid._tempVector.y = 0;

        for (const neighbor of this.neighbors) {
            const distance = this.neighborDistances.get(neighbor);
            if (!distance) continue;

            // Calculate separation direction (reuse temp vector 2)
            Boid._tempVector2.x = this.position.x - neighbor.position.x;
            Boid._tempVector2.y = this.position.y - neighbor.position.y;

            const steer = this.steerTowardsTarget(Boid._tempVector2);
            const strengthRatio = Math.pow(1 - (distance / this.range), 2);
            const steerStrength = strengthRatio * this.separationCoefficient;

            steer.scale(steerStrength);
            Boid._tempVector.add(steer);
        }

        this._drawSteerVector(this.separateSteerElement, Boid._tempVector, 100, this.showSeparate);

        Boid._tempVector.scale(deltaT);
        this.velocity.add(Boid._tempVector);
    }

    /**
     * Optimized alignment behavior
     */
    align(deltaT) {
        if (this.neighbors.size === 0) return;

        // Calculate average velocity
        Boid._tempVector.x = 0;
        Boid._tempVector.y = 0;

        for (const neighbor of this.neighbors) {
            Boid._tempVector.add(neighbor.velocity);
        }

        Boid._tempVector.scale(1 / this.neighbors.size);
        const steer = this.steerTowardsTarget(Boid._tempVector);
        steer.scale(this.alignCoefficient);

        this._drawSteerVector(this.alignSteerElement, steer, 2000, this.showAlign);

        steer.scale(deltaT);
        this.velocity.add(steer);
    }

    /**
     * Optimized cohesion behavior
     */
    cohere(deltaT) {
        if (this.neighbors.size === 0) return;

        // Calculate center of mass
        Boid._tempVector.x = 0;
        Boid._tempVector.y = 0;

        for (const neighbor of this.neighbors) {
            Boid._tempVector.add(neighbor.position);
        }

        Boid._tempVector.scale(1 / this.neighbors.size);

        // Calculate direction to center of mass
        Boid._tempVector2.x = Boid._tempVector.x - this.position.x;
        Boid._tempVector2.y = Boid._tempVector.y - this.position.y;

        const steer = this.steerTowardsTarget(Boid._tempVector2);
        steer.scale(this.cohereCoefficient);

        this._drawSteerVector(this.cohereSteerElement, steer, 300, this.showCohere);

        steer.scale(deltaT);
        this.velocity.add(steer);
    }

    /**
     * Helper method for drawing steer vectors
     */
    _drawSteerVector(element, vector, scale, shouldDraw) {
        if (!element) return;

        if (!shouldDraw) {
            // Fully hide the element so stale vectors are not visible and it doesn't affect layout
            try {
                element.style.display = 'none';
                element.style.height = '0px';
                element.style.transform = 'none';
            } catch (e) {
                // defensive: ignore DOM write errors
            }
            return;
        }

        // Ensure element is visible when we need to draw
        try {
            element.style.display = 'block';
        } catch (e) {
            /* ignore */
        }

        Boid._tempVector3.x = vector.x * scale;
        Boid._tempVector3.y = vector.y * scale;
        this.drawLine(element, Boid._tempVector3);
    }

    /**
     * Optimized steer calculation that modifies input vector
     */
    steerTowardsTarget(desiredDirection) {
        const magnitude = desiredDirection.magnitude();
        if (magnitude === 0) return new Vector2D(0, 0);

        // Normalize in-place for efficiency
        const scale = this.maxSpeed / magnitude;
        desiredDirection.scale(scale);

        // Calculate steering force
        const steer = new Vector2D(
            desiredDirection.x - this.velocity.x,
            desiredDirection.y - this.velocity.y
        );

        return steer.normalize();
    }

    /**
     * Optimized line drawing with fewer calculations
     */
    drawLine(lineElement, vector, styles = {}) {
        if (!lineElement) return;

        // Use temp vector to avoid modifying input
        Boid._tempVector3.x = vector.x;
        Boid._tempVector3.y = vector.y;

        // Clamp vector to range
        const magnitude = Boid._tempVector3.magnitude();
        if (magnitude > this.range) {
            const scale = this.range / magnitude;
            Boid._tempVector3.scale(scale);
        }

        const lineLength = Boid._tempVector3.magnitude();
        if (lineLength === 0) return;

        // Calculate position and rotation
        const offset = 8;
        const translationX = this.position.x + offset + Boid._tempVector3.x / 2;
        const translationY = this.position.y + offset + Boid._tempVector3.y / 2 - (lineLength / 2);
        const rotationInRadians = Math.PI / 2 + Boid._tempVector3.angle();

        // Apply styles and transforms
        const transform = `translate(${translationX}px, ${translationY}px) rotate(${rotationInRadians}rad)`;

        lineElement.style.display = 'block';
        lineElement.style.transform = transform;
        lineElement.style.height = `${lineLength}px`;

        // Apply custom styles
        Object.assign(lineElement.style, styles);
    }

    /**
     * Main drawing method with optimized conditional rendering
     */
    draw() {
        this.drawBoid();

        if (this.highlighted) {
            this.drawNeighbors();
        }
    }

    /**
     * Optimized boid drawing with cached transforms
     */
    drawBoid() {
        const rotationInRadians = this.velocity.angle();
        const transform = `translate(${this.position.x}px, ${this.position.y}px) rotateZ(${rotationInRadians}rad)`;
        this.boidElement.style.transform = transform;
    }

    /**
     * Debug method for logging boid details
     */
    logBoidDetails() {
        console.log(`Boid ${this.id}: pos(${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}) vel(${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)})`);
    }

    /**
     * Optimized neighbor line drawing with better cleanup
     */
    drawNeighbors() {
        if (!this.showNeighbors) {
            this._hideAllNeighborLines();
            return;
        }

        if (this.neighbors.size === 0) {
            this._hideAllNeighborLines();
            return;
        }

        // Clean up lines for boids no longer in range
        this._cleanupOutOfRangeLines();

        // Draw lines to current neighbors
        for (const neighbor of this.neighbors) {
            this.drawLineToOtherBoid(neighbor);
        }
    }

    _cleanupOutOfRangeLines() {
        const currentNeighborIds = new Set([...this.neighbors].map(b => b.id));

        for (const boidId of Object.keys(this.neighborLineElements)) {
            if (!currentNeighborIds.has(parseInt(boidId))) {
                this.neighborLineElements[boidId]?.remove();
                delete this.neighborLineElements[boidId];
            }
        }
    }

    _cleanupAllNeighborLines() {
        Object.values(this.neighborLineElements).forEach(element => element?.remove());
        this.neighborLineElements = {};
    }

    _hideAllNeighborLines() {
        Object.values(this.neighborLineElements).forEach(element => {
            if (element) element.style.display = 'none';
        });
    }

    /**
     * Optimized line drawing to other boids
     */
    drawLineToOtherBoid(otherBoid) {
        if (!this.showNeighbors) return;

        let lineElement = this.neighborLineElements[otherBoid.id];
        if (!lineElement) {
            lineElement = this._createNeighborLineElement(otherBoid);
        }

        // Use cached distance if available
        const distance = this.neighborDistances.get(otherBoid) ||
            distance2D([this.position.x, this.position.y], [otherBoid.position.x, otherBoid.position.y]);

        // Calculate vector to other boid
        Boid._tempVector.x = otherBoid.position.x - this.position.x;
        Boid._tempVector.y = otherBoid.position.y - this.position.y;

        // Calculate line styles based on distance
        const distanceRatio = (this.range - distance) / this.range;
        const styles = {
            width: `${Math.sqrt(5 * distanceRatio)}px`,
            opacity: `${100 * distanceRatio}%`
        };

        this.drawLine(lineElement, Boid._tempVector, styles);
    }

    _createNeighborLineElement(otherBoid) {
        const lineElement = document.createElement("div");
        lineElement.classList.add("neighbor-line");
        lineElement.setAttribute("id", `${this.id}-to-${otherBoid.id}`);

        this.neighborLineElements[otherBoid.id] = lineElement;
        document.getElementById("canvas").appendChild(lineElement);

        return lineElement;
    }
}

export { Boid }