import { WORLD } from "./world.js";
import { distance2D } from "./utils.js";
import { Vector2D } from "./vector.js";

// Constants for the Boids algorithm following the original pseudocode
const DEGREES_TO_RADIANS = Math.PI / 180;

// Rule coefficients following the original algorithm but with adjustments for smoother behavior
const BOIDS_RULES = {
    COHESION_FACTOR: 500,
    SEPARATION_DISTANCE: 15,
    ALIGNMENT_FACTOR: 50
};

const DEFAULT_SETTINGS = {
    MAX_SPEED: 4.0,           // Speed limit as described in pseudocode
    MIN_SPEED: 3.0,           // Minimum speed to keep moving
    RANGE: 150,               // Neighbor detection range
    FOV_ANGLE: 180 * DEGREES_TO_RADIANS,
};

// Boid object
class Boid {
    // Pre-allocate vectors to avoid garbage collection
    static _tempVector = new Vector2D(0, 0);
    static _tempVector2 = new Vector2D(0, 0);
    static _tempVector3 = new Vector2D(0, 0);
    // Global toggle for ghost trails - defaults to false for better performance
    static ghostTrailEnabled = false;

    constructor({ id, isHighlighted }) {
        this.id = id;
        this.highlighted = isHighlighted;

        // Configuration
        this.maxSpeed = DEFAULT_SETTINGS.MAX_SPEED;
        this.range = DEFAULT_SETTINGS.RANGE;
        this.leftSideFOV = DEFAULT_SETTINGS.FOV_ANGLE;
        this.rightSideFOV = DEFAULT_SETTINGS.FOV_ANGLE;

        // Coefficients - these will be multiplied by the rule factors
        this.separationCoefficient = 1.0;
        this.cohereCoefficient = 1.0;
        this.alignCoefficient = 1.0;

        // State
        this.FOVEnabled = false; // Default to false for all boids
        this.neighbors = new Set();
        this.neighborLineElements = {};
        this.neighborDistances = new Map(); // Cache distances

        // Trail system for ghost effect
        this.trailPositions = [];
        this.maxTrailLength = 12;
        this.trailElements = [];

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

        // Create trail elements
        this._createTrailElements();
    }

    _createTrailElements() {
        for (let i = 0; i < this.maxTrailLength; i++) {
            const trailElement = document.createElement("div");
            trailElement.classList.add("boid-trail");
            trailElement.style.opacity = "0";
            // Respect the global ghost trail flag when inserting elements
            if (!Boid.ghostTrailEnabled) {
                trailElement.style.display = 'none';
            }
            document.getElementById("canvas").appendChild(trailElement);
            this.trailElements.push(trailElement);
        }
    }

    /**
     * Set color for boid and its trail
     */
    setColor(color) {
        this.boidElement.style.borderLeftColor = color;
        this.trailElements.forEach(trail => {
            trail.style.borderLeftColor = color;
        });
    }

    /**
     * Set the trail length dynamically
     */
    setTrailLength(newLength) {
        const oldLength = this.maxTrailLength;
        this.maxTrailLength = Math.max(3, Math.min(25, newLength)); // Clamp between 3 and 25

        // If increasing trail length, create new trail elements
        if (this.maxTrailLength > oldLength) {
            for (let i = oldLength; i < this.maxTrailLength; i++) {
                const trailElement = document.createElement("div");
                trailElement.classList.add("boid-trail");
                trailElement.style.opacity = "0";
                if (!Boid.ghostTrailEnabled) {
                    trailElement.style.display = 'none';
                }
                // Set the same color as existing trail elements
                if (this.trailElements.length > 0) {
                    trailElement.style.borderLeftColor = this.trailElements[0].style.borderLeftColor;
                }
                document.getElementById("canvas").appendChild(trailElement);
                this.trailElements.push(trailElement);
            }
        }
        // If decreasing trail length, remove excess elements
        else if (this.maxTrailLength < oldLength) {
            for (let i = oldLength - 1; i >= this.maxTrailLength; i--) {
                if (this.trailElements[i]) {
                    this.trailElements[i].remove();
                    this.trailElements.pop();
                }
            }
        }

        // Trim trail positions to match new length
        if (this.trailPositions.length > this.maxTrailLength) {
            this.trailPositions = this.trailPositions.slice(0, this.maxTrailLength);
        }
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

        // Apply the three boids rules following the original pseudocode
        const v1 = this.rule1(flock); // Cohesion: fly towards center of mass
        const v2 = this.rule2(flock); // Separation: keep distance from others
        const v3 = this.rule3(flock); // Alignment: match velocity with neighbors

        // Additional rules for boundary behavior
        const v4 = this.boundPosition();
        // const v5 = this.tendToPlace(); // Optional: tendency towards center

        // Apply all velocity changes
        this.velocity.add(v1);
        this.velocity.add(v2);
        this.velocity.add(v3);
        this.velocity.add(v4);
        // this.velocity.add(v5);

        // Limit velocity as described in the pseudocode
        this.limitVelocity();

        // Update position: position = position + velocity
        const movement = new Vector2D(this.velocity.x * deltaT, this.velocity.y * deltaT);
        this.position.add(movement);
    }

