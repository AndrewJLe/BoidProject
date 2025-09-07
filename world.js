/**
 * World configuration values used by the simulation. Values are derived from
 * the current window dimensions to allow reasonable defaults across screen sizes.
 * @type {{CANVAS_WIDTH:number, CANVAS_HEIGHT:number, NUM_BOIDS:number, TIME_SCALE:number}}
 */
const WORLD = {
  CANVAS_WIDTH: Math.min(window.innerWidth * 0.95), // 95% of screen width
  CANVAS_HEIGHT: Math.min(window.innerHeight * 0.55), // 55% of screen height
  NUM_BOIDS: 100,
  TIME_SCALE: 0.10,
};

// List containing all boids in the world. Exported for simple access from other modules.
var flock = [];
window.flock = flock;

/**
 * Append a boid instance to the global flock array.
 * @param {Object} boid
 */
function appendFlock(boid) {
  flock.push(boid);
}

export { WORLD, appendFlock, flock };
