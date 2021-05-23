// Boid object
function Boid(id) {
    this.id = id;
    // Model position
    this.positionX = (Math.random() * 250) + 350;
    this.positionY = (Math.random() * 250) + 350;
    // Model velocity
    this.velocityX = Math.random() * (Math.random() < 0.5 ? -1 : 1);
    this.velocityY = Math.random() * (Math.random() < 0.5 ? -1 : 1);
}

// Create a boid div object and randomizes its position on the screen
function createBoid(boid) {
    // Create div object using boid object.
    const newBoid = document.createElement("div");
    newBoid.setAttribute("id", "boid" + boid.id);
    newBoid.style.width = 0;
    newBoid.style.height = 0;
    newBoid.style.borderTop = "10px solid transparent";
    newBoid.style.borderBottom = "10px solid transparent";
    newBoid.style.borderLeft = "35px solid rgb(62, 152, 255)";
    document.body.appendChild(newBoid);
    // Randomize the position of the boid on the screen.
    const angle = -Math.atan2(boid.velocityY, boid.velocityX);
    const transformValues = [];
    transformValues.push(`translate(${boid.positionX}px, ${boid.positionY}px)`);
    transformValues.push(`rotateZ(${angle}rad)`);
    newBoid.style.transform = transformValues.join(" ");
}
export { Boid, createBoid };