    /**
     * Rule 1: Boids try to fly towards the centre of mass of neighbouring boids
     * Updated to only consider neighbors within range for better performance
     */
    rule1(flock) {
        // If cohesion coefficient is 0, don't apply this rule at all
        if (this.cohereCoefficient <= 0) {
            // Still draw visualization if needed (but with zero force)
            this._drawSteerVector(this.cohereSteerElement, new Vector2D(0, 0), 300, this.showCohere);
            return new Vector2D(0, 0);
        }

        const pcJ = new Vector2D(0, 0); // perceived center
        let count = 0;

        // Calculate center of mass of neighbors within range (excluding this one)
        for (const boid of this.neighbors) {
            pcJ.add(boid.position);
            count++;
        }

        if (count === 0) {
            return new Vector2D(0, 0);
        }

        // Get the average position (center of mass)
        pcJ.scale(1 / count);

        // Move 1% of the way towards the center (as per pseudocode)
        const cohesionForce = new Vector2D(
            (pcJ.x - this.position.x) / BOIDS_RULES.COHESION_FACTOR,
            (pcJ.y - this.position.y) / BOIDS_RULES.COHESION_FACTOR
        );

        // Apply user coefficient
        cohesionForce.scale(this.cohereCoefficient);

        // Visualization
        this._drawSteerVector(this.cohereSteerElement, cohesionForce, 300, this.showCohere);

        return cohesionForce;
    }

    /**
     * Rule 2: Boids try to keep a small distance away from other objects
     * Updated to only affect neighbors within range with distance-based scaling
     */
    rule2(flock) {
        // If separation coefficient is 0, don't apply this rule at all
        if (this.separationCoefficient <= 0) {
            // Still draw visualization if needed (but with zero force)
            this._drawSteerVector(this.separateSteerElement, new Vector2D(0, 0), 100, this.showSeparate);
            return new Vector2D(0, 0);
        }

        const c = new Vector2D(0, 0);

        for (const boid of this.neighbors) {
            const distance = this.neighborDistances.get(boid);
            if (!distance) continue;

            // If within separation distance, move away
            if (distance < BOIDS_RULES.SEPARATION_DISTANCE && distance > 0) {
                const displacement = new Vector2D(
                    boid.position.x - this.position.x,
                    boid.position.y - this.position.y
                );

                // Scale displacement by inverse of distance (closer = stronger repulsion)
                const repulsionStrength = (BOIDS_RULES.SEPARATION_DISTANCE - distance) / BOIDS_RULES.SEPARATION_DISTANCE;
                displacement.scale(repulsionStrength);

                c.subtract(displacement);
            }
        }

        // Apply user coefficient
        c.scale(this.separationCoefficient);

        // Visualization
        this._drawSteerVector(this.separateSteerElement, c, 100, this.showSeparate);

        return c;
    }    /**
     * Rule 3: Boids try to match velocity with near boids
     * Updated to only consider neighbors within range
     */
    rule3(flock) {
        // If alignment coefficient is 0, don't apply this rule at all
        if (this.alignCoefficient <= 0) {
            // Still draw visualization if needed (but with zero force)
            this._drawSteerVector(this.alignSteerElement, new Vector2D(0, 0), 500, this.showAlign);
            return new Vector2D(0, 0);
        }

        const pvJ = new Vector2D(0, 0); // perceived velocity
        let count = 0;

        // Calculate average velocity of neighbors within range
        for (const boid of this.neighbors) {
            pvJ.add(boid.velocity);
            count++;
        }

        if (count === 0) {
            return new Vector2D(0, 0);
        }

        // Get the average velocity
        pvJ.scale(1 / count);

        // Return 1/8 of the difference between average and current velocity
        const alignmentForce = new Vector2D(
            (pvJ.x - this.velocity.x) / BOIDS_RULES.ALIGNMENT_FACTOR,
            (pvJ.y - this.velocity.y) / BOIDS_RULES.ALIGNMENT_FACTOR
        );

        // Apply user coefficient
        alignmentForce.scale(this.alignCoefficient);

        // Visualization
        this._drawSteerVector(this.alignSteerElement, alignmentForce, 500, this.showAlign);

        return alignmentForce;
    }

