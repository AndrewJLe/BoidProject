import { WORLD } from "./world.js";
import { distance2D } from "./utils.js";
import { Vector2D } from "./vector.js";

/**
 * Conversion constant from degrees to radians.
 * @const {number}
 */
const DEGREES_TO_RADIANS = Math.PI / 180;

/**
 * Constants that influence the math of the three boids rules.
 * @enum {number}
 */
const BOIDS_RULES = {
    COHESION_FACTOR: 500,
    SEPARATION_DISTANCE: 5,
    ALIGNMENT_FACTOR: 90
};

/**
 * Default runtime settings used for new boids.
 * @type {{MAX_SPEED:number, MIN_SPEED:number, RANGE:number, FOV_ANGLE:number}}
 */
const DEFAULT_SETTINGS = {
    MAX_SPEED: 3.0,
    MIN_SPEED: 1.0,
    RANGE: 150,
    FOV_ANGLE: 250 * DEGREES_TO_RADIANS,
};

/**
 * Default variation settings for dynamic per-rule strength modulation.
 * FREQUENCY is in cycles per second. AMPLITUDE in [0..1].
 * @type {{FREQUENCY:number, AMPLITUDE:number}}
 */
const VARIATION = {
    FREQUENCY: 0.6,
    AMPLITUDE: 1.0
};

// Boid object
/**
 * Boid
 * Represents a single boid with position, velocity, DOM elements and rule helpers.
 * This class is intentionally optimized to reuse temporary vectors to reduce
 * garbage collection during animation.
 */
class Boid {
    static _tempVector = new Vector2D(0, 0);
    static _tempVector2 = new Vector2D(0, 0);
    static _tempVector3 = new Vector2D(0, 0);
    static ghostTrailEnabled = false;
    // Toggle for enabling/disabling per-rule variation waves
    static variationEnabled = true;
    // Live-tunable variation parameters (can be changed at runtime)
    static variationFrequency = VARIATION.FREQUENCY;
    static variationAmplitude = VARIATION.AMPLITUDE;

    /**
     * Create a new Boid instance.
     * @param {{id:number, isHighlighted:boolean}} options
     */
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

        // Per-boid variation phase offsets to desynchronize waves
        this._variationPhase = Math.random() * Math.PI * 2;
        this._creationTime = performance.now() / 1000; // seconds

