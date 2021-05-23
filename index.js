import { Boid, createBoid } from './boid.js';

// Initialize boid
let boid0 = new Boid(0);
createBoid(boid0);

// Boid information for debugging
// console.log("Client width: " + document.documentElement.clientWidth);
// console.log("Client height: " + document.documentElement.clientHeight);
// console.log("boid id: " + boid0.id);
// console.log("position x: " + boid0.positionX);
// console.log("position y: " + boid0.positionY);
// console.log("velocity x: " + boid0.velocityX);
// console.log("velocity y: " + boid0.velocityY);

// Angle, speed, acceleration
// let angle = -Math.atan2(boid0.velocityY, boid0.velocityX);
let speed = 1;
let acceleration = 1;

// border
let ww = document.documentElement.clientWidth - 100;
let hh = document.documentElement.clientHeight - 100;

// Testing boid movement
function moveBoid(boid) {
    let angle = -Math.atan2(boid.velocityY, boid.velocityX);
    speed += acceleration;
    var currentBoid = document.querySelector(`#boid${boid.id}`);
    let xtransform = boid.positionX + (speed * Math.cos(angle));
    let ytransform = boid.positionY + (speed * Math.sin(angle));
    let ztransform = -Math.atan2(boid.velocityY, boid.velocityX);
    currentBoid.style.transform = `translate(${xtransform}px, ${ytransform}px) rotateZ(${ztransform}rad)`;
    if ((xtransform > 0 && xtransform < ww) && (ytransform > 0 && ytransform < hh)) {
        window.requestAnimationFrame(moveBoid.bind(window, boid));
        // console.log("position x: " + xtransform + "  position y: " + ytransform);
    }
}

let boid1 = new Boid(1);
let boid2 = new Boid(2);
let boid3 = new Boid(3);
let boid4 = new Boid(4);
let boid5 = new Boid(5);
let boid6 = new Boid(6);
let boid7 = new Boid(7);
let boid8 = new Boid(8);
let boid9 = new Boid(9);
createBoid(boid1);
createBoid(boid2);
createBoid(boid3);
createBoid(boid4);
createBoid(boid5);
createBoid(boid6);
createBoid(boid7);
createBoid(boid8);
createBoid(boid9);
window.requestAnimationFrame(moveBoid.bind(window, boid0));
window.requestAnimationFrame(moveBoid.bind(window, boid1));
window.requestAnimationFrame(moveBoid.bind(window, boid2));
window.requestAnimationFrame(moveBoid.bind(window, boid3));
window.requestAnimationFrame(moveBoid.bind(window, boid4));
window.requestAnimationFrame(moveBoid.bind(window, boid5));
window.requestAnimationFrame(moveBoid.bind(window, boid6));
window.requestAnimationFrame(moveBoid.bind(window, boid7));
window.requestAnimationFrame(moveBoid.bind(window, boid8));
window.requestAnimationFrame(moveBoid.bind(window, boid9));