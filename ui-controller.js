import { flock } from "./world.js";
import { Vector2D } from "./vector.js";

class UIController {
    constructor() {
        this.isPaused = false;
        this.currentAlgorithm = 'overview';
        this.demoCanvas = null;
        this.demoCtx = null;
        this.demoBoids = [];

        this.initializeUI();
        this.initializeDemoCanvas();
        this.startFPSCounter();
    }

    initializeUI() {
        this.setupMainTabs();
        this.setupPanelToggles();
        this.setupParameterControls();
        this.setupSimulationControls();
        this.setupAlgorithmTabs();

        // Setup visualization controls now (idempotent) and also sync state when boids are ready
        this.setupVisualizationControls();
        window.addEventListener('boids-ready', () => {
            this.syncVisualizationState();
        });
    }

    syncVisualizationState() {
        // Sync the checkbox UI to the first boid state without reattaching listeners
        const first = flock[0];
        if (!first) return;

        const mappings = [
            ['fov-switch', 'FOVEnabled'],
            ['neighbor-switch', 'showNeighbors'],
            ['separate-switch', 'showSeparate'],
            ['cohere-switch', 'showCohere'],
            ['align-switch', 'showAlign']
        ];

        mappings.forEach(([id, prop]) => {
            const el = document.getElementById(id);
            if (el) el.checked = !!first[prop];
        });

        // Ensure FOV visual matches
        if (first.updateFOVDisplay) {
            first.updateFOVDisplay();
        }
    }

    setupMainTabs() {
        const mainTabs = document.querySelectorAll('.main-tab');
        const tabPanels = document.querySelectorAll('.tab-panel');

        mainTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');

                // Remove active class from all tabs and panels
                mainTabs.forEach(t => t.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));