        // DOM elements
        this.initializeDOMElements(isHighlighted);
    }

    /**
     * Initialize a starting velocity for the boid.
     * Boids are biased to face right (positive X) with small random variation.
     * @returns {Vector2D}
     * @private
     */
    _initializeVelocity() {
        // Start all boids facing right (positive x direction) for consistent FOV behavior
        // Add a small random component to prevent all boids from moving in perfect lockstep
        const baseSpeed = this.maxSpeed * 0.8; // Use 80% of max speed as base
        const randomVariation = this.maxSpeed * 0.4; // Allow 40% variation

        const velocity = new Vector2D(
            baseSpeed + (Math.random() - 0.5) * randomVariation, // Mostly rightward with some variation
            (Math.random() - 0.5) * randomVariation * 0.5 // Small vertical component
        );

        return velocity;
    }

    /**
     * Create and attach DOM elements used to render this boid and optional visual helpers.
     * @param {boolean} isHighlighted - When true, additional steer/FOV visuals are created.
     */
    initializeDOMElements(isHighlighted) {
        this._createBoidElement();

        if (isHighlighted) {
            this._createSteerElements();
            // Always create FOV elements for highlighted boids so they can be toggled
            this._createFOVElements();
        }
    }

    /**
     * Create the main DOM element for this boid and attach it to the canvas.
     * Also creates the configured number of trail elements.
     * @private
     */
    _createBoidElement() {
        this.boidElement = document.createElement("div");
        this.boidElement.setAttribute("id", "boid" + this.id);
        this.boidElement.classList.add("boids");
        document.getElementById("canvas").appendChild(this.boidElement);

        // Create trail elements
        this._createTrailElements();
    }

    /**
     * Pre-create DOM elements used for the ghost trail effect.
     * Elements are appended to the canvas and initially hidden when the global
     * ghostTrail flag is false.
     * @private
     */
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
     * Set color for boid and its trail elements.
     * @param {string} color - CSS color used for the boid's left border and trail.
     */
    setColor(color) {
        this.boidElement.style.borderLeftColor = color;
        this.trailElements.forEach(trail => {
            trail.style.borderLeftColor = color;
        });
    }

    /**
     * Change the visible trail length for this boid.
     * This will add or remove trail DOM elements and trim stored positions.
     * @param {number} newLength - New desired trail length (clamped between 3 and 25).
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

    /**
     * Set the Field-Of-View (FOV) angle for this boid.
     * The provided angle is clamped to [0, 2π] and split equally between left/right.
     * @param {number} angleInRadians
     */
    setFOVAngle(angleInRadians) {
        // Clamp between 0 and 2π radians (0° to 360°)
        this.leftSideFOV = Math.max(0, Math.min(Math.PI * 2, angleInRadians)) / 2;
        this.rightSideFOV = this.leftSideFOV;

        // Debug: Log the FOV angle being set
        if (this.id === 0) { // Only log for the first boid to avoid spam
            console.log(`Boid ${this.id}: Setting FOV to ${(angleInRadians * 180 / Math.PI).toFixed(1)}° (${this.leftSideFOV.toFixed(3)} + ${this.rightSideFOV.toFixed(3)} rad)`);
        }

        // Update FOV visualization if it exists and is enabled
        if (this.FOVEnabled && this.BlindSpotElement) {
            const totalFOVAngle = this.leftSideFOV + this.rightSideFOV;
            this._setFOVSectorAttributes(this.BlindSpotElement, this.range, totalFOVAngle);
        }
    }

    /**
     * Create simple DOM elements used to visualize steering vectors.
     * Creates elements for 'separate', 'cohere', 'align' and 'repel'.
     * @private
     */
    _createSteerElements() {
        const steerTypes = ['separate', 'cohere', 'align', 'repel'];
        steerTypes.forEach(type => {
            const element = document.createElement("div");
            element.classList.add(`${type}-line`);
            document.getElementById("canvas").appendChild(element);
            this[`${type}SteerElement`] = element;
        });
    }

    /**
     * Per-frame update: compute neighbor set, apply boids rules (cohesion, separation,
     * alignment), optional boundary steering and per-rule variation modulation, then
     * update position according to resulting velocity.
     * @param {Set<Boid>} flock - Collection of all boids in the simulation
     * @param {number} deltaT - Time delta in seconds since last update
     */
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

        // Compute elapsed time in seconds for smooth variation
        const now = performance.now() / 1000;
        const t = now - this._creationTime;

        // Variation multipliers per-rule mapped to range [0,1]
        // Use different phase offsets per-rule to create richer, desynchronized motion
        const sepPhase = this._variationPhase + Math.PI * 0.4;
        const cohPhase = this._variationPhase + Math.PI * 1.2;
        const aliPhase = this._variationPhase + Math.PI * 2.0;

        // Waves normalized to 0..1 using live-tunable frequency
        const freq = Boid.variationFrequency || VARIATION.FREQUENCY;
        const amp = typeof Boid.variationAmplitude === 'number' ? Boid.variationAmplitude : VARIATION.AMPLITUDE;

        const sepWave = 0.5 * (Math.sin(2 * Math.PI * freq * t + sepPhase) + 1);
        const cohWave = 0.5 * (Math.cos(2 * Math.PI * freq * t + cohPhase) + 1);
        const aliWave = 0.5 * (Math.sin(2 * Math.PI * freq * t + aliPhase) + 1);

        // Mix with amplitude so amp=1 => full 0..1 range, amp=0 => constant 1
        const sepMultiplier = Boid.variationEnabled ? ((1 - amp) + amp * sepWave) : 1;
        const cohMultiplier = Boid.variationEnabled ? ((1 - amp) + amp * cohWave) : 1;
        const aliMultiplier = Boid.variationEnabled ? ((1 - amp) + amp * aliWave) : 1;

        // Apply multipliers to rule vectors before adding (scale to 0..1)
        v1.scale(cohMultiplier);
        v2.scale(sepMultiplier);
        v3.scale(aliMultiplier);

        // Apply all velocity changes
        this.velocity.add(v1);
        this.velocity.add(v2);
        this.velocity.add(v3);
        this.velocity.add(v4);
        // this.velocity.add(v5);

        // Update steer visualizations to match the applied (scaled) forces
        try {
            this._drawSteerVector(this.cohereSteerElement, v1, 300, this.showCohere);
            this._drawSteerVector(this.separateSteerElement, v2, 100, this.showSeparate);
            this._drawSteerVector(this.alignSteerElement, v3, 500, this.showAlign);
        } catch (e) {
            // Non-critical: ignore visualization errors
        }

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
     * Rule 2: Separation - Boids try to keep a small distance away from other objects.
     * The repulsion is scaled by proximity so closer neighbors cause stronger repulsion.
     * @param {Set<Boid>} flock
     * @returns {Vector2D}
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
    }
    /**
     * Rule 3: Alignment - Boids try to match velocity with nearby boids.
     * Returns a steering vector that is a fraction of the difference between
     * perceived average neighbor velocity and this boid's velocity.
     * @param {Set<Boid>} flock
     * @returns {Vector2D}
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
     * Limit this boid's velocity to the configured maximum and minimum speeds.
     * This mutates `this.velocity` in-place.
     * @private
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
     * Compute a smooth, distance-weighted steering force to keep the boid inside
     * the world bounds. The returned vector should be added to the boid's
     * velocity to gently steer it away from edges.
     * @returns {Vector2D}
     * @private
     */
    boundPosition() {
        // Smooth, distance-weighted steering away from boundaries to avoid hard bounces
        const v = new Vector2D(0, 0);
        const { CANVAS_WIDTH, CANVAS_HEIGHT } = WORLD;
        const margin = Math.min(100, Math.max(30, this.range / 2)); // dynamic margin

        // Maximum steering force applied when touching the wall (tunable)
        const maxForce = Math.max(0.5, this.maxSpeed * 0.25);

        // X axis
        const distLeft = this.position.x;
        if (distLeft < margin) {
            // f in [0..1], stronger when closer; use quadratic easing
            let f = 1 - (distLeft / margin);
            f = f * f;
            v.x += maxForce * f; // push right
        }

        const distRight = CANVAS_WIDTH - this.position.x;
        if (distRight < margin) {
            let f = 1 - (distRight / margin);
            f = f * f;
            v.x -= maxForce * f; // push left
        }

        // Y axis
        const distTop = this.position.y;
        if (distTop < margin) {
            let f = 1 - (distTop / margin);
            f = f * f;
            v.y += maxForce * f; // push down
        }

        const distBottom = CANVAS_HEIGHT - this.position.y;
        if (distBottom < margin) {
            let f = 1 - (distBottom / margin);
            f = f * f;
            v.y -= maxForce * f; // push up
        }

        return v;
    }

    /**
     * Optional tendency force to steer boids back towards the center of the world.
     * Returns a small steering vector when the boid is far from the center.
     * @returns {Vector2D}
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
     * Toggle FOV state and update visuals accordingly.
     */
    toggleFOV() {
        this.FOVEnabled = !this.FOVEnabled;
        this.updateFOVDisplay();
    }

    /**
     * Update FOV DOM visualization based on `this.FOVEnabled`.
     */
    updateFOVDisplay() {
        if (this.FOVEnabled) {
            if (!this.SVGElement) {
                this._createFOVElements();
            }
            if (this.BlindSpotElement) {
                // Update the sector to show current FOV angle and ensure proper rotation
                const totalFOVAngle = this.leftSideFOV + this.rightSideFOV;
                this._setFOVSectorAttributes(this.BlindSpotElement, this.range, totalFOVAngle);

                // Make it visible
                this.BlindSpotElement.setAttribute('fill-opacity', '0.2');
                this.BlindSpotElement.setAttribute('stroke-opacity', '0.4');
            }
        } else {
            if (this.BlindSpotElement) {
                this.BlindSpotElement.setAttribute('fill-opacity', '0');
                this.BlindSpotElement.setAttribute('stroke-opacity', '0');
            }
        }
    }

    /**
     * Create SVG elements used to visualize the boid's field of view.
     * @private
     */
    _createFOVElements() {
        // Calculate view percentage based on current FOV angle
        const totalFOVAngle = this.leftSideFOV + this.rightSideFOV;

        // Create SVG container
        this.SVGElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this._setSVGAttributes(this.SVGElement, this.range * 2);

        // Create FOV sector path instead of circle
        this.BlindSpotElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this._setFOVSectorAttributes(this.BlindSpotElement, this.range, totalFOVAngle);

        this.SVGElement.appendChild(this.BlindSpotElement);
        this.boidElement.appendChild(this.SVGElement);
    }

    /**
     * Helper to set common attributes for the FOV SVG container.
     * @param {SVGElement} svg
     * @param {number} size
     * @private
     */
    _setSVGAttributes(svg, size) {
        svg.setAttribute("height", size);
        svg.setAttribute("width", size);
        // Position the svg so that its center is at the boid element origin (0,0)
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        svg.style.position = 'absolute';
        svg.style.left = `${-size / 2}px`;
        svg.style.top = `${-size / 2}px`;
        svg.classList.add("FOV");
    }

    /**
     * (Legacy helper) Set attributes for a blind-spot style visualization.
     * This function computes a dash array to indicate visible versus hidden arcs.
     * @private
     */
    _setBlindSpotAttributes(circle, range, circumference, viewPercentage) {
        const radius = range / 2;

        // Calculate the dash array for the FOV visualization
        // For FOV visualization, show the blind spot (the area the boid can't see) as a dashed arc
        const visibleArc = viewPercentage * circumference / 100;
        const blindArc = circumference - visibleArc;

        const attributes = {
            "height": range * 2,
            "width": range * 2,
            "cx": range,
            "cy": range,
            "r": radius,
            "fill": "none",
            "stroke": "#ff6b6b", // Changed to a more visible red color
            "stroke-opacity": this.FOVEnabled ? "0.4" : "0", // Increased opacity
            "stroke-width": "3", // Made stroke thinner and more visible
            "stroke-dasharray": blindArc > 0 ? `${visibleArc} ${blindArc}` : "none"
        };

        Object.entries(attributes).forEach(([key, value]) => {
            circle.setAttribute(key, value);
        });

        circle.classList.add("blindspot");
    }

    /**
     * Create FOV sector path attributes - shows the visible area as a filled sector.
     * The resulting path is centered on the boid's local forward (right) and relies
     * on the boid element rotation to orient it.
     * @param {SVGPathElement} path
     * @param {number} range
     * @param {number} totalFOVAngle
     * @private
     */
    _setFOVSectorAttributes(path, range, totalFOVAngle) {
        const centerX = range;
        const centerY = range;
        const radius = range / 2;

        // Important: do NOT apply the boid's facing angle here.
        // The parent `boidElement` is rotated via CSS using the same
        // `this.velocity.angle()` value in `drawBoid()`.
        // If we also rotate the path by the facing angle we get a
        // double-rotation which makes the FOV face wander or flip
        // when boids collide. Instead compute the sector relative to
        // the boid's local forward (0 radians = to the right), and
        // let the containing element's CSS rotation orient it.

        const halfFOV = totalFOVAngle / 2;
        // Define sector centered on local 0 radians (rightward) so
        // the boidElement's rotation aligns the sector with the real
        // facing direction.
        const svgStartAngle = -halfFOV;
        const svgEndAngle = halfFOV;

        // Calculate start and end points on the circle
        const x1 = centerX + radius * Math.cos(svgStartAngle);
        const y1 = centerY + radius * Math.sin(svgStartAngle);
        const x2 = centerX + radius * Math.cos(svgEndAngle);
        const y2 = centerY + radius * Math.sin(svgEndAngle);

        // Determine if we need a large arc (for angles > 180°)
        const largeArcFlag = totalFOVAngle > Math.PI ? 1 : 0;

        let pathData;
        if (totalFOVAngle >= Math.PI * 2) {
            // Full circle - draw using two arcs starting at leftmost point so
            // the path is well-centered and doesn't rely on floating-point
            // offsets that can shift the bounding box.
            const startX = centerX - radius;
            const startY = centerY;
            // two arcs that complete the circle
            pathData = `M ${startX} ${startY} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 -${radius * 2} 0 Z`;
        } else if (totalFOVAngle > 0) {
            // Arc sector
            pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
        } else {
            // No FOV
            pathData = `M ${centerX} ${centerY}`;
        }

        const attributes = {
            "d": pathData,
            "fill": "#4ade80", // Green color for visible area
            "fill-opacity": this.FOVEnabled ? "0.2" : "0",
            "stroke": "#22c55e",
            "stroke-width": "2",
            "stroke-opacity": this.FOVEnabled ? "0.4" : "0"
        };

        Object.entries(attributes).forEach(([key, value]) => {
            path.setAttribute(key, value);
        });

        path.classList.add("fov-sector");
    }

    /**
     * Remove any created FOV DOM elements from the boid element.
     * @private
     */
    _removeFOVElements() {
        if (this.SVGElement) {
            this.SVGElement.remove();
            this.SVGElement = null;
            this.BlindSpotElement = null;
        }
    }

    /**
     * Draw a steer vector visualization using a DOM element.
     * When `shouldDraw` is false or the vector is zero the element will be hidden.
     * @param {HTMLElement} element
     * @param {Vector2D} vector
     * @param {number} scale
     * @param {boolean} shouldDraw
     * @private
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
     * Collect neighbors within this boid's range and populate cached distances.
     * Returns the set of neighbors that also pass this boid's FOV test.
     * @param {Set<Boid>} flock
     * @returns {Set<Boid>}
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

    /**
     * Test whether another boid is within this boid's configured field-of-view.
     * Uses the boid velocity as the forward direction.
     * @param {Boid} otherBoid
     * @returns {boolean}
     * @private
     */
    _isInFieldOfView(otherBoid) {
        // Calculate vector from this boid to other boid (reuse temp vector)
        Boid._tempVector.x = otherBoid.position.x - this.position.x;
        Boid._tempVector.y = otherBoid.position.y - this.position.y;

        const angleBetween = this.velocity.angleBetweenVectors(Boid._tempVector);
        return angleBetween > -this.leftSideFOV && angleBetween < this.rightSideFOV;
    }

    /**
     * Draw a short line element representing a vector originating from the boid.
     * The method clamps the vector to this.range and positions/rotates the element.
     * @param {HTMLElement} lineElement
     * @param {Vector2D} vector
     * @param {Object} [styles]
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
     * Main render method called each frame to draw the boid and optional visuals
     * such as ghost trails, FOV and neighbor lines.
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

        // Update FOV rotation to match boid's current facing direction
        if (this.FOVEnabled && this.BlindSpotElement) {
            const totalFOVAngle = this.leftSideFOV + this.rightSideFOV;
            this._setFOVSectorAttributes(this.BlindSpotElement, this.range, totalFOVAngle);
        }

        if (this.highlighted) {
            this.drawNeighbors();
        }
    }

    /**
     * Push the current boid transform into the trail history and clamp its length.
     * @private
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
     * Render the ghost trail by mapping stored trailPositions to DOM elements.
     * The first trail element should correspond to the boid's current transform.
     * @private
     */
    _drawTrail() {
        // Ensure the first trail element corresponds to the boid's current position
        for (let i = 0; i < this.trailElements.length; i++) {
            const trailElement = this.trailElements[i];
            const pos = this.trailPositions[i];

            if (!trailElement) continue;

            // If we don't have a saved position for this index, hide the element
            if (!pos) {
                try {
                    trailElement.style.opacity = '0';
                    trailElement.style.display = 'none';
                } catch (e) { /* ignore DOM errors */ }
                continue;
            }

            const opacity = (this.maxTrailLength - i) / this.maxTrailLength * 0.4;
            const scale = (this.maxTrailLength - i) / this.maxTrailLength * 0.8 + 0.2;

            try {
                trailElement.style.display = 'block';
                trailElement.style.opacity = opacity;
                trailElement.style.transform = `translate(${pos.x}px, ${pos.y}px) rotateZ(${pos.angle}rad) scale(${scale})`;
            } catch (e) {
                // defensive: ignore DOM write errors
            }
        }
    }

    /**
     * Apply the current position and facing rotation to the boid's DOM element.
     */
    drawBoid() {
        const rotationInRadians = this.velocity.angle();
        const transform = `translate(${this.position.x}px, ${this.position.y}px) rotateZ(${rotationInRadians}rad)`;
        this.boidElement.style.transform = transform;
    }

    /**
     * Log basic runtime info for this boid (position and velocity).
     */
    logBoidDetails() {
        console.log(`Boid ${this.id}: pos(${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}) vel(${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)})`);
    }

    /**
     * Draw lines to neighbor boids (used for debugging/visualization in highlighted boids).
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

    /**
     * Remove DOM lines that correspond to boids no longer within range.
     * @private
     */
    _cleanupOutOfRangeLines() {
        const currentNeighborIds = new Set([...this.neighbors].map(b => b.id));

        for (const boidId of Object.keys(this.neighborLineElements)) {
            if (!currentNeighborIds.has(parseInt(boidId))) {
                this.neighborLineElements[boidId]?.remove();
                delete this.neighborLineElements[boidId];
            }
        }
    }

    /**
     * Remove all neighbor line elements and clear the cache.
     * @private
     */
    _cleanupAllNeighborLines() {
        Object.values(this.neighborLineElements).forEach(element => element?.remove());
        this.neighborLineElements = {};
    }

    /**
     * Hide all currently existing neighbor line elements.
     * @private
     */
    _hideAllNeighborLines() {
        Object.values(this.neighborLineElements).forEach(element => {
            if (element) element.style.display = 'none';
        });
    }

    /**
     * Draw a line to another boid using the cached neighbor distance when available.
     * @param {Boid} otherBoid
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

    /**
     * Create and append a neighbor-line DOM element for the given boid.
     * @param {Boid} otherBoid
     * @returns {HTMLElement}
     * @private
     */
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