    /**
     * Limiting the speed as described in the pseudocode
     */
    limitVelocity() {
        const vlim = this.maxSpeed;
        const magnitude = this.velocity.magnitude();

        if (magnitude > vlim) {
            // Create unit vector and multiply by speed limit
            this.velocity.scale(vlim / magnitude);
        }

        // Also ensure minimum speed to keep boids moving
        if (magnitude < DEFAULT_SETTINGS.MIN_SPEED && magnitude > 0) {
            this.velocity.scale(DEFAULT_SETTINGS.MIN_SPEED / magnitude);
        }
    }

    /**
     * Bounding the position as described in the pseudocode
     */
    boundPosition() {
        const v = new Vector2D(0, 0);
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = WORLD;
        const margin = 20;

        if (this.position.x < margin) {
            v.x = 10;
        } else if (this.position.x > CANVAS_WIDTH - margin) {
            v.x = -10;
        }

        if (this.position.y < margin) {
            v.y = 10;
        } else if (this.position.y > CANVAS_HEIGHT - margin) {
            v.y = -10;
        }

        return v;
    }

    /**
     * Tendency towards a particular place (center of screen)
     */
    tendToPlace() {
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = WORLD;
        const center = new Vector2D(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

        // Only apply if boid is far from center
        const distanceFromCenter = distance2D(
            [this.position.x, this.position.y],
            [center.x, center.y]
        );

        if (distanceFromCenter > Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 3) {
            return new Vector2D(
                (center.x - this.position.x) / 100,
                (center.y - this.position.y) / 100
            );
        }

        return new Vector2D(0, 0);
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
     * Helper method for drawing steer vectors
     */
    _drawSteerVector(element, vector, scale, shouldDraw) {
        if (!element) return;

        // Hide element if not drawing or if vector is zero (no force)
        if (!shouldDraw || (vector.x === 0 && vector.y === 0)) {
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
     * Find neighbors for visualization purposes (the core rules use the entire flock)
     */
    findNeighborsWithinRange(flock) {
        // Clear previous neighbor distances
        this.neighborDistances.clear();
        this.neighbors.clear();

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
                }
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
     * Main drawing method with trail effects and optimized conditional rendering
     */
    draw() {
        // Only update and draw trails when the global flag is enabled.
        if (Boid.ghostTrailEnabled) {
            this._updateTrail();
            this._drawTrail();
        } else {
            // If trails are disabled, ensure all trail elements are hidden to avoid stale visuals
            try {
                this.trailElements.forEach(el => {
                    if (el) {
                        el.style.opacity = '0';
                        el.style.display = 'none';
                    }
                });
            } catch (e) {
                // ignore DOM write errors
            }
        }

        this.drawBoid();

        if (this.highlighted) {
            this.drawNeighbors();
        }
    }

    /**
     * Update trail positions
     */
    _updateTrail() {
        // Add current position to trail
        this.trailPositions.unshift({
            x: this.position.x,
            y: this.position.y,
            angle: this.velocity.angle()
        });

        // Limit trail length
        if (this.trailPositions.length > this.maxTrailLength) {
            this.trailPositions.pop();
        }
    }

    /**
     * Draw the ghost trail effect
     */
    _drawTrail() {
        this.trailPositions.forEach((pos, index) => {
            if (index > 0 && index < this.trailElements.length) {
                const trailElement = this.trailElements[index - 1];
                const opacity = (this.maxTrailLength - index) / this.maxTrailLength * 0.6;
                const scale = (this.maxTrailLength - index) / this.maxTrailLength * 0.8 + 0.2;

                trailElement.style.opacity = opacity;
                trailElement.style.transform = `translate(${pos.x}px, ${pos.y}px) rotateZ(${pos.angle}rad) scale(${scale})`;
            }
        });
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