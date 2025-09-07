/**
 * Compute Euclidean distance between two 2D points.
 * @param {[number, number]} vector1 - [x1, y1]
 * @param {[number, number]} vector2 - [x2, y2]
 * @returns {number}
 */
function distance2D([x1, y1], [x2, y2]) {
    const deltaX = x2 - x1;
    const deltaY = y2 - y1;
    return Math.sqrt(
        Math.pow(deltaX, 2)
        + Math.pow(deltaY, 2)
    );
}

/**
 * Return a random integer in [min, max).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Pick one of three colors at random.
 * @param {string} a
 * @param {string} b
 * @param {string} c
 * @returns {string}
 */
function pickOneTriadic(a, b, c) {
    var random = randomRange(1, 4);
    if (random == 1) {
        return a;
    }
    if (random == 2) {
        return b;
    }
    if (random == 3) {
        return c;
    }
}

/**
 * Pick one of four colors at random.
 * @param {string} a
 * @param {string} b
 * @param {string} c
 * @param {string} d
 * @returns {string}
 */
function pickOneTetradic(a, b, c, d) {
    var random = randomRange(1, 5);
    if (random == 1) {
        return a;
    }
    if (random == 2) {
        return b;
    }
    if (random == 3) {
        return c;
    }
    if (random == 4) {
        return d;
    }
}


export { distance2D, randomRange, pickOneTriadic, pickOneTetradic };