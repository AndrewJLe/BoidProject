/**
 * Finds the distance between two points
 * 
 * @param {number} x1 The x coordinate of first point
 * @param {number} y1 The y coordinate of first point
 * @param {number} x2 The x coordinate of second point
 * @param {number} y2 The y coordinate of second point
 * 
 * @returns {number} The distance between the two points
 */
function distance2D(x1, y1, x2, y2) {
    const deltaX = x2 - x1;
    const deltaY = y2 - y1;
    return Math.sqrt(
        Math.pow(deltaX, 2)
        + Math.pow(deltaY, 2)
    );
}

export { distance2D };
