import { WORLD } from "./world.js"

// Boid object
class Boid {
    constructor(id) {
        this.id = id;
        // Model position
        this.positionX = (Math.random() * WORLD.CANVAS_WIDTH);
        this.positionY = (Math.random() * WORLD.CANVAS_HEIGHT);

        // Model velocity
        this.velocityX = Math.random() * (Math.random() < 0.5 ? -1 : 1);
        this.velocityY = Math.random() * (Math.random() < 0.5 ? -1 : 1);

        // Add the element to DOM
        this.boidElement = document.createElement("div");
        this.boidElement.setAttribute("id", "boid" + this.id);
        this.boidElement.classList.add("boids");
        document.getElementById("canvas").appendChild(this.boidElement);

        this.randomizeValues();
    }

    randomizeValues() {
        const angle = -Math.atan2(this.velocityY, this.velocityX);
        const transformValues = [];
        transformValues.push(`translate(${this.positionX}px, ${this.positionY}px)`);
        transformValues.push(`rotateZ(${angle}rad)`);
        this.boidElement.style.transform = transformValues.join(" ");
    }

    updateBoid(timestamp) {
        this.moveBoid();

        this.drawBoid();

        window.requestAnimationFrame(this.updateBoid.bind(this));
    }

    /**
     * Move the boid's position
    */
    moveBoid() {
        const { CANVAS_HEIGHT, CANVAS_WIDTH } = WORLD;
        const deltaT = 5;
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

    /**
     * Display boid into the DOM
     */
    drawBoid() {
        let ztransform = -Math.atan2(this.velocityY, this.velocityX);
        this.boidElement.style.transform = `translate(${this.positionX}px, ${this.positionY}px) rotateZ(${ztransform}rad)`;
    }

    logBoidDetails() {
        console.log("boid id: " + this.id);
        console.log("position x: " + this.positionX);
        console.log("position y: " + this.positionY);
        console.log("velocity x: " + this.velocityX);
        console.log("velocity y: " + this.velocityY);
    }
}

export { Boid };