                // Add active class to clicked tab and corresponding panel
                tab.classList.add('active');
                document.getElementById(`${targetTab}-tab`).classList.add('active');
            });
        });
    }

    setupPanelToggles() {
        // No longer needed with tab-based layout
    }

    setupVisualizationControls() {
        // Field of View Toggle
        const fovSwitch = document.getElementById('fov-switch');
        if (fovSwitch) {
            // Sync initial state with boid
            if (flock[0]) {
                fovSwitch.checked = flock[0].FOVEnabled;
            }

            fovSwitch.addEventListener('change', (e) => {
                if (flock[0]) {
                    flock[0].FOVEnabled = e.target.checked;
                    flock[0].updateFOVDisplay();
                }
            });
        }

        // Neighbor Lines Toggle
        const neighborSwitch = document.getElementById('neighbor-switch');
        if (neighborSwitch) {
            // Sync initial state with boid
            if (flock[0]) {
                neighborSwitch.checked = flock[0].showNeighbors;
            }

            neighborSwitch.addEventListener('change', (e) => {
                if (flock[0]) {
                    flock[0].showNeighbors = e.target.checked;
                }
            });
        }

        // Separation Toggle
        const separateSwitch = document.getElementById('separate-switch');
        if (separateSwitch) {
            // Sync initial state with boid
            if (flock[0]) {
                separateSwitch.checked = flock[0].showSeparate;
            }

            separateSwitch.addEventListener('change', (e) => {
                if (flock[0]) {
                    flock[0].showSeparate = e.target.checked;
                    // Hide or show the steer element immediately to clean up visuals
                    if (!e.target.checked && flock[0].separateSteerElement) {
                        flock[0].separateSteerElement.style.display = 'none';
                        flock[0].separateSteerElement.style.height = '0px';
                    } else if (e.target.checked && flock[0].separateSteerElement) {
                        flock[0].separateSteerElement.style.display = 'block';
                    }
                }
            });
        }

        // Cohesion Toggle
        const cohereSwitch = document.getElementById('cohere-switch');
        if (cohereSwitch) {
            // Sync initial state with boid
            if (flock[0]) {
                cohereSwitch.checked = flock[0].showCohere;
            }

            cohereSwitch.addEventListener('change', (e) => {
                if (flock[0]) {
                    flock[0].showCohere = e.target.checked;
                    if (!e.target.checked && flock[0].cohereSteerElement) {
                        flock[0].cohereSteerElement.style.display = 'none';
                        flock[0].cohereSteerElement.style.height = '0px';
                    } else if (e.target.checked && flock[0].cohereSteerElement) {
                        flock[0].cohereSteerElement.style.display = 'block';
                    }
                }
            });
        }

        // Alignment Toggle
        const alignSwitch = document.getElementById('align-switch');
        if (alignSwitch) {
            // Sync initial state with boid
            if (flock[0]) {
                alignSwitch.checked = flock[0].showAlign;
            }

            alignSwitch.addEventListener('change', (e) => {
                if (flock[0]) {
                    flock[0].showAlign = e.target.checked;
                    if (!e.target.checked && flock[0].alignSteerElement) {
                        flock[0].alignSteerElement.style.display = 'none';
                        flock[0].alignSteerElement.style.height = '0px';
                    } else if (e.target.checked && flock[0].alignSteerElement) {
                        flock[0].alignSteerElement.style.display = 'block';
                    }
                }
            });
        }

        // Make the visual slider spans toggle the hidden checkbox inputs
        const sliders = document.querySelectorAll('.toggle-slider');
        sliders.forEach(slider => {
            slider.addEventListener('click', (ev) => {
                // Find the associated input within the same .toggle-item container
                const container = slider.closest('.toggle-item');
                const input = container ? container.querySelector('input.toggle-switch') : null;
                if (!input) {
                    console.warn('No associated toggle input found for slider', slider);
                    return;
                }

                // Toggle and dispatch change
                input.checked = !input.checked;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                // Prevent the container click handler from also toggling
                ev.stopPropagation();
                console.debug('Toggled input', input.id, 'new state', input.checked);
            });
        });

        // Also make the entire .toggle-item clickable as a fallback
        const toggleItems = document.querySelectorAll('.toggle-item');
        toggleItems.forEach(item => {
            item.addEventListener('click', (ev) => {
                // Avoid toggling when clicking on links, buttons, inputs or labels inside
                const targetTag = ev.target.tagName.toLowerCase();
                if (['input', 'button', 'a', 'label'].includes(targetTag)) return;

                const input = item.querySelector('input.toggle-switch');
                if (!input) return;

                input.checked = !input.checked;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                console.debug('Container toggled input', input.id, 'new state', input.checked);
            });
        });
    }

    initializeParameterValues() {
        // Set default display values to match the HTML defaults
        const separationValue = document.getElementById('separation-value');
        const cohereValue = document.getElementById('cohere-value');
        const alignValue = document.getElementById('align-value');

        if (separationValue) separationValue.textContent = '100%';
        if (cohereValue) cohereValue.textContent = '100%';
        if (alignValue) alignValue.textContent = '100%';
    }

    setupParameterControls() {
        // Initialize default values
        this.initializeParameterValues();

        // Field of View Range
        const fovRange = document.getElementById('fov-range');
        const fovValue = document.getElementById('fov-value');

        fovRange?.addEventListener('input', (e) => {
            const value = e.target.value;
            fovValue.textContent = value;

            flock.forEach(boid => {
                boid.range = parseInt(value);
            });

            this.updateFOVDisplay();
        });

        // Separation Range
        const separationRange = document.getElementById('separation-range');
        const separationValue = document.getElementById('separation-value');

        separationRange?.addEventListener('input', (e) => {
            const value = e.target.value;
            separationValue.textContent = value + '%';

            // Scale from 0-200 slider to 0-2.0 coefficient range (100% = 1.0)
            const coefficient = parseFloat(value) / 100;
            flock.forEach(boid => {
                boid.separationCoefficient = coefficient;
            });
        });

        // Cohesion Range
        const cohereRange = document.getElementById('cohere-range');
        const cohereValue = document.getElementById('cohere-value');

        cohereRange?.addEventListener('input', (e) => {
            const value = e.target.value;
            cohereValue.textContent = value + '%';

            // Scale from 0-200 slider to 0-2.0 coefficient range (100% = 1.0)
            const coefficient = parseFloat(value) / 100;
            flock.forEach(boid => {
                boid.cohereCoefficient = coefficient;
            });
        });

        // Alignment Range
        const alignRange = document.getElementById('align-range');
        const alignValue = document.getElementById('align-value');

        alignRange?.addEventListener('input', (e) => {
            const value = e.target.value;
            alignValue.textContent = value + '%';

            // Scale from 0-200 slider to 0-2.0 coefficient range (100% = 1.0)
            const coefficient = parseFloat(value) / 100;
            flock.forEach(boid => {
                boid.alignCoefficient = coefficient;
            });
        });

        // Speed Range
        const speedRange = document.getElementById('speed-range');
        const speedValue = document.getElementById('speed-value');

        speedRange?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            speedValue.textContent = value;

            flock.forEach(boid => {
                boid.maxSpeed = value;
            });
        });
    }

    updateFOVDisplay() {
        if (flock[0] && flock[0].SVGElement && flock[0].BlindSpotElement) {
            const range = flock[0].range;
            const circumference = Math.PI * range;
            const viewPercentage = ((2 * flock[0].leftSideFOV / (Math.PI / 180)) / 360) * 100;

            flock[0].SVGElement.setAttribute('height', range * 2);
            flock[0].SVGElement.setAttribute('width', range * 2);
            flock[0].BlindSpotElement.setAttribute('height', range * 2);
            flock[0].BlindSpotElement.setAttribute('width', range * 2);
            flock[0].BlindSpotElement.setAttribute('cx', range);
            flock[0].BlindSpotElement.setAttribute('cy', range);
            flock[0].BlindSpotElement.setAttribute('r', range / 2);
            flock[0].BlindSpotElement.setAttribute('stroke-width', range);
            flock[0].BlindSpotElement.setAttribute('stroke-dasharray',
                `${viewPercentage * circumference / 100} ${circumference}`);
        }
    }

    setupSimulationControls() {
        const resetBtn = document.getElementById('reset-btn');
        const pauseBtn = document.getElementById('pause-btn');

        resetBtn?.addEventListener('click', () => {
            this.resetSimulation();
        });

        pauseBtn?.addEventListener('click', () => {
            this.togglePause();
        });
    }

    setupAlgorithmTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const algorithm = e.target.dataset.algorithm;
                this.switchAlgorithm(algorithm);
            });
        });
    }

    switchAlgorithm(algorithm) {
        this.currentAlgorithm = algorithm;

        // Update tab appearance
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-algorithm="${algorithm}"]`)?.classList.add('active');

        // Update algorithm info
        this.updateAlgorithmInfo(algorithm);
        this.updateDemoCanvas(algorithm);
    }

    updateAlgorithmInfo(algorithm) {
        const infoElement = document.getElementById('algorithm-info');
        if (!infoElement) return;

        const algorithmData = {
            overview: {
                title: 'Flocking Behavior',
                description: 'Boids follow three simple rules that create emergent flocking behavior:',
                items: [
                    '<strong>Separation:</strong> Avoid crowding neighbors',
                    '<strong>Cohesion:</strong> Steer towards the center of neighbors',
                    '<strong>Alignment:</strong> Steer towards the average heading of neighbors'
                ]
            },
            separation: {
                title: 'Separation Algorithm',
                description: 'Each boid steers away from nearby neighbors to avoid collisions:',
                items: [
                    '<strong>Calculate:</strong> Distance to each neighbor',
                    '<strong>Weight:</strong> Closer neighbors have stronger repulsion',
                    '<strong>Direction:</strong> Point away from neighbor positions',
                    '<strong>Result:</strong> Smooth spacing between boids'
                ]
            },
            cohesion: {
                title: 'Cohesion Algorithm',
                description: 'Boids are attracted to the center of mass of their neighbors:',
                items: [
                    '<strong>Calculate:</strong> Average position of neighbors',
                    '<strong>Direction:</strong> Vector from boid to center of mass',
                    '<strong>Strength:</strong> Proportional to distance from center',
                    '<strong>Result:</strong> Boids naturally group together'
                ]
            },
            alignment: {
                title: 'Alignment Algorithm',
                description: 'Boids try to match the average velocity of their neighbors:',
                items: [
                    '<strong>Calculate:</strong> Average velocity of neighbors',
                    '<strong>Adjust:</strong> Gradually turn towards average direction',
                    '<strong>Speed:</strong> Match the group\'s movement speed',
                    '<strong>Result:</strong> Coordinated group movement'
                ]
            }
        };

        const data = algorithmData[algorithm];
        if (data) {
            infoElement.innerHTML = `
                <h3>${data.title}</h3>
                <p>${data.description}</p>
                <ul>
                    ${data.items.map(item => `<li>${item}</li>`).join('')}
                </ul>
            `;
        }
    }

    initializeDemoCanvas() {
        this.demoCanvas = document.getElementById('demo-canvas');
        if (this.demoCanvas) {
            this.demoCtx = this.demoCanvas.getContext('2d');
            this.createDemoBoids();
            this.startDemoAnimation();
        }
    }

    createDemoBoids() {
        // Create a few demo boids for the showcase with new dimensions
        this.demoBoids = [];
        for (let i = 0; i < 6; i++) {
            this.demoBoids.push({
                x: Math.random() * 480 + 35, // Spread across 550px width with margins
                y: Math.random() * 280 + 35, // Spread across 350px height with margins
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                neighbors: []
            });
        }
    }

    updateDemoCanvas(algorithm) {
        if (!this.demoCtx) return;

        // Clear canvas with new larger dimensions
        this.demoCtx.fillStyle = '#000';
        this.demoCtx.fillRect(0, 0, 550, 350);

        // Draw based on selected algorithm
        this.drawDemoBoids(algorithm);
    }

    drawDemoBoids(algorithm) {
        this.demoCtx.save();

        // Update demo boid positions
        this.demoBoids.forEach(boid => {
            boid.x += boid.vx * 0.5;
            boid.y += boid.vy * 0.5;

            // Wrap around edges with new dimensions
            if (boid.x < 0) boid.x = 520;
            if (boid.x > 520) boid.x = 0;
            if (boid.y < 0) boid.y = 320;
            if (boid.y > 320) boid.y = 0;
        });

        // Draw connections and forces based on algorithm
        if (algorithm === 'separation') {
            this.drawSeparationDemo();
        } else if (algorithm === 'cohesion') {
            this.drawCohesionDemo();
        } else if (algorithm === 'alignment') {
            this.drawAlignmentDemo();
        }

        // Draw boids
        this.demoBoids.forEach((boid, index) => {
            this.drawDemoBoid(boid, index === 0);
        });

        this.demoCtx.restore();
    }

    drawDemoBoid(boid, isMain = false) {
        this.demoCtx.save();
        this.demoCtx.translate(boid.x, boid.y);
        this.demoCtx.rotate(Math.atan2(boid.vy, boid.vx));

        // Draw boid triangle
        this.demoCtx.fillStyle = isMain ? '#ffffff' : '#64748b';
        this.demoCtx.beginPath();
        this.demoCtx.moveTo(8, 0);
        this.demoCtx.lineTo(-4, -3);
        this.demoCtx.lineTo(-4, 3);
        this.demoCtx.closePath();
        this.demoCtx.fill();

        this.demoCtx.restore();
    }

    drawSeparationDemo() {
        const mainBoid = this.demoBoids[0];
        this.demoCtx.strokeStyle = '#10b981';
        this.demoCtx.lineWidth = 2;

        this.demoBoids.slice(1).forEach(boid => {
            const dx = boid.x - mainBoid.x;
            const dy = boid.y - mainBoid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 60) {
                // Draw repulsion line
                this.demoCtx.beginPath();
                this.demoCtx.moveTo(mainBoid.x, mainBoid.y);
                this.demoCtx.lineTo(mainBoid.x - dx * 0.5, mainBoid.y - dy * 0.5);
                this.demoCtx.stroke();

                // Draw circle around neighbor
                this.demoCtx.strokeStyle = '#ef4444';
                this.demoCtx.beginPath();
                this.demoCtx.arc(boid.x, boid.y, 20, 0, Math.PI * 2);
                this.demoCtx.stroke();
                this.demoCtx.strokeStyle = '#10b981';
            }
        });
    }

    drawCohesionDemo() {
        const mainBoid = this.demoBoids[0];
        let centerX = 0, centerY = 0, count = 0;

        // Calculate center of mass
        this.demoBoids.slice(1).forEach(boid => {
            const dx = boid.x - mainBoid.x;
            const dy = boid.y - mainBoid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 80) {
                centerX += boid.x;
                centerY += boid.y;
                count++;

                // Draw neighbor connection
                this.demoCtx.strokeStyle = '#3b82f6';
                this.demoCtx.lineWidth = 1;
                this.demoCtx.beginPath();
                this.demoCtx.moveTo(mainBoid.x, mainBoid.y);
                this.demoCtx.lineTo(boid.x, boid.y);
                this.demoCtx.stroke();
            }
        });

        if (count > 0) {
            centerX /= count;
            centerY /= count;

            // Draw center of mass
            this.demoCtx.fillStyle = '#3b82f6';
            this.demoCtx.beginPath();
            this.demoCtx.arc(centerX, centerY, 5, 0, Math.PI * 2);
            this.demoCtx.fill();

            // Draw attraction line
            this.demoCtx.strokeStyle = '#3b82f6';
            this.demoCtx.lineWidth = 3;
            this.demoCtx.beginPath();
            this.demoCtx.moveTo(mainBoid.x, mainBoid.y);
            this.demoCtx.lineTo(centerX, centerY);
            this.demoCtx.stroke();
        }
    }

    drawAlignmentDemo() {
        const mainBoid = this.demoBoids[0];
        let avgVx = 0, avgVy = 0, count = 0;

        this.demoBoids.slice(1).forEach(boid => {
            const dx = boid.x - mainBoid.x;
            const dy = boid.y - mainBoid.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 80) {
                avgVx += boid.vx;
                avgVy += boid.vy;
                count++;

                // Draw velocity vector for neighbor
                this.demoCtx.strokeStyle = '#f59e0b';
                this.demoCtx.lineWidth = 2;
                this.demoCtx.beginPath();
                this.demoCtx.moveTo(boid.x, boid.y);
                this.demoCtx.lineTo(boid.x + boid.vx * 20, boid.y + boid.vy * 20);
                this.demoCtx.stroke();
            }
        });

        if (count > 0) {
            avgVx /= count;
            avgVy /= count;

            // Draw average velocity vector
            this.demoCtx.strokeStyle = '#f59e0b';
            this.demoCtx.lineWidth = 4;
            this.demoCtx.beginPath();
            this.demoCtx.moveTo(mainBoid.x, mainBoid.y);
            this.demoCtx.lineTo(mainBoid.x + avgVx * 30, mainBoid.y + avgVy * 30);
            this.demoCtx.stroke();
        }
    }

    startDemoAnimation() {
        const animate = () => {
            this.updateDemoCanvas(this.currentAlgorithm);
            requestAnimationFrame(animate);
        };
        animate();
    }

    resetSimulation() {
        // Reset all boids to random positions and velocities
        flock.forEach(boid => {
            boid.position.x = Math.random() * 800;
            boid.position.y = Math.random() * 600;
            boid.velocity.x = (Math.random() - 0.5) * 6;
            boid.velocity.y = (Math.random() - 0.5) * 6;
            boid.neighbors.clear();
            boid.neighborDistances.clear();
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pause-btn');
        const icon = pauseBtn?.querySelector('i');

        if (this.isPaused) {
            pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            // Pause logic would be handled in the main game loop
        } else {
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        }

        // Dispatch custom event for main app to handle
        window.dispatchEvent(new CustomEvent('simulation-pause-toggle', {
            detail: { isPaused: this.isPaused }
        }));
    }

    startFPSCounter() {
        let frames = 0;
        let lastTime = performance.now();

        const updateFPS = () => {
            frames++;
            const currentTime = performance.now();

            if (currentTime - lastTime >= 1000) {
                const fps = Math.round(frames * 1000 / (currentTime - lastTime));
                const fpsElement = document.getElementById('fps-counter');
                if (fpsElement) {
                    fpsElement.textContent = fps;
                }
                frames = 0;
                lastTime = currentTime;
            }

            requestAnimationFrame(updateFPS);
        };

        updateFPS();
    }

    updateBoidCount(count) {
        const countElement = document.getElementById('boid-count');
        if (countElement) {
            countElement.textContent = count;
        }
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UIController();
});

export { UIController };
