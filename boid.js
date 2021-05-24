import { WORLD } from "./world.js"

// Boid object
class Boid {
    constructor({ id, isHighlighted }) {
        this.id = id;
        this.FOVEnabled;


        // Model position
        this.positionX = (Math.random() * WORLD.CANVAS_WIDTH);
        this.positionY = (Math.random() * WORLD.CANVAS_HEIGHT);

        // Model velocity
        this.velocityX = Math.random() * (Math.random() < 0.5 ? -1 : 1);
        this.velocityY = Math.random() * (Math.random() < 0.5 ? -1 : 1);

        // Model field of vision
        this.range = 250;

        // Add the element to DOM
        this.boidElement = document.createElement("div");
        this.boidElement.setAttribute("id", "boid" + this.id);
        this.boidElement.classList.add("boids");
        document.getElementById("canvas").appendChild(this.boidElement);

        this.randomizeValues();

        // Determines whether to draw FOV or other details
        if (isHighlighted) {
            this.toggleFOV();
        }
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

    toggleFOV() {
        if (!this.FOVEnabled) {
            this.FOVElement = document.createElement("div");
            this.FOVElement.classList.add("FOV");
            this.FOVElement.style.width = `${this.range}px`;
            this.FOVElement.style.height = `${this.range}px`;
            this.boidElement.appendChild(this.FOVElement);
        } else {
            this.FOVElement.remove();
        }

        this.FOVEnabled = !this.FOVEnabled
    }

    /**
     * Display boid into the DOM
     */
    drawBoid() {
        let ztransform = -Math.atan2(this.velocityY, this.velocityX);
        this.boidElement.style.transform = `translate(${this.positionX}px, ${this.positionY}px) rotateZ(${ztransform}rad)`;

        if (this.highlighted) {
            this.drawFOV();
        }
    }

    logBoidDetails() {
        console.log("boid id: " + this.id);
        console.log("position x: " + this.positionX);
        console.log("position y: " + this.positionY);
        console.log("velocity x: " + this.velocityX);
        console.log("velocity y: " + this.velocityY);
    }

    /**
     * Draws FOV circle
     */
    drawFOV() {
        if (!this.FOVEnabled || !this.FOVElement) return;

        this.FOVElement.style.transform = `translate(${this.positionX}px, ${this.positionY}px)`;
    }
}

export { Boid };
