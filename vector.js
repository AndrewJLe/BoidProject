/**
 * Simple 2D vector utility used by the boids simulation.
 * The implementation is intentionally minimal to keep the hot path fast.
 */
class Vector2D {
    /**
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Add another vector to this vector (in-place).
     * @param {Vector2D} vector2
     * @returns {void}
     */
    add(vector2) {
        this.x += vector2.x;
        this.y += vector2.y;
    }

    /**
     * Subtract another vector from this vector (in-place).
     * @param {Vector2D} vector2
     * @returns {void}
     */
    subtract(vector2) {
        this.x -= vector2.x;
        this.y -= vector2.y;
    }

    /**
     * Compute the magnitude (length) of this vector.
     * @returns {number}
     */
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Return a new normalized vector (unit length) with the same direction.
     * Note: does not mutate the original vector.
     * @returns {Vector2D}
     */
    normalize() {
        const coeff = 1 / this.magnitude();
        return new Vector2D(this.x * coeff, this.y * coeff);
    }

    /**
     * Scale this vector in-place by a scalar factor.
     * @param {number} scalingFactor
     * @returns {Vector2D}
     */
    scale(scalingFactor) {
        this.x *= scalingFactor;
        this.y *= scalingFactor;

        return this;
    }

    /**
     * Angle (radians) of this vector relative to the positive X axis.
     * @returns {number}
     */
    angle() {
        return Math.atan2(this.y, this.x);
    }

    /**
     * Angle between this vector and another vector in radians, normalized to (-π, π].
     * @param {Vector2D} vector2
     * @returns {number}
     */
    angleBetweenVectors(vector2) {
        var angle = vector2.angle() - this.angle();
        if (angle > Math.PI) {
            angle -= 2 * Math.PI;
        }
        else if (angle <= -Math.PI) {
            angle += 2 * Math.PI;
        }
        return angle;
    }
}

export { Vector2D };