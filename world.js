/**
 * All boids are contained inside this world.
 * Canvas dimensions are now relative to screen size for better responsiveness
 */
const WORLD = {
  CANVAS_WIDTH: Math.min(window.innerWidth * 0.95), // 95% of screen width, max 2500px
  CANVAS_HEIGHT: Math.min(window.innerHeight * 0.55), // 55% of screen height, max 700px
  NUM_BOIDS: 100,
  TIME_SCALE: 0.10,
};// List containing all boids in the world
var flock = [];
window.flock = flock;

/**
 * Add boid to the flock
*/
function appendFlock(boid) {
  flock.push(boid);
}

export { WORLD, appendFlock, flock